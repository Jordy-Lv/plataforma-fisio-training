/**
 * Verifica el tamizaje periódico del slice 4: quién puede registrarlo, que el
 * IMC lo calcula la base de datos, que el historial llega ordenado de lo más
 * reciente a lo más antiguo, y qué impide RLS cuando se salta la interfaz.
 *
 * Requiere Supabase local encendido con su semilla y `npm run dev` en marcha.
 * Todo lo que crea lleva una marca en las observaciones y se borra al terminar.
 *
 * Uso:  npm run test:screenings
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { decode, httpClient, sql, status } from "./helpers/auth-http.mjs";

/** Personas de `supabase/seed.sql`: Beto atiende a Diego, nadie atiende a Elena. */
const people = {
  admin: { email: "admin@demo.local" },
  professional: { email: "entrenador@demo.local" },
  patient: { email: "paciente@demo.local" },
};
const diego = "00000000-0000-4000-a000-000000000004";
const elena = "00000000-0000-4000-a000-000000000005";
const password = "demo1234";

/** Distingue las filas de esta ejecución de cualquier otra. */
const marca = `tamizaje-${crypto.randomUUID().slice(0, 8)}`;

const api = () =>
  createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function apiAs(role) {
  const client = api();
  const result = await client.auth.signInWithPassword({
    email: people[role].email,
    password,
  });
  assert.equal(result.error, null, `No inició sesión como ${role}`);
  return client;
}

async function screenAs(role) {
  const client = httpClient();
  const result = await client.submit("/login", {
    email: people[role].email,
    password,
  });
  const location = result.response.headers.get("location");
  assert.ok(location, `No inició sesión como ${role}`);
  return client;
}

/** Adónde manda una respuesta, sea por cabecera o por meta refresh. */
const destino = ({ response, html }) =>
  response.headers.get("location") ??
  decode(
    html.match(
      /<meta[^>]*http-equiv="refresh"[^>]*content="[^;]*;url=([^"]+)"/,
    )?.[1] ?? "",
  );

/**
 * El mensaje de confirmación. Se buscan todos porque el `loading.tsx` del
 * grupo también es un `role="status"` y viaja en el mismo flujo de respuesta.
 */
const confirmacion = (html, texto) =>
  [...html.matchAll(/role="status"[^>]*>([^<]*)/g)]
    .map((match) => decode(match[1]))
    .find((mensaje) => mensaje.includes(texto)) ?? "";

/** El IMC redondeado como lo hace la columna generada. */
const imc = (kg, cm) => Math.round((kg / (cm / 100) ** 2) * 100) / 100;

/** Registra un tamizaje saltándose la aplicación y devuelve el IMC calculado. */
const insertar = (patientId, takenOn, kg, cm) =>
  sql(
    `insert into public.screenings (patient_id, taken_on, weight_kg, height_cm, notes)
     values ('${patientId}'::uuid, '${takenOn}', ${kg}, ${cm}, '${marca}')
     returning bmi`,
  )
    .trim()
    // `psql -Atc` imprime también la etiqueta del comando.
    .split("\n")[0];

test("Tamizaje: registro, IMC y aislamiento", { timeout: 180_000 }, async (t) => {
  t.after(() => sql(`delete from public.screenings where notes like '%${marca}%'`));

  await t.test("El IMC lo calcula la base de datos, no la aplicación", () => {
    for (const [kg, cm] of [
      [70, 175],
      [80, 180],
      [55.5, 160],
      [102.4, 168.5],
    ]) {
      assert.equal(
        Number(insertar(elena, "2026-01-15", kg, cm)),
        imc(kg, cm),
        `IMC incorrecto para ${kg} kg y ${cm} cm`,
      );
    }
  });

  await t.test("El profesional a cargo registra un tamizaje", async () => {
    const client = await screenAs("professional");
    const { html } = await client.submit(
      `/screenings/${diego}`,
      {
        takenOn: "2026-03-20",
        weightKg: "78.4",
        heightCm: "176",
        bodyFatPct: "21.5",
        waist_cm: "88",
        notes: `Primera medición ${marca}`,
      },
      'name="takenOn"',
    );
    assert.equal(
      confirmacion(html, "Tamizaje"),
      "Tamizaje registrado.",
      html.match(/role="alert"[^>]*>([^<]*)/)?.[1] ?? "sin alerta",
    );

    const fila = sql(
      `select weight_kg || '|' || height_cm || '|' || bmi || '|' || body_fat_pct
              || '|' || (measurements->>'waist_cm') || '|' || taken_by
         from public.screenings
        where patient_id = '${diego}'::uuid and notes like '%${marca}%'`,
    ).trim();
    assert.equal(
      fila,
      `78.40|176.00|${imc(78.4, 176)}|21.5|88|00000000-0000-4000-a000-000000000002`,
    );
  });

  await t.test("La autoría del tamizaje no se puede falsificar (BACK-004)", async () => {
    const client = await apiAs("professional");
    const alta = await client
      .from("screenings")
      .insert({
        patient_id: diego,
        taken_on: "2026-04-01",
        weight_kg: 77,
        height_cm: 176,
        // Beto atiende a Diego, pero intenta atribuir el tamizaje al admin.
        taken_by: "00000000-0000-4000-a000-000000000001",
        notes: `Autoría falsa ${marca}`,
      })
      .select("id, taken_by")
      .single();
    assert.equal(alta.error, null, "El alta válida debe pasar");
    assert.equal(
      alta.data.taken_by,
      "00000000-0000-4000-a000-000000000002",
      "El trigger fija la autoría al actor real, no a lo que llega en el payload",
    );

    const edicion = await client
      .from("screenings")
      .update({ taken_by: "00000000-0000-4000-a000-000000000001" })
      .eq("id", alta.data.id)
      .select("taken_by")
      .single();
    assert.equal(
      edicion.data.taken_by,
      "00000000-0000-4000-a000-000000000002",
      "La autoría es inmutable en edición",
    );

    // Fuera del historial que comprueban los siguientes subtests.
    sql(`delete from public.screenings where id = '${alta.data.id}'::uuid`);
  });

  await t.test("El historial va del tamizaje más reciente al más antiguo", async () => {
    insertar(diego, "2025-11-02", 82, 176);
    insertar(diego, "2026-06-10", 76.2, 176);
    const client = await screenAs("professional");
    const { html } = await client.request(`/screenings/${diego}`);
    const fechas = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map((m) =>
      decode(m[1]),
    );
    assert.deepEqual(fechas, [
      "10 de junio de 2026",
      "20 de marzo de 2026",
      "2 de noviembre de 2025",
    ]);
  });

  await t.test("Un profesional sin asignación no ve ni registra", async () => {
    // La ficha empieza a fluir con 200 por el `loading.tsx`, así que el 404
    // se comprueba en el cuerpo: ni el nombre de Elena ni su formulario.
    const pantalla = await screenAs("professional");
    const { html } = await pantalla.request(`/screenings/${elena}`);
    assert.match(html, /could not be found|no se encontró|404/i);
    assert.ok(!html.includes('name="takenOn"'), "No debe ofrecer el formulario");
    assert.ok(!html.includes("Elena"), "No debe revelar el nombre del paciente");

    const client = await apiAs("professional");
    const alta = await client
      .from("screenings")
      .insert({ patient_id: elena, weight_kg: 60, height_cm: 165 })
      .select("id");
    assert.notEqual(alta.error, null, "RLS debe rechazar el alta");
    assert.equal(
      (await client.from("screenings").select("id").eq("patient_id", elena))
        .data.length,
      0,
      "Beto no puede leer los tamizajes de Elena",
    );
  });

  await t.test("El paciente consulta los suyos pero no los escribe", async () => {
    const client = await apiAs("patient");
    const propios = await client
      .from("screenings")
      .select("id, bmi")
      .eq("patient_id", diego);
    assert.equal(propios.error, null);
    assert.ok(propios.data.length > 0, "Diego lee sus propios tamizajes");

    const alta = await client
      .from("screenings")
      .insert({ patient_id: diego, weight_kg: 70, height_cm: 176 })
      .select("id");
    assert.notEqual(alta.error, null, "RLS debe rechazar el alta del paciente");

    const cambio = await client
      .from("screenings")
      .update({ weight_kg: 60 })
      .eq("id", propios.data[0].id)
      .select("id");
    assert.equal(cambio.error, null);
    assert.deepEqual(cambio.data, [], "El paciente no modifica su tamizaje");
  });

  await t.test("El paciente no llega al panel de seguimiento", async () => {
    const client = await screenAs("patient");
    assert.match(destino(await client.request("/screenings")), /\/patient$/);
  });
});
