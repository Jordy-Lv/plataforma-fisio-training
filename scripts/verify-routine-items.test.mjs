/**
 * Verifica el ajuste de la rutina por el profesional: editar la prescripción,
 * quitar, añadir y sustituir ejercicios desde el catálogo, y que nada de eso
 * toque la plantilla de origen ni la rutina de los demás pacientes.
 *
 * Es el camino 3 del plan de verificación —el snapshot— visto desde la
 * pantalla. La copia transaccional se comprueba aparte
 * (`scripts/verify-routine-snapshot.test.mjs`); esto comprueba lo que pasa
 * después, cuando el profesional adapta la copia al caso concreto.
 *
 * Requiere Supabase local encendido y `npm run dev` en marcha. Crea sus
 * propios ejercicios, plantilla y personas, y los borra al terminar.
 *
 * Uso:  npm run test:routines:items
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { decode, httpClient, sql, status } from "./helpers/auth-http.mjs";

/** El formulario que contiene todos los marcadores dados, como `FormData`. */
function formulario(html, markers) {
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
    .map((match) => match[0])
    .find((value) => markers.every((marker) => value.includes(marker)));
  assert.ok(form, `No se encontró el formulario ${markers.join(" + ")}`);
  const body = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const attrs = Object.fromEntries(
      [...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [
        m[1],
        decode(m[2]),
      ]),
    );
    if (attrs.type === "hidden" && attrs.name)
      body.append(attrs.name, attrs.value ?? "");
  }
  assert.ok(
    [...body.keys()].some((key) => key.startsWith("$ACTION_")),
    "Falta el formulario de server action",
  );
  return body;
}

/** Lee el formulario de una ruta y lo devuelve listo para reenviar. */
async function cuerpo(client, route, markers, values = {}) {
  const { html, response } = await client.request(route);
  assert.equal(response.status, 200, `No abrió ${route}`);
  const body = formulario(html, markers);
  for (const [key, value] of Object.entries(values)) {
    body.delete(key);
    for (const item of Array.isArray(value) ? value : [value])
      body.append(key, item);
  }
  return body;
}

const enviar = (client, route, body) =>
  client.request(route, { method: "POST", body });

/** El texto de la página, aplanado: llegue entero o por streaming. */
const contenido = (html) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replaceAll('\\"', '"')
    .replaceAll("\\n", "\n")
    .replace(/\\u([0-9a-f]{4})/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    );

test("Ajuste de la rutina por el profesional", { timeout: 180_000 }, async (t) => {
  const password = `Test-${crypto.randomUUID()}!`;
  const marca = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  const people = {};
  const ids = [];

  t.after(() => {
    for (const id of ids)
      sql(`delete from public.routines where patient_id = '${id}'::uuid`);
    sql(
      `delete from public.routine_templates where name like 'Plantilla ${marca}%'`,
    );
    sql(`delete from public.exercises where name like 'Ejercicio ${marca}%'`);
    for (const id of ids) {
      assert.match(id, /^[a-f0-9-]{36}$/);
      sql(`delete from auth.users where id = '${id}'::uuid`);
    }
  });

  /** Un profesional a cargo, uno ajeno y dos pacientes con el mismo perfil. */
  const roles = {
    admin: ["admin", null],
    pro: ["professional", "training"],
    ajeno: ["professional", "training"],
    paciente: ["patient", null],
    otro: ["patient", null],
  };
  for (const [quien, [role, specialty]] of Object.entries(roles)) {
    const email = `ajuste-${quien}-${crypto.randomUUID()}@demo.local`;
    const auth = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await auth.auth.signUp({ email, password });
    assert.equal(result.error, null);
    const id = result.data.user.id;
    assert.match(id, /^[a-f0-9-]{36}$/);
    ids.push(id);
    sql(`update public.profiles set role = '${role}',
      specialty = ${specialty ? `'${specialty}'` : "null"}
      where id = '${id}'::uuid`);
    await auth.auth.signOut();
    people[quien] = { email, id };
  }

  // El ajeno es profesional en activo, pero de otro paciente: es lo que hace
  // la prueba honesta. Sin asignación vigente no debe poder tocar nada.
  sql(`insert into public.care_assignments (patient_id, professional_id, kind)
    values ('${people.paciente.id}'::uuid, '${people.pro.id}'::uuid, 'training'),
           ('${people.otro.id}'::uuid, '${people.pro.id}'::uuid, 'training')`);

  const insertar = (query) => sql(query).trim().split("\n")[0];

  const ejercicios = {
    uno: insertar(`insert into public.exercises (name, is_custom)
      values ('Ejercicio ${marca} uno', true) returning id`),
    dos: insertar(`insert into public.exercises (name, is_custom)
      values ('Ejercicio ${marca} dos', true) returning id`),
    tres: insertar(`insert into public.exercises (name, is_custom)
      values ('Ejercicio ${marca} tres', true) returning id`),
    recambio: insertar(`insert into public.exercises (name, is_custom)
      values ('Ejercicio ${marca} recambio', true) returning id`),
  };

  const templateId = insertar(
    `insert into public.routine_templates (name, kind, days_per_week, is_active)
     values ('Plantilla ${marca} base', 'training', 1, true) returning id`,
  );
  const templateDay = insertar(
    `insert into public.template_days (template_id, day_number, title)
     values ('${templateId}'::uuid, 1, 'Día único') returning id`,
  );
  sql(`insert into public.template_items
    (template_day_id, exercise_id, position, sets, reps, rest_seconds) values
      ('${templateDay}'::uuid, '${ejercicios.uno}'::uuid, 1, 3, 10, 60),
      ('${templateDay}'::uuid, '${ejercicios.dos}'::uuid, 2, 3, 12, 60),
      ('${templateDay}'::uuid, '${ejercicios.tres}'::uuid, 3, 4, 8, 90)`);

  /** El contenido de la plantilla, para comprobar que no se mueve. */
  const plantilla = () =>
    sql(`select coalesce(jsonb_agg(jsonb_build_object(
      'exercise_id', i.exercise_id, 'position', i.position, 'sets', i.sets,
      'reps', i.reps, 'target_weight', i.target_weight,
      'rest_seconds', i.rest_seconds, 'notes', i.notes
    ) order by i.position), '[]'::jsonb)
    from public.template_items i
    where i.template_day_id = '${templateDay}'::uuid`).trim();

  const original = plantilla();

  const rutina = (patientId) =>
    sql(`select coalesce(jsonb_agg(jsonb_build_object(
      'exercise_id', i.exercise_id, 'position', i.position, 'sets', i.sets,
      'reps', i.reps, 'target_weight', i.target_weight,
      'rest_seconds', i.rest_seconds, 'notes', i.notes
    ) order by i.position), '[]'::jsonb)
    from public.routine_items i
    join public.routine_days d on d.id = i.routine_day_id
    join public.routines r on r.id = d.routine_id
    where r.patient_id = '${patientId}'::uuid`).trim();

  async function signedInAs(quien) {
    const client = httpClient();
    const result = await client.submit("/login", {
      email: people[quien].email,
      password,
    });
    assert.ok(
      result.response.headers.get("location") ??
        result.html.includes("http-equiv=\"refresh\""),
      `No inició sesión ${quien}`,
    );
    return client;
  }

  const pro = await signedInAs("pro");
  const ajeno = await signedInAs("ajeno");
  const paciente = await signedInAs("paciente");

  // La rutina del paciente sale de la copia real, no de un insert a mano: es
  // la que después se ajusta.
  const auth = createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const sesion = await auth.auth.signInWithPassword({
    email: people.pro.email,
    password,
  });
  assert.equal(sesion.error, null);
  const copia = await auth.rpc("copy_routine_template", {
    patient_id: people.paciente.id,
    template_id: templateId,
  });
  assert.equal(copia.error, null);

  const ruta = `/pro/routines/${people.paciente.id}`;
  const dayId = sql(`select d.id from public.routine_days d
    join public.routines r on r.id = d.routine_id
    where r.patient_id = '${people.paciente.id}'::uuid`).trim();
  const itemAt = (position) =>
    sql(`select id from public.routine_items
      where routine_day_id = '${dayId}'::uuid and position = ${position}`).trim();

  const primero = itemAt(1);
  const tercero = itemAt(3);

  await t.test("La copia nace idéntica a la plantilla y sin ajustes", () => {
    assert.equal(rutina(people.paciente.id), original);
    assert.equal(
      sql(`select count(*) from public.routine_items i
        where i.routine_day_id = '${dayId}'::uuid and i.was_modified`).trim(),
      "0",
    );
  });

  await t.test("El profesional a cargo ajusta la prescripción y queda marcada", async () => {
    const body = await cuerpo(pro, ruta, [primero, 'name="sets"'], {
      sets: "5",
      reps: "15",
      targetWeight: "12.5",
      restSeconds: "90",
      notes: "Baja despacio y para si molesta la rodilla.",
    });
    const { html } = await enviar(pro, ruta, body);
    assert.match(contenido(html), /Ejercicio ajustado para este paciente\./);

    const fila = sql(`select sets || '/' || reps || '/' || target_weight
      || '/' || rest_seconds || '/' || was_modified || '/' || notes
      from public.routine_items where id = '${primero}'::uuid`).trim();
    assert.equal(
      fila,
      "5/15/12.50/90/true/Baja despacio y para si molesta la rodilla.",
    );
    assert.equal(plantilla(), original);
  });

  await t.test("Quitar un ejercicio no lo quita de la plantilla", async () => {
    const body = await cuerpo(pro, ruta, [tercero, "$ACTION_"], {});
    // El primer formulario del ítem es el de quitarlo; se confirma que no
    // arrastra los campos de la prescripción.
    assert.equal(body.get("sets"), null);
    const { html } = await enviar(pro, ruta, body);
    assert.match(
      contenido(html),
      /Ejercicio quitado de la rutina\. La plantilla de origen no cambia\./,
    );

    assert.equal(
      sql(`select count(*) from public.routine_items
        where routine_day_id = '${dayId}'::uuid`).trim(),
      "2",
    );
    assert.equal(plantilla(), original);
  });

  await t.test("Añadir un ejercicio del catálogo lo coloca al final", async () => {
    const abierto = `${ruta}?dia=${dayId}&q=${marca}+recambio`;
    const body = await cuerpo(pro, abierto, [
      `value="${ejercicios.recambio}"`,
      `value="${dayId}"`,
    ]);
    const { html } = await enviar(pro, abierto, body);
    assert.match(contenido(html), /Ejercicio añadido al final del día\./);

    const añadido = sql(`select position || '/' || was_modified
      from public.routine_items
      where routine_day_id = '${dayId}'::uuid
        and exercise_id = '${ejercicios.recambio}'::uuid`).trim();
    // Las posiciones no se renumeran al quitar: el tercero dejó libre la 3.
    assert.equal(añadido, "3/true");
    assert.equal(plantilla(), original);
  });

  await t.test("Sustituir conserva la posición y la prescripción", async () => {
    const abierto = `${ruta}?item=${primero}&q=${marca}+recambio`;
    const body = await cuerpo(pro, abierto, [
      `value="${ejercicios.recambio}"`,
      `value="${primero}"`,
    ]);
    const { html } = await enviar(pro, abierto, body);
    assert.match(
      contenido(html),
      /Ejercicio sustituido\. Conserva su posición y su prescripción\./,
    );

    assert.equal(
      sql(`select exercise_id || '/' || position || '/' || sets
        from public.routine_items where id = '${primero}'::uuid`).trim(),
      `${ejercicios.recambio}/1/5`,
    );
    assert.equal(plantilla(), original);
  });

  await t.test("Un profesional sin asignación y el paciente no ajustan nada", async () => {
    const segundo = itemAt(2);
    const antes = sql(`select sets from public.routine_items
      where id = '${segundo}'::uuid`).trim();

    // La server action es una URL pública: se le manda el mismo formulario
    // que compone la pantalla del profesional a cargo, con otra sesión.
    const sinTocar = () =>
      assert.equal(
        sql(`select sets from public.routine_items
          where id = '${segundo}'::uuid`).trim(),
        antes,
      );
    const ajuste = () =>
      cuerpo(pro, ruta, [segundo, 'name="sets"'], {
        sets: "11",
        reps: "20",
        targetWeight: "",
        restSeconds: "",
        notes: "",
      });

    // El ajeno es personal y llega a la pantalla, así que además de no cambiar
    // nada tiene que leer por qué se le rechaza.
    const rechazo = await enviar(ajeno, ruta, await ajuste());
    assert.match(
      contenido(rechazo.html),
      /Solo el profesional con asignación vigente/,
    );
    sinTocar();

    // Al paciente la pantalla del profesional le está vedada: la acción se
    // rechaza y el render lo devuelve a lo suyo, así que no hay mensaje que
    // leer. Lo que se comprueba es que su rutina siguió igual.
    const vetado = await enviar(paciente, ruta, await ajuste());
    assert.doesNotMatch(contenido(vetado.html), /Ejercicio ajustado/);
    sinTocar();

    assert.equal(plantilla(), original);
  });

  await t.test("Quitar un ejercicio ya ejecutado se rechaza y explica la salida", async () => {
    // Desde que `session_logs` referencia al ítem sin borrado en cascada,
    // quitar un ejercicio con historia destruiría lo que el paciente registró.
    // La base lo impide; la pantalla tiene que decir qué hacer en su lugar.
    const segundo = itemAt(2);
    const routineId = sql(`select routine_id from public.routine_days
      where id = '${dayId}'::uuid`).trim();
    sql(`with s as (
        insert into public.sessions (routine_id, routine_day_id, patient_id, performed_on, status)
        values ('${routineId}'::uuid, '${dayId}'::uuid, '${people.paciente.id}'::uuid,
          current_date, 'completed') returning id
      )
      insert into public.session_logs (session_id, routine_item_id, patient_id, status, actual_sets, actual_reps, actual_weight)
      select s.id, '${segundo}'::uuid, '${people.paciente.id}'::uuid, 'done', 3, 12, 20 from s`);

    const { html } = await enviar(
      pro,
      ruta,
      await cuerpo(pro, ruta, [segundo, "$ACTION_"]),
    );
    assert.match(
      contenido(html),
      /No se puede quitar: el paciente ya ejecutó este ejercicio/,
    );
    assert.match(contenido(html), /Sustitúyelo por otro/);

    // Ni el ejercicio ni lo que el paciente registró se han movido.
    assert.equal(
      sql(`select count(*) from public.routine_items
        where id = '${segundo}'::uuid`).trim(),
      "1",
    );
    assert.equal(
      sql(`select count(*) from public.session_logs
        where routine_item_id = '${segundo}'::uuid`).trim(),
      "1",
    );
  });

  await t.test("El siguiente paciente recibe la plantilla original", async () => {
    const copia = await auth.rpc("copy_routine_template", {
      patient_id: people.otro.id,
      template_id: templateId,
    });
    assert.equal(copia.error, null);
    // Ni el ejercicio quitado, ni el añadido, ni la prescripción ajustada del
    // primer paciente llegan aquí: la plantilla nunca se tocó.
    assert.equal(rutina(people.otro.id), original);
    assert.equal(plantilla(), original);
    await auth.auth.signOut();
  });
});
