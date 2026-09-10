/**
 * Verifica el panorama del negocio del panel de administración: que las tres
 * cifras del alcance —clientes activos, cumplimiento y asistencia— coincidan
 * con lo que dice la base, que solo el administrador llegue a ellas y que el
 * estado vacío explique qué hacer.
 *
 * Requiere Supabase local encendido con su semilla y `npm run dev` en marcha.
 * Todo lo que crea se borra al terminar: las sesiones por el identificador con
 * el que se insertaron y la asistencia por su marca.
 *
 * Uso:  npm run test:overview
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { decode, httpClient, sql } from "./helpers/auth-http.mjs";

const people = {
  admin: { email: "admin@demo.local" },
  professional: { email: "entrenador@demo.local" },
  patient: { email: "paciente@demo.local" },
};
const password = "demo1234";

/** Distingue las filas de esta ejecución de cualquier otra. */
const marca = `panorama-${crypto.randomUUID().slice(0, 8)}`;
const fixtureRoutine = crypto.randomUUID();
const fixtureDay = crypto.randomUUID();
const fixtureExercise = crypto.randomUUID();

/** El mismo "hoy" que usa la aplicación: el del negocio en Colombia. */
const hoy = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
}).format(new Date());
const mes = `${hoy.slice(0, 7)}-01`;

const percentFormat = new Intl.NumberFormat("es-CO", {
  style: "percent",
  maximumFractionDigits: 0,
});

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

/**
 * La cifra grande de una tarjeta y la frase que la explica. Se leen del HTML
 * renderizado: es la pantalla real la que tiene que cuadrar, no la consulta.
 */
function tarjeta(html, título) {
  const match = html.match(
    new RegExp(
      `${título}</h3>\\s*<p[^>]*>([\\s\\S]*?)</p>\\s*<p[^>]*>([\\s\\S]*?)</p>`,
    ),
  );
  assert.ok(match, `No se encontró la tarjeta "${título}" en el panorama`);
  // React separa dos interpolaciones seguidas con un comentario vacío, y el
  // espacio del porcentaje es duro: ni uno ni otro son parte del texto.
  const texto = (value) =>
    decode(value.replaceAll("<!-- -->", "")).replaceAll(" ", " ").trim();
  return { valor: texto(match[1]), frase: texto(match[2]) };
}

/** Lo que la base dice hoy, con los mismos criterios que la pantalla. */
function esperado() {
  const [activos, cumplidos, registrados, sesiones, visitas, vinieron] = sql(
    `select (select count(*) from public.profiles
              where role = 'patient' and is_active)
         || '|' || (select count(*) from public.session_logs l
              join public.sessions s on s.id = l.session_id
             where s.performed_on >= '${mes}'
               and l.status in ('done', 'modified'))
         || '|' || (select count(*) from public.session_logs l
              join public.sessions s on s.id = l.session_id
             where s.performed_on >= '${mes}')
         || '|' || (select count(*) from public.sessions
             where performed_on >= '${mes}')
         || '|' || (select count(*) from public.attendance a
              join public.profiles p on p.id = a.patient_id
             where p.role = 'patient' and p.is_active
               and a.attended_on >= '${mes}')
         || '|' || (select count(distinct a.patient_id) from public.attendance a
              join public.profiles p on p.id = a.patient_id
             where p.role = 'patient' and p.is_active
               and a.attended_on >= '${mes}')`,
  )
    .trim()
    .split("|")
    .map(Number);
  return { activos, cumplidos, registrados, sesiones, visitas, vinieron };
}

/**
 * Comprueba que las tres tarjetas dicen exactamente lo que dice la base.
 *
 * Esta base la comparten varios agentes a la vez: si cambia mientras la
 * pantalla se renderiza, la foto no sirve para comparar y se repite. Solo se
 * afirma sobre una lectura estable, así que una diferencia real sigue fallando.
 */
async function cuadra(client, mensaje) {
  for (let intento = 1; ; intento += 1) {
    const inicio = esperado();
    const { html, response } = await client.request("/admin");
    const base = esperado();
    assert.equal(response.status, 200, "No abrió el panel de administración");
    if (JSON.stringify(inicio) !== JSON.stringify(base)) {
      assert.ok(intento < 5, `La base no se estabiliza (${mensaje})`);
      continue;
    }

    assert.equal(
      tarjeta(html, "Clientes activos").valor,
      String(base.activos),
      `Clientes activos no cuadra (${mensaje})`,
    );

    const cumplimiento = tarjeta(html, "Cumplimiento");
    if (base.registrados === 0) {
      assert.equal(cumplimiento.valor, "\u2014");
      assert.match(
        cumplimiento.frase,
        /Nadie ha registrado una sesión este mes/,
        `Sin sesiones el cumplimiento tiene que explicarse (${mensaje})`,
      );
    } else {
      assert.equal(
        cumplimiento.valor,
        percentFormat.format(base.cumplidos / base.registrados).replaceAll(
          "\u00a0",
          " ",
        ),
        `El cumplimiento no cuadra (${mensaje})`,
      );
      assert.match(
        cumplimiento.frase,
        new RegExp(`${base.cumplidos} de ${base.registrados} ejercicios`),
        `El desglose del cumplimiento no cuadra (${mensaje})`,
      );
      assert.match(
        cumplimiento.frase,
        new RegExp(
          base.sesiones === 1 ? "en 1 sesión" : `en ${base.sesiones} sesiones`,
        ),
        `El número de sesiones del mes no cuadra (${mensaje})`,
      );
    }

    const asistencia = tarjeta(html, "Asistencia");
    assert.equal(
      asistencia.valor,
      String(base.visitas),
      `La asistencia no cuadra (${mensaje})`,
    );
    if (base.visitas === 0)
      assert.match(
        asistencia.frase,
        /Nadie ha venido este mes/,
        `Sin asistencia la tarjeta tiene que explicarse (${mensaje})`,
      );
    else
      assert.match(
        asistencia.frase,
        new RegExp(
          `Vino ${
            base.vinieron === 1 ? "1 paciente" : `${base.vinieron} pacientes`
          } de ${base.activos}`,
        ),
        `El desglose de la asistencia no cuadra (${mensaje})`,
      );
    return base;
  }
}

/** La rutina temporal de esta prueba, independiente de los datos de la demo. */
function rutinaConTresEjercicios() {
  const fila = sql(
    `select r.id || '|' || d.id || '|' || r.patient_id || '|' ||
            string_agg(i.id::text, '|' order by i.position)
       from public.routines r
       join public.routine_days d on d.routine_id = r.id
       join public.routine_items i on i.routine_day_id = d.id
       join public.profiles p on p.id = r.patient_id
      where p.role = 'patient' and p.is_active and r.id = '${fixtureRoutine}'
      group by r.id, d.id, r.patient_id
     having count(i.id) >= 3
      limit 1`,
  ).trim();
  assert.ok(fila, "La semilla no tiene ninguna rutina con tres ejercicios");
  const [routineId, dayId, patientId, ...items] = fila.split("|");
  return { routineId, dayId, patientId, items };
}

/**
 * Una sesión con un ejercicio hecho, otro sustituido y otro saltado: los tres
 * estados que existen, para que el cumplimiento quede probado por sus dos
 * lados —lo que suma y lo que no—. El identificador lo pone la prueba para
 * poder borrar la sesión exactamente después; los registros se van con ella.
 */
function sembrarSesión(rutina, performedOn) {
  const sessionId = crypto.randomUUID();
  const [hecho, sustituido, saltado] = rutina.items;
  sql(
    `insert into public.sessions (id, routine_id, routine_day_id, patient_id, performed_on, status)
     values ('${sessionId}'::uuid, '${rutina.routineId}'::uuid, '${rutina.dayId}'::uuid,
             '${rutina.patientId}'::uuid, '${performedOn}', 'completed');
     insert into public.session_logs (session_id, routine_item_id, patient_id, status, actual_sets, actual_reps)
     values ('${sessionId}'::uuid, '${hecho}'::uuid, '${rutina.patientId}'::uuid, 'done', 3, 10),
            ('${sessionId}'::uuid, '${sustituido}'::uuid, '${rutina.patientId}'::uuid, 'modified', 3, 8);
     insert into public.session_logs (session_id, routine_item_id, patient_id, status, pain_level, pain_location, notes)
     values ('${sessionId}'::uuid, '${saltado}'::uuid, '${rutina.patientId}'::uuid, 'skipped', 8, 'knee', 'Dolor de rodilla ${marca}')`,
  );
  assert.equal(
    sql(
      `select string_agg(distinct status::text, ',' order by status::text)
         from public.session_logs where session_id = '${sessionId}'::uuid`,
    ).trim(),
    "done,modified,skipped",
    "La sesión de contraste tiene que ejercitar los tres estados",
  );
  return sessionId;
}

test("Panorama del negocio", { timeout: 180_000 }, async (t) => {
  const sesiones = [];
  t.after(() => {
    if (sesiones.length)
      sql(
        `delete from public.sessions where id in (${sesiones
          .map((id) => `'${id}'::uuid`)
          .join(", ")})`,
      );
    sql(`delete from public.attendance where notes like '%${marca}%'`);
    sql(`delete from public.routines where id='${fixtureRoutine}';
      delete from public.exercises where id='${fixtureExercise}'`);
  });
  sql(`insert into public.exercises(id,name,is_custom) values('${fixtureExercise}','Ejercicio ${marca}',true);
    insert into public.routines(id,patient_id,kind,name,status)
      values('${fixtureRoutine}','00000000-0000-4000-a000-000000000004','training','Rutina ${marca}','completed');
    insert into public.routine_days(id,routine_id,day_number) values('${fixtureDay}','${fixtureRoutine}',1);
    insert into public.routine_items(routine_day_id,exercise_id,position,sets,reps)
      select '${fixtureDay}','${fixtureExercise}',position,3,10 from generate_series(1,3) position;`);

  await t.test("Las tres cifras coinciden con la base", async () => {
    const client = await screenAs("admin");
    await cuadra(client, "estado inicial");

    // Una sesión de hoy con los tres estados y una asistencia: a partir de
    // aquí las tres cifras tienen algo que contar y algo que descartar.
    const rutina = rutinaConTresEjercicios();
    sesiones.push(sembrarSesión(rutina, hoy));
    sql(
      `insert into public.attendance (patient_id, attended_on, notes)
       values ('${rutina.patientId}'::uuid, '${hoy}', 'Vino ${marca}')
       on conflict (patient_id, attended_on) do nothing`,
    );

    const base = await cuadra(client, "tras registrar una sesión");
    assert.ok(
      base.cumplidos < base.registrados,
      "El ejercicio saltado tiene que quedar fuera del cumplimiento",
    );
    assert.ok(base.visitas > 0, "La asistencia registrada tiene que contarse");
  });

  await t.test("Lo de meses anteriores no entra en el mes en curso", async () => {
    const client = await screenAs("admin");
    const ayerDelMesPasado = sql(`select (date '${mes}' - 1)::text`).trim();
    sesiones.push(sembrarSesión(rutinaConTresEjercicios(), ayerDelMesPasado));

    // La consulta de contraste solo cuenta el mes en curso: si la pantalla no
    // acotara por fecha, estos dos registros de más la descuadrarían.
    await cuadra(client, "con una sesión del mes pasado");
  });

  await t.test("Un profesional y un paciente no llegan al panorama", async () => {
    for (const [role, panel] of [
      ["professional", "/pro"],
      ["patient", "/patient"],
    ]) {
      const client = await screenAs(role);
      const resultado = await client.request("/admin");
      assert.equal(
        new URL(destino(resultado), "http://localhost").pathname,
        panel,
        `El ${role} debe volver a su panel`,
      );
      assert.ok(
        !resultado.html.includes("Panorama del negocio"),
        `El ${role} no puede ver el panorama`,
      );
      assert.ok(
        !resultado.html.includes("Cumplimiento"),
        `El ${role} no puede ver las cifras del negocio`,
      );
    }
  });

  await t.test("El estado vacío explica qué hacer", async () => {
    const activos = sql(
      `select string_agg(id::text, ',') from public.profiles
        where role = 'patient' and is_active`,
    ).trim();
    assert.ok(activos, "La semilla no tiene pacientes activos");
    const ids = activos
      .split(",")
      .map((id) => `'${id}'::uuid`)
      .join(", ");
    const reactivar = () =>
      sql(`update public.profiles set is_active = true where id in (${ids})`);

    // La reactivación se registra antes de la baja: si algo falla en medio,
    // los pacientes de la semilla vuelven a quedar como estaban.
    t.after(reactivar);
    sql(`update public.profiles set is_active = false where id in (${ids})`);
    try {
      const client = await screenAs("admin");
      const { html } = await client.request("/admin");
      assert.match(
        html,
        /Todavía no hay clientes activos/,
        "Sin clientes activos el panorama tiene que decirlo",
      );
      assert.match(
        html,
        /Registra el primero desde el panel de personas/,
        "El estado vacío tiene que explicar qué hacer, no decir «Sin datos»",
      );
      assert.ok(
        !html.includes("Clientes activos</h3>"),
        "No se dibujan cifras sin nadie de quien calcularlas",
      );
    } finally {
      reactivar();
    }

    const client = await screenAs("admin");
    await cuadra(client, "tras reactivar a los pacientes");
  });
});
