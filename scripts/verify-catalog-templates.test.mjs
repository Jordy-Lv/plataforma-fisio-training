/**
 * Verifica el CRUD de plantillas de rutina y la gestión de sus días y sus
 * ejercicios: quién puede escribirlas, qué rechaza la validación, que el orden
 * de los ejercicios es explícito y se conserva al recargar, y qué impide RLS
 * cuando se salta la interfaz.
 *
 * Requiere Supabase local encendido y `npm run dev` en marcha. No necesita el
 * catálogo sembrado: crea sus propios ejercicios y los borra al terminar.
 *
 * Uso:  npm run test:templates
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { appUrl, decode, httpClient, sql, status } from "./helpers/auth-http.mjs";

function locationOf(result) {
  const location =
    result.response.headers.get("location") ??
    result.html.match(
      /<meta[^>]*http-equiv="refresh"[^>]*content="[^;]*;url=([^"]+)"/,
    )?.[1];
  assert.ok(
    location,
    `Se esperaba una redirección, llegó ${result.response.status}`,
  );
  return new URL(decode(location), appUrl).pathname;
}

const alerta = (html) =>
  decode(html.match(/role="alert"[^>]*>([^<]*)/)?.[1] ?? "");

/** El mensaje de confirmación que contiene un texto dado, sin el resto de la página. */
const confirmacion = (html, texto) =>
  [...html.matchAll(/role="status"[^>]*>([^<]*)/g)]
    .map((match) => decode(match[1]))
    .find((mensaje) => mensaje.includes(texto)) ?? "";

/**
 * La ficha de una plantilla tiene un formulario por día y hasta cuatro por
 * ejercicio, así que hace falta más de un marcador para señalar cuál se envía.
 */
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

async function enviar(client, route, markers, values = {}) {
  const { html, response } = await client.request(route);
  assert.equal(response.status, 200, `No abrió ${route}`);
  const body = formulario(html, markers);
  for (const [key, value] of Object.entries(values)) {
    body.delete(key);
    for (const item of Array.isArray(value) ? value : [value])
      body.append(key, item);
  }
  return client.request(route, { method: "POST", body });
}

test("Plantillas de rutina: días y ejercicios", { timeout: 180_000 }, async (t) => {
  const password = `Test-${crypto.randomUUID()}!`;
  const marca = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  const people = {};
  const ids = [];
  const plantillas = [];

  t.after(() => {
    for (const id of plantillas) {
      assert.match(id, /^[a-f0-9-]{36}$/);
      // Una regla impide borrar su plantilla: se retira primero.
      sql(`delete from public.assignment_rules where template_id = '${id}'::uuid`);
      sql(`delete from public.routine_templates where id = '${id}'::uuid`);
    }
    sql(`delete from public.exercises where name like 'Ejercicio ${marca}%'`);
    for (const id of ids) {
      assert.match(id, /^[a-f0-9-]{36}$/);
      sql(`delete from auth.users where id = '${id}'::uuid`);
    }
  });

  for (const role of ["admin", "professional", "patient"]) {
    const email = `plantillas-${role}-${crypto.randomUUID()}@demo.local`;
    const auth = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await auth.auth.signUp({ email, password });
    assert.equal(result.error, null);
    const id = result.data.user.id;
    assert.match(id, /^[a-f0-9-]{36}$/);
    ids.push(id);
    if (role === "admin")
      sql(`update public.profiles set role = 'admin' where id = '${id}'`);
    if (role === "professional")
      sql(
        `update public.profiles set role = 'professional', specialty = 'physio' where id = '${id}'`,
      );
    await auth.auth.signOut();
    people[role] = { email, id };
  }

  /**
   * `returning` imprime también el recuento del `insert`, así que el
   * identificador es la primera línea.
   */
  const insertar = (query) => sql(query).trim().split("\n")[0];

  // El catálogo de esta prueba: tres ejercicios que se distinguen por su letra
  // y que el buscador encuentra por la marca común.
  const ejercicios = {};
  for (const letra of ["A", "B", "C"]) {
    ejercicios[letra] = {
      name: `Ejercicio ${marca} ${letra}`,
      id: insertar(
        `insert into public.exercises (name, is_custom) values ('Ejercicio ${marca} ${letra}', true) returning id`,
      ),
    };
  }

  async function signedInAs(role) {
    const client = httpClient();
    const result = await client.submit("/login", {
      email: people[role].email,
      password,
    });
    assert.ok(
      ["/admin", "/pro", "/patient"].includes(locationOf(result)),
      `No inició sesión como ${role}`,
    );
    return client;
  }

  const columna = (id, valor) =>
    sql(
      `select ${valor} from public.routine_templates where id = '${id}'::uuid`,
    ).trim();

  const diaId = (templateId, numero) =>
    sql(
      `select id from public.template_days where template_id = '${templateId}'::uuid and day_number = ${numero}`,
    ).trim();

  /** El contenido de un día en su orden explícito: `posición:letra`. */
  const contenido = (dayId) =>
    sql(
      `select i.position || ':' || right(e.name, 1)
         from public.template_items i
         join public.exercises e on e.id = i.exercise_id
        where i.template_day_id = '${dayId}'::uuid
        order by i.position`,
    )
      .trim()
      .split("\n")
      .filter(Boolean);

  let templateId;

  await t.test("El paciente no llega a las plantillas", async () => {
    const client = await signedInAs("patient");
    assert.match(locationOf(await client.request("/templates")), /^\/patient/);
    assert.match(
      locationOf(await client.request("/templates/new")),
      /^\/patient/,
    );
  });

  await t.test("El profesional consulta pero no crea", async () => {
    const client = await signedInAs("professional");
    const { response, html } = await client.request("/templates");
    assert.equal(response.status, 200);
    assert.ok(
      !html.includes("Crear plantilla"),
      "Al profesional no se le ofrece crear plantillas",
    );
    assert.match(locationOf(await client.request("/templates/new")), /^\/pro/);
  });

  await t.test("El admin crea una plantilla y nace como borrador", async () => {
    const client = await signedInAs("admin");
    const name = `Rehabilitación de rodilla ${marca}`;
    const result = await enviar(client, "/templates/new", ['name="name"'], {
      name,
      kind: "physio",
      goal: "rehab",
      level: "beginner",
      environment: "home",
      daysPerWeek: "3",
    });

    const destino = locationOf(result);
    assert.match(destino, /^\/templates\/[0-9a-f-]{36}$/, alerta(result.html));
    templateId = destino.split("/").pop();
    plantillas.push(templateId);

    assert.equal(columna(templateId, "name"), name);
    assert.equal(columna(templateId, "kind"), "physio");
    assert.equal(columna(templateId, "goal"), "rehab");
    assert.equal(columna(templateId, "environment"), "home");
    assert.equal(columna(templateId, "days_per_week"), "3");
    assert.equal(
      columna(templateId, "is_active"),
      "f",
      "Una plantilla sin días no puede nacer activa",
    );
  });

  await t.test("Un nombre demasiado corto se rechaza", async () => {
    const client = await signedInAs("admin");
    const result = await enviar(client, "/templates/new", ['name="name"'], {
      name: "ab",
      kind: "training",
      goal: "",
      level: "",
      environment: "",
      daysPerWeek: "3",
    });
    assert.equal(result.response.status, 200);
    assert.match(alerta(result.html), /al menos 3 caracteres/);
    assert.equal(
      sql(
        `select count(*) from public.routine_templates where name = 'ab'`,
      ).trim(),
      "0",
    );
  });

  await t.test("Más de siete días por semana se rechaza", async () => {
    const client = await signedInAs("admin");
    const name = `Fuera de rango ${marca}`;
    const result = await enviar(client, "/templates/new", ['name="name"'], {
      name,
      kind: "training",
      goal: "",
      level: "",
      environment: "",
      daysPerWeek: "9",
    });
    assert.match(alerta(result.html), /entre 1 y 7/);
    assert.equal(
      sql(
        `select count(*) from public.routine_templates where name = '${name}'`,
      ).trim(),
      "0",
    );
  });

  await t.test("El admin añade dos días numerados", async () => {
    const client = await signedInAs("admin");
    const ruta = `/templates/${templateId}`;

    const primero = await enviar(client, ruta, ["Añadir día"], {
      title: "Movilidad y activación",
    });
    assert.ok(primero.html.includes("Día 1 añadido"), alerta(primero.html));

    const segundo = await enviar(client, ruta, ["Añadir día"], { title: "" });
    assert.ok(segundo.html.includes("Día 2 añadido"), alerta(segundo.html));

    assert.equal(
      sql(
        `select title from public.template_days where id = '${diaId(templateId, 1)}'::uuid`,
      ).trim(),
      "Movilidad y activación",
    );
    assert.equal(
      sql(
        `select count(*) from public.template_days where template_id = '${templateId}'::uuid`,
      ).trim(),
      "2",
    );
  });

  await t.test("El admin añade ejercicios en orden explícito", async () => {
    const client = await signedInAs("admin");
    const dia = diaId(templateId, 1);
    const ruta = `/templates/${templateId}?dia=${dia}&q=${marca}`;

    for (const letra of ["A", "B", "C"]) {
      const result = await enviar(client, ruta, [
        `value="${ejercicios[letra].id}"`,
      ]);
      assert.ok(
        result.html.includes("Ejercicio añadido al día"),
        alerta(result.html) || `No se añadió el ejercicio ${letra}`,
      );
    }

    assert.deepEqual(contenido(dia), ["1:A", "2:B", "3:C"]);
  });

  await t.test("La prescripción se guarda y se valida", async () => {
    const client = await signedInAs("admin");
    const dia = diaId(templateId, 1);
    const itemId = sql(
      `select id from public.template_items where template_day_id = '${dia}'::uuid and position = 1`,
    ).trim();
    const ruta = `/templates/${templateId}`;
    const markers = [`value="${itemId}"`, 'name="targetWeight"'];

    const guardado = await enviar(client, ruta, markers, {
      sets: "3",
      reps: "12",
      targetWeight: "7.5",
      restSeconds: "60",
      notes: "Baja despacio y no bloquees la rodilla al subir.",
    });
    assert.ok(
      guardado.html.includes("Ejercicio actualizado"),
      alerta(guardado.html),
    );
    assert.equal(
      sql(
        `select sets || '/' || reps || '/' || target_weight || '/' || rest_seconds
           from public.template_items where id = '${itemId}'::uuid`,
      ).trim(),
      "3/12/7.50/60",
    );

    const rechazado = await enviar(client, ruta, markers, {
      sets: "40",
      reps: "12",
      targetWeight: "",
      restSeconds: "",
      notes: "",
    });
    assert.match(alerta(rechazado.html), /series deben ser un número entre 1 y 12/);
    assert.equal(
      sql(
        `select sets from public.template_items where id = '${itemId}'::uuid`,
      ).trim(),
      "3",
      "Un valor inválido no puede dejar la prescripción a medias",
    );
  });

  await t.test("El orden cambia y se conserva al recargar", async () => {
    const client = await signedInAs("admin");
    const dia = diaId(templateId, 1);
    const ruta = `/templates/${templateId}`;

    const subida = await enviar(client, ruta, [
      `aria-label="Subir ${ejercicios.C.name}"`,
    ]);
    assert.ok(subida.html.includes("Ejercicio subido"), alerta(subida.html));
    assert.deepEqual(contenido(dia), ["1:A", "2:C", "3:B"]);

    const bajada = await enviar(client, ruta, [
      `aria-label="Bajar ${ejercicios.A.name}"`,
    ]);
    assert.ok(bajada.html.includes("Ejercicio bajado"), alerta(bajada.html));
    assert.deepEqual(contenido(dia), ["1:C", "2:A", "3:B"]);

    // Lo que importa no es la fila en la base de datos sino lo que lee el
    // equipo al volver a la pantalla.
    const { html } = await client.request(ruta);
    const posición = (letra) => html.indexOf(ejercicios[letra].name);
    assert.ok(
      posición("C") < posición("A") && posición("A") < posición("B"),
      "El orden de la pantalla no coincide con el guardado",
    );
    assert.match(html, />1\.</, "Los ejercicios se numeran en pantalla");
  });

  await t.test("El profesional no puede escribir la plantilla", async () => {
    const admin = await signedInAs("admin");
    const ruta = `/templates/${templateId}`;
    const { html } = await admin.request(ruta);

    // El formulario existe para el admin; se reenvía con la sesión del
    // profesional, que es lo que haría quien se salta la interfaz.
    const body = formulario(html, ["Añadir día"]);
    body.set("title", "Día colado sin permiso");

    const profesional = await signedInAs("professional");
    const result = await profesional.request(ruta, { method: "POST", body });
    assert.equal(result.response.status, 200);
    assert.equal(
      sql(
        `select count(*) from public.template_days where template_id = '${templateId}'::uuid`,
      ).trim(),
      "2",
      "El profesional no puede añadir días",
    );
  });

  await t.test("El admin edita la cabecera sin tocar el contenido", async () => {
    const client = await signedInAs("admin");
    const name = `Rehabilitación revisada ${marca}`;
    const result = await enviar(
      client,
      `/templates/${templateId}`,
      ['name="daysPerWeek"'],
      {
        name,
        kind: "physio",
        goal: "",
        level: "intermediate",
        environment: "gym",
        daysPerWeek: "4",
      },
    );
    assert.ok(
      result.html.includes("Plantilla actualizada"),
      alerta(result.html),
    );
    assert.equal(columna(templateId, "name"), name);
    assert.equal(columna(templateId, "days_per_week"), "4");
    assert.equal(
      columna(templateId, "goal"),
      "",
      "Un criterio vacío es «cualquiera», no un valor inventado",
    );
    assert.deepEqual(contenido(diaId(templateId, 1)), ["1:C", "2:A", "3:B"]);
  });

  await t.test("Eliminar un día se lleva sus ejercicios", async () => {
    const client = await signedInAs("admin");
    const dia = diaId(templateId, 2);
    const result = await enviar(client, `/templates/${templateId}`, [
      `value="${dia}"`,
      "Eliminar día",
    ]);
    assert.ok(result.html.includes("Día eliminado"), alerta(result.html));
    assert.equal(
      sql(
        `select count(*) from public.template_days where id = '${dia}'::uuid`,
      ).trim(),
      "0",
    );
    assert.equal(
      sql(
        `select count(*) from public.template_items where template_day_id = '${dia}'::uuid`,
      ).trim(),
      "0",
    );
  });

  await t.test("Una plantilla incompleta no se puede activar", async () => {
    const client = await signedInAs("admin");
    const vacia = insertar(
      `insert into public.routine_templates (name, kind, is_active)
       values ('Incompleta ${marca}', 'training', false) returning id`,
    );
    plantillas.push(vacia);

    // El botón llega inhabilitado, así que se envía el formulario a mano: es
    // lo que haría quien se salta la interfaz, y el servidor debe negarse.
    const sinDias = await enviar(client, `/templates/${vacia}`, [
      'name="intent"',
    ]);
    assert.match(alerta(sinDias.html), /no tiene ningún día/);
    assert.equal(columna(vacia, "is_active"), "f");

    sql(
      `insert into public.template_days (template_id, day_number) values ('${vacia}'::uuid, 1)`,
    );
    const diaVacio = await enviar(client, `/templates/${vacia}`, [
      'name="intent"',
    ]);
    assert.match(alerta(diaVacio.html), /día 1 no tiene ejercicios/);
    assert.equal(
      columna(vacia, "is_active"),
      "f",
      "Un día sin ejercicios deja la plantilla incompleta",
    );
  });

  await t.test("La plantilla con contenido se activa", async () => {
    const client = await signedInAs("admin");
    const result = await enviar(client, `/templates/${templateId}`, [
      'name="intent"',
    ]);
    assert.ok(
      result.html.includes("Plantilla activada"),
      alerta(result.html) || "No confirmó la activación",
    );
    assert.equal(columna(templateId, "is_active"), "t");
  });

  await t.test(
    "Desactivarla avisa de las reglas que se quedan sin plantilla",
    async () => {
      const client = await signedInAs("admin");
      const activa = `Rodilla leve ${marca}`;
      const inactiva = `Regla apagada ${marca}`;
      insertar(
        `insert into public.assignment_rules (name, priority, template_id, is_active)
         values ('${activa}', 10, '${templateId}'::uuid, true) returning id`,
      );
      insertar(
        `insert into public.assignment_rules (name, priority, template_id, is_active)
         values ('${inactiva}', 20, '${templateId}'::uuid, false) returning id`,
      );
      const rutina = insertar(
        `insert into public.routines (patient_id, kind, source_template_id, name)
         values ('${people.patient.id}'::uuid, 'physio', '${templateId}'::uuid, 'Rutina ya asignada ${marca}')
         returning id`,
      );

      const result = await enviar(client, `/templates/${templateId}`, [
        'name="intent"',
      ]);
      // El aviso se lee en el mensaje de la acción, no en la lista de reglas
      // que la ficha muestra siempre.
      const mensaje = confirmacion(result.html, "Plantilla desactivada");
      assert.ok(mensaje, alerta(result.html) || "No confirmó la desactivación");
      assert.ok(
        mensaje.includes(activa),
        "Hay que decir qué regla se queda sin plantilla activa",
      );
      assert.ok(
        !mensaje.includes(inactiva),
        "Una regla ya inactiva no se queda sin nada",
      );
      assert.match(mensaje, /rutinas ya asignadas siguen igual/);
      assert.equal(columna(templateId, "is_active"), "f");

      // Las rutinas ya asignadas son copias: desactivar no las toca.
      assert.equal(
        sql(
          `select name from public.routines where id = '${rutina}'::uuid`,
        ).trim(),
        `Rutina ya asignada ${marca}`,
      );
      assert.equal(
        sql(
          `select source_template_id from public.routines where id = '${rutina}'::uuid`,
        ).trim(),
        templateId,
      );
    },
  );

  await t.test("Una plantilla usada por una regla no se elimina", async () => {
    const client = await signedInAs("admin");
    const result = await enviar(client, `/templates/${templateId}`, [
      "Eliminar plantilla",
    ]);
    assert.match(alerta(result.html), /Desactívala en lugar de eliminarla/);
    assert.equal(
      sql(
        `select count(*) from public.routine_templates where id = '${templateId}'::uuid`,
      ).trim(),
      "1",
    );
  });

  await t.test(
    "Contra la API, ni el profesional escribe ni el paciente lee",
    async () => {
      const profesional = createClient(status.API_URL, status.ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      assert.equal(
        (
          await profesional.auth.signInWithPassword({
            email: people.professional.email,
            password,
          })
        ).error,
        null,
      );

      const lectura = await profesional
        .from("routine_templates")
        .select("id")
        .eq("id", templateId);
      assert.equal(lectura.error, null);
      assert.equal(lectura.data.length, 1, "El profesional sí las consulta");

      const alta = await profesional
        .from("routine_templates")
        .insert({ name: "Plantilla del profesional", kind: "physio" })
        .select("id");
      assert.ok(alta.error, "El profesional no puede crear plantillas");

      const edición = await profesional
        .from("routine_templates")
        .update({ name: "Plantilla intervenida" })
        .eq("id", templateId)
        .select("id");
      assert.equal(edición.error, null);
      assert.deepEqual(edición.data, [], "RLS no debe dejarle editarla");
      await profesional.auth.signOut();

      const paciente = createClient(status.API_URL, status.ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      assert.equal(
        (
          await paciente.auth.signInWithPassword({
            email: people.patient.email,
            password,
          })
        ).error,
        null,
      );
      const suya = await paciente.from("routine_templates").select("id");
      assert.equal(suya.error, null);
      assert.deepEqual(
        suya.data,
        [],
        "El paciente recibe la copia, nunca la plantilla",
      );
      await paciente.auth.signOut();
    },
  );

  await t.test("El admin elimina la plantilla entera", async () => {
    const client = await signedInAs("admin");
    // Ya sin reglas que la usen, el borrado es posible.
    sql(
      `delete from public.assignment_rules where template_id = '${templateId}'::uuid`,
    );
    const result = await enviar(client, `/templates/${templateId}`, [
      "Eliminar plantilla",
    ]);
    assert.equal(locationOf(result), "/templates");
    assert.equal(
      sql(
        `select count(*) from public.routine_templates where id = '${templateId}'::uuid`,
      ).trim(),
      "0",
    );
    assert.equal(
      sql(
        `select count(*) from public.template_days where template_id = '${templateId}'::uuid`,
      ).trim(),
      "0",
      "Los días de la plantilla se eliminan con ella",
    );
  });
});
