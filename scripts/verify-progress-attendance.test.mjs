/**
 * Verifica el registro de asistencia del slice 4: quién puede tomarla, que la
 * misma fecha no se registra dos veces, que el historial y el resumen del mes
 * en curso cuadran, y qué impide RLS cuando se salta la interfaz.
 *
 * Requiere Supabase local encendido con su semilla y `npm run dev` en marcha.
 * Todo lo que crea lleva una marca en las observaciones y se borra al terminar.
 *
 * Uso:  npm run test:attendance
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
const beto = "00000000-0000-4000-a000-000000000002";
const diego = "00000000-0000-4000-a000-000000000004";
const elena = "00000000-0000-4000-a000-000000000005";
const password = "demo1234";

/** Distingue las filas de esta ejecución de cualquier otra. */
const marca = `asistencia-${crypto.randomUUID().slice(0, 8)}`;

/**
 * El mismo "hoy" que usa la aplicación: el del negocio en Colombia, no el del
 * servidor. Si esto se desalinea, el registro del día se vuelve el de ayer.
 */
const hoy = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
}).format(new Date());
const mes = hoy.slice(0, 7);

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

/** Una fecha tal como la escribe la aplicación. */
const escrita = (value) =>
  new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));

const alerta = (html) =>
  decode(html.match(/role="alert"[^>]*>([^<]*)/)?.[1] ?? "sin alerta");

/** Registra una asistencia saltándose la aplicación. */
const insertar = (patientId, attendedOn) =>
  sql(
    `insert into public.attendance (patient_id, attended_on, notes)
     values ('${patientId}'::uuid, '${attendedOn}', '${marca}')`,
  );

test("Asistencia: registro, duplicado y aislamiento", { timeout: 180_000 }, async (t) => {
  t.after(() => sql(`delete from public.attendance where notes like '%${marca}%'`));

  await t.test("El profesional a cargo registra la asistencia de hoy", async () => {
    const client = await screenAs("professional");
    const { html } = await client.submit(
      `/attendance/${diego}`,
      { attendedOn: hoy, notes: `Vino a entrenar ${marca}` },
      'name="attendedOn"',
    );
    assert.equal(
      confirmacion(html, "Asistencia"),
      "Asistencia registrada.",
      alerta(html),
    );

    const fila = sql(
      `select attended_on || '|' || registered_by || '|' || (check_in_at is not null)
         from public.attendance
        where patient_id = '${diego}'::uuid and notes like '%${marca}%'`,
    ).trim();
    assert.equal(fila, `${hoy}|${beto}|true`, "Falta la fecha, la hora o el autor");
  });

  await t.test("La misma fecha no se registra dos veces", async () => {
    const client = await screenAs("professional");
    const { html } = await client.submit(
      `/attendance/${diego}`,
      { attendedOn: hoy, notes: `Repetida ${marca}` },
      'name="attendedOn"',
    );
    assert.equal(
      alerta(html),
      "Ese paciente ya tiene la asistencia registrada ese día.",
    );
    assert.equal(
      sql(
        `select count(*) from public.attendance
          where patient_id = '${diego}'::uuid and attended_on = '${hoy}'`,
      ).trim(),
      "1",
      "El duplicado no debe llegar a la base de datos",
    );
  });

  await t.test("El historial y el resumen del mes en curso", async () => {
    // De Elena, que nadie atiende: así el conteo no depende de lo anterior.
    insertar(elena, `${mes}-03`);
    insertar(elena, `${mes}-01`);
    insertar(elena, "2025-12-20");

    const client = await screenAs("admin");
    const { html } = await client.request(`/attendance/${elena}`);
    assert.match(html, /asistió 2 veces/, "El resumen del mes no cuadra");

    const fechas = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map((m) =>
      decode(m[1]),
    );
    assert.deepEqual(
      fechas,
      [`${mes}-03`, `${mes}-01`, "2025-12-20"].map(escrita),
      "El historial va de la asistencia más reciente a la más antigua",
    );
  });

  await t.test("Un profesional sin asignación no ve ni registra", async () => {
    const pantalla = await screenAs("professional");
    // La ficha no llega a renderizarse: ni el formulario ni el nombre. El
    // cuerpo del 404 de Next viaja en el árbol de cualquier respuesta, así que
    // no sirve para distinguirlas.
    const { html } = await pantalla.request(`/attendance/${elena}`);
    assert.ok(!html.includes('name="attendedOn"'), "No debe ofrecer el formulario");
    assert.ok(!html.includes("Elena"), "No debe revelar el nombre del paciente");

    const client = await apiAs("professional");
    const alta = await client
      .from("attendance")
      .insert({ patient_id: elena, attended_on: `${mes}-04` })
      .select("id");
    assert.notEqual(alta.error, null, "RLS debe rechazar el alta");
    assert.equal(
      (await client.from("attendance").select("id").eq("patient_id", elena))
        .data.length,
      0,
      "Beto no puede leer la asistencia de Elena",
    );
  });

  await t.test("El paciente ve la suya y solo la suya", async () => {
    const client = await apiAs("patient");
    const todas = await client.from("attendance").select("id, patient_id");
    assert.equal(todas.error, null);
    assert.ok(todas.data.length > 0, "Diego lee sus propias asistencias");
    assert.deepEqual(
      [...new Set(todas.data.map((row) => row.patient_id))],
      [diego],
      "No debe llegarle ninguna asistencia de otro paciente",
    );

    const pantalla = await screenAs("patient");
    const { html } = await pantalla.request("/attendance/me");
    assert.match(html, /has venido/, "Falta el resumen del mes");
    assert.ok(!html.includes("Elena"), "No debe revelar a otro paciente");
  });

  await t.test("El paciente no registra su propia asistencia", async () => {
    const client = await apiAs("patient");
    const alta = await client
      .from("attendance")
      .insert({ patient_id: diego, attended_on: `${mes}-28` })
      .select("id");
    assert.notEqual(alta.error, null, "RLS debe rechazar el alta del paciente");

    const pantalla = await screenAs("patient");
    assert.match(destino(await pantalla.request("/attendance")), /\/patient$/);
  });
});
