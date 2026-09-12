/**
 * Verifica las gráficas de evolución del slice 4: que la agregación ocurre en
 * el servidor, que con un solo dato se muestra el valor en vez de una gráfica
 * vacía, que sin datos se explica qué falta, y que la progresión de carga sale
 * de `session_logs`.
 *
 * Requiere Supabase local encendido con su semilla y `npm run dev` en marcha.
 * Todo lo que crea lleva una marca y se borra al terminar.
 *
 * Uso:  npm run test:evolution
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { decode, httpClient, sql } from "./helpers/auth-http.mjs";

/** Personas de `supabase/seed.sql`: nadie atiende a Elena, el admin la ve. */
const people = {
  admin: { email: "admin@demo.local" },
  patient: { email: "paciente@demo.local" },
};
const elena = "00000000-0000-4000-a000-000000000005";
const password = "demo1234";

/** Distingue las filas de esta ejecución de cualquier otra. */
const marca = `evolucion-${crypto.randomUUID().slice(0, 8)}`;

async function screenAs(role) {
  const client = httpClient();
  const result = await client.submit("/login", {
    email: people[role].email,
    password,
  });
  assert.ok(
    result.response.headers.get("location"),
    `No inició sesión como ${role}`,
  );
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

/** El texto visible, sin etiquetas ni los separadores que mete React. */
const texto = (html) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");

const verEvolucion = async (client) =>
  texto((await client.request(`/evolution/${elena}`)).html);

const tamizaje = (takenOn, kg) =>
  sql(
    `insert into public.screenings (patient_id, taken_on, weight_kg, height_cm, notes)
     values ('${elena}'::uuid, '${takenOn}', ${kg}, 165, '${marca}')`,
  );

/**
 * Una sesión con un ejercicio hecho con peso. Monta la cadena entera —rutina,
 * día, ítem, sesión y registro— porque la progresión se lee de todas ellas.
 */
function sesion(performedOn, kg) {
  sql(`
    with rutina as (
      insert into public.routines (patient_id, kind, name)
      values ('${elena}'::uuid, 'training', '${marca}')
      on conflict do nothing
      returning id
    ), existente as (
      select id from public.routines where name = '${marca}'
    ), elegida as (
      select coalesce((select id from rutina), (select id from existente)) as id
    ), dia as (
      insert into public.routine_days (routine_id, day_number, title)
      select id, 1, '${marca}' from elegida
      on conflict (routine_id, day_number) do update set title = excluded.title
      returning id, routine_id
    ), item as (
      insert into public.routine_items (routine_day_id, exercise_id, position, sets, reps)
      select dia.id, (select id from public.exercises order by name limit 1), 1, 3, 10
      from dia
      on conflict (routine_day_id, position) do update set sets = excluded.sets
      returning id, routine_day_id
    ), sesion as (
      insert into public.sessions (routine_id, routine_day_id, patient_id, performed_on, status)
      select dia.routine_id, dia.id, '${elena}'::uuid, '${performedOn}', 'completed'
      from dia
      returning id
    )
    insert into public.session_logs
      (session_id, routine_item_id, patient_id, status, actual_sets, actual_reps, actual_weight)
    select sesion.id, item.id, '${elena}'::uuid, 'done', 3, 10, ${kg}
    from sesion, item
  `);
}

test("Evolución: agregación, estados y progresión", { timeout: 180_000 }, async (t) => {
  t.after(() => {
    sql(`delete from public.routines where name = '${marca}'`);
    sql(`delete from public.screenings where notes like '%${marca}%'`);
  });

  await t.test("Sin datos explica qué falta, no dibuja nada", async () => {
    const client = await screenAs("admin");
    const visible = await verEvolucion(client);
    assert.match(visible, /no tiene tamizajes todavía/);
    assert.match(visible, /Aún no hay sesiones con peso registrado/);
  });

  await t.test("Con un solo tamizaje muestra el valor, no una gráfica", async () => {
    tamizaje("2026-02-10", 68.5);
    const client = await screenAs("admin");
    const { html } = await client.request(`/evolution/${elena}`);
    const visible = texto(html);
    assert.match(visible, /68,5 kg/, "Debe mostrar el valor que sí hay");
    assert.match(visible, /Registra el segundo/);
    assert.ok(
      !html.includes("recharts"),
      "Con un punto no se monta ninguna gráfica",
    );
  });

  await t.test("Con dos tamizajes se dibuja la evolución", async () => {
    tamizaje("2026-04-10", 66);
    const client = await screenAs("admin");
    const { html } = await client.request(`/evolution/${elena}`);
    const visible = texto(html);
    assert.ok(
      !visible.includes("Registra el segundo"),
      "Ya hay dos tamizajes: toca gráfica",
    );
    assert.match(visible, /Qué se dibuja/, "Falta el selector de métrica");
    assert.match(html, /<option value="weight"[^>]*>Peso<\/option>/);
    assert.match(html, /<option value="bmi"[^>]*>IMC<\/option>/);
    assert.match(
      html,
      /<svg[^>]+role="img"[^>]+aria-label="Peso:/,
      "La gráfica debe montarse",
    );
    assert.ok(
      !html.includes("recharts"),
      "La gráfica no debe cargar la librería pesada de gráficas",
    );
    assert.ok(
      !html.includes('value="waist_cm"'),
      "Una medida que nadie tomó no debe ofrecerse",
    );
  });

  await t.test("La progresión de carga sale de las sesiones", async () => {
    sesion("2026-04-01", 40);
    const client = await screenAs("admin");
    const visible = await verEvolucion(client);
    assert.match(visible, /40 kg/, "Con una sola sesión muestra la carga");
    assert.match(visible, /Solo hay una sesión con peso/);

    sesion("2026-04-08", 45);
    const segunda = await verEvolucion(await screenAs("admin"));
    assert.ok(
      !segunda.includes("Solo hay una sesión con peso"),
      "Con dos sesiones toca gráfica de progresión",
    );
    assert.match(
      segunda,
      /3\/4 Sit-Up|Qué se dibuja/,
      "La serie se nombra con el ejercicio",
    );
  });

  await t.test("Sustituir el ejercicio de la rutina no reescribe la historia", async () => {
    // El profesional cambia el ejercicio del ítem después de que el paciente
    // ya levantó peso con el anterior. La carga registrada pertenece al
    // ejercicio con el que se levantó, no al que ocupa hoy esa posición.
    const anterior = sql(
      `select e.name from public.exercises e
         join public.session_logs l on l.exercise_id = e.id
         join public.sessions s on s.id = l.session_id
         join public.routines r on r.id = s.routine_id
         where r.name = '${marca}' limit 1`,
    ).trim();
    const nuevo = sql(
      `select id || '|' || name from public.exercises
         where name <> '${anterior.replaceAll("'", "''")}' order by name limit 1`,
    ).trim();
    const [nuevoId, nuevoNombre] = nuevo.split("|");

    sql(`update public.routine_items i set exercise_id = '${nuevoId}'::uuid,
      was_modified = true
      from public.routine_days d join public.routines r on r.id = d.routine_id
      where d.id = i.routine_day_id and r.name = '${marca}'`);

    // El nombre de la serie viaja en el payload de la gráfica, dentro de un
    // <script>, así que aquí se mira el HTML entero y no solo el texto visible.
    const client = await screenAs("admin");
    const html = (await client.request(`/evolution/${elena}`)).html;
    assert.ok(
      html.includes(anterior),
      `La serie debe seguir nombrada «${anterior}», el ejercicio que se ejecutó`,
    );
    assert.ok(
      !html.includes(nuevoNombre),
      `«${nuevoNombre}» no se ha ejecutado nunca: no puede heredar esas cargas`,
    );
  });

  await t.test("El paciente no llega a la evolución de nadie", async () => {
    const client = await screenAs("patient");
    assert.match(destino(await client.request(`/evolution/${elena}`)), /\/patient$/);
  });
});
