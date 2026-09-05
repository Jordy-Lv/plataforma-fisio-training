/**
 * Verifica el panel de reglas de asignación y el simulador: quién escribe las
 * reglas, que el formulario por criterio guarda un `conditions` válido, que el
 * orden y el estado cambian la evaluación, que una regla rota se señala en
 * lugar de romper la pantalla, y que simular no crea nada.
 *
 * La lógica del motor se comprueba aparte y sin base de datos
 * (`npm run test:rules`). Esto comprueba el camino completo por la pantalla.
 *
 * Requiere Supabase local encendido y `npm run dev` en marcha. Crea sus
 * propios ejercicios, plantilla, reglas y personas, y los borra al terminar.
 *
 * Uso:  npm run test:rules:panel
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

/**
 * El texto de la página en un solo sitio.
 *
 * Cuando la respuesta tarda un poco, Next envía primero el `loading` y manda el
 * contenido detrás, dentro del payload de streaming: el texto está ahí, pero
 * escapado. Aplanarlo permite buscar lo mismo llegue como llegue.
 */
const contenido = (html) =>
  html
    // React separa el texto fijo del interpolado con un comentario vacío, así
    // que «Gana «{nombre}»» llega partido si no se quitan.
    .replace(/<!--.*?-->/g, "")
    .replaceAll('\\"', '"')
    .replaceAll("\\n", "\n")
    .replace(/\\u([0-9a-f]{4})/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    );

const alerta = (html) =>
  decode(html.match(/role="alert"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "").replace(
    /<[^>]*>/g,
    " ",
  );

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

test("Panel de reglas y simulador", { timeout: 180_000 }, async (t) => {
  const password = `Test-${crypto.randomUUID()}!`;
  const marca = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  const people = {};
  const ids = [];

  t.after(() => {
    sql(`delete from public.assignment_rules where name like '%${marca}%'`);
    sql(
      `delete from public.routine_templates where name like 'Plantilla ${marca}%'`,
    );
    sql(`delete from public.exercises where name like 'Ejercicio ${marca}%'`);
    for (const id of ids) {
      assert.match(id, /^[a-f0-9-]{36}$/);
      sql(`delete from auth.users where id = '${id}'::uuid`);
    }
  });

  for (const role of ["admin", "professional", "patient"]) {
    const email = `reglas-${role}-${crypto.randomUUID()}@demo.local`;
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

  const insertar = (query) => sql(query).trim().split("\n")[0];

  // Un ejercicio contraindicado para la rodilla y dos que no lo están: con
  // ellos se ve el filtro quitando uno y el día quedándose corto.
  const ejercicios = {
    knee: insertar(
      `insert into public.exercises (name, is_custom, contraindications)
       values ('Ejercicio ${marca} rodilla', true, '{knee}') returning id`,
    ),
    libre1: insertar(
      `insert into public.exercises (name, is_custom)
       values ('Ejercicio ${marca} libre 1', true) returning id`,
    ),
    libre2: insertar(
      `insert into public.exercises (name, is_custom)
       values ('Ejercicio ${marca} libre 2', true) returning id`,
    ),
  };

  /** Dos plantillas activas y completas a las que puedan apuntar las reglas. */
  const plantilla = (sufijo) => {
    const id = insertar(
      `insert into public.routine_templates (name, kind, days_per_week, is_active)
       values ('Plantilla ${marca} ${sufijo}', 'training', 1, true) returning id`,
    );
    const dia = insertar(
      `insert into public.template_days (template_id, day_number, title)
       values ('${id}'::uuid, 1, 'Día único') returning id`,
    );
    sql(
      `insert into public.template_items (template_day_id, exercise_id, position) values
         ('${dia}'::uuid, '${ejercicios.knee}'::uuid, 1),
         ('${dia}'::uuid, '${ejercicios.libre1}'::uuid, 2),
         ('${dia}'::uuid, '${ejercicios.libre2}'::uuid, 3)`,
    );
    return id;
  };

  const plantillas = { casa: plantilla("casa"), gym: plantilla("gimnasio") };

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
      `select ${valor} from public.assignment_rules where id = '${id}'::uuid`,
    ).trim();

  /** La simulación de un perfil de principiante en casa, de 30 años. */
  const simular = (client, extra = "") =>
    client.request(
      `/rules/simulador?simular=1&goal=general_health&level=beginner&environment=home&equipment=none&age=30${extra}`,
    );

  let reglaCasa;
  let reglaGym;

  await t.test("El paciente no llega a las reglas", async () => {
    const client = await signedInAs("patient");
    assert.match(locationOf(await client.request("/rules")), /^\/patient/);
    assert.match(
      locationOf(await client.request("/rules/simulador")),
      /^\/patient/,
    );
  });

  await t.test("El admin crea una regla y nace inactiva", async () => {
    const client = await signedInAs("admin");
    const result = await enviar(client, "/rules/new", ['name="name"'], {
      name: `Casa ${marca}`,
      priority: "1",
      templateId: plantillas.casa,
      goal: ["general_health", "lose_weight"],
      level: "beginner",
      environment: "home",
      equipment: ["none", "bands"],
      equipmentMode: "any",
      excludesConditions: "lower_back",
      ageMin: "18",
      ageMax: "60",
    });

    const destino = locationOf(result);
    assert.match(destino, /^\/rules\/[0-9a-f-]{36}$/, alerta(result.html));
    reglaCasa = destino.split("/").pop();

    assert.equal(columna(reglaCasa, "priority"), "1");
    assert.equal(
      columna(reglaCasa, "is_active"),
      "f",
      "Una regla recién escrita no debe entrar en vigor sola",
    );
    // El formulario por criterio guarda exactamente lo que dice el esquema.
    const conditions = JSON.parse(columna(reglaCasa, "conditions"));
    assert.deepEqual(conditions.goal.sort(), ["general_health", "lose_weight"]);
    assert.deepEqual(conditions.level, ["beginner"]);
    assert.deepEqual(conditions.environment, ["home"]);
    assert.deepEqual(conditions.equipment_any_of.sort(), ["bands", "none"]);
    assert.equal(conditions.equipment_all_of, undefined);
    assert.deepEqual(conditions.excludes_conditions, ["lower_back"]);
    assert.deepEqual(conditions.age_range, { min: 18, max: 60 });
  });

  await t.test("Un criterio fuera del vocabulario se rechaza", async () => {
    const client = await signedInAs("admin");
    const result = await enviar(client, "/rules/new", ['name="name"'], {
      name: `Inválida ${marca}`,
      priority: "2",
      templateId: plantillas.casa,
      goal: "ponerse_fuerte",
    });
    assert.match(alerta(contenido(result.html)), /objetivo que no está en la lista/);
    assert.equal(
      sql(
        `select count(*) from public.assignment_rules where name = 'Inválida ${marca}'`,
      ).trim(),
      "0",
    );
  });

  await t.test("Una regla inactiva no participa en la evaluación", async () => {
    const client = await signedInAs("admin");
    const html = contenido((await simular(client)).html);
    assert.ok(
      !html.includes(`Casa ${marca}`) ||
        html.includes("Inactiva: no participa"),
      "Una regla inactiva no puede ganar",
    );
  });

  await t.test("Al activarla, gana y el simulador lo explica", async () => {
    const client = await signedInAs("admin");
    const result = await enviar(
      client,
      `/rules/${reglaCasa}`,
      ['name="intent"'],
      {},
    );
    assert.equal(result.response.status, 200, alerta(result.html));
    assert.equal(columna(reglaCasa, "is_active"), "t");

    const html = contenido((await simular(client)).html);
    assert.match(html, new RegExp(`Gana «Casa ${marca}»`));
    assert.ok(
      html.includes(`Plantilla ${marca} casa`),
      "El simulador dice qué plantilla se asignaría",
    );
  });

  await t.test(
    "El simulador señala los ejercicios contraindicados y no crea nada",
    async () => {
      const client = await signedInAs("admin");
      const antes = sql(
        "select (select count(*) from public.routines) || '/' || (select count(*) from public.profiles) || '/' || (select count(*) from public.patient_conditions)",
      ).trim();

      const html = contenido(
        (await simular(client, "&conditions=knee")).html,
      );
      assert.ok(
        html.includes(`Ejercicio ${marca} rodilla`),
        "El ejercicio contraindicado tiene que aparecer como excluido",
      );
      assert.match(html, /contraindicado para Rodilla/);
      // Con un ejercicio menos, el día se queda por debajo del mínimo.
      assert.match(html, /menos de 3 ejercicios/);
      assert.match(html, /no ha creado ningún paciente/);

      assert.equal(
        sql(
          "select (select count(*) from public.routines) || '/' || (select count(*) from public.profiles) || '/' || (select count(*) from public.patient_conditions)",
        ).trim(),
        antes,
        "Simular no puede escribir nada",
      );
    },
  );

  await t.test("Reordenar cambia el orden de evaluación", async () => {
    const client = await signedInAs("admin");

    // Una segunda regla que también coincide con el perfil simulado.
    const creada = await enviar(client, "/rules/new", ['name="name"'], {
      name: `Genérica ${marca}`,
      priority: "2",
      templateId: plantillas.gym,
    });
    reglaGym = locationOf(creada).split("/").pop();
    await enviar(client, `/rules/${reglaGym}`, ['name="intent"'], {});
    assert.equal(columna(reglaGym, "is_active"), "t");

    // Con prioridad 1 gana la de casa.
    const primera = contenido((await simular(client)).html);
    assert.match(primera, new RegExp(`Gana «Casa ${marca}»`));

    const movida = await enviar(
      client,
      "/rules",
      [`value="${reglaGym}"`, 'value="up"'],
      {},
    );
    assert.equal(movida.response.status, 200, alerta(movida.html));
    assert.ok(
      Number(columna(reglaGym, "priority")) <
        Number(columna(reglaCasa, "priority")),
      "La regla subida tiene que quedar antes",
    );

    const segunda = contenido((await simular(client)).html);
    assert.match(segunda, new RegExp(`Gana «Genérica ${marca}»`));
    assert.ok(
      segunda.includes(`Plantilla ${marca} gimnasio`),
      "Cambiar el orden cambia la plantilla que se asignaría",
    );
  });

  await t.test(
    "Desactivar la ganadora devuelve el turno a la siguiente",
    async () => {
      const client = await signedInAs("admin");
      const result = await enviar(
        client,
        `/rules/${reglaGym}`,
        ['name="intent"'],
        {},
      );
      assert.equal(result.response.status, 200, alerta(result.html));
      assert.equal(columna(reglaGym, "is_active"), "f");

      const html = contenido((await simular(client)).html);
      assert.match(html, new RegExp(`Gana «Casa ${marca}»`));
    },
  );

  await t.test("Una regla guardada que ya no valida se advierte", async () => {
    const rota = insertar(
      `insert into public.assignment_rules (name, priority, template_id, conditions, is_active)
       values ('Rota ${marca}', 3, '${plantillas.casa}'::uuid, '{"mood": ["happy"]}'::jsonb, true)
       returning id`,
    );
    const client = await signedInAs("admin");

    const listado = await client.request("/rules");
    assert.equal(listado.response.status, 200);
    assert.match(contenido(listado.html), /Esta regla no se está aplicando/);
    assert.match(contenido(listado.html), /criterios que ya no existen: mood/);

    const ficha = await client.request(`/rules/${rota}`);
    assert.match(contenido(ficha.html), /Sus condiciones no son válidas/);

    // Y sigue sin participar: la evaluación continúa con las demás.
    const html = contenido((await simular(client)).html);
    assert.match(html, new RegExp(`Gana «Casa ${marca}»`));
    assert.match(html, /condiciones no son válidas y el motor la ignora/);
  });

  await t.test("El profesional consulta pero no escribe", async () => {
    const client = await signedInAs("professional");
    const { response, html: bruto } = await client.request("/rules");
    assert.equal(response.status, 200);
    const html = contenido(bruto);
    assert.ok(
      html.includes(`Casa ${marca}`),
      "El profesional tiene que poder consultar las reglas",
    );
    assert.ok(
      !html.includes("Crear regla"),
      "Al profesional no se le ofrece crear reglas",
    );
    assert.match(locationOf(await client.request("/rules/new")), /^\/pro/);

    // Y si se salta la interfaz, RLS no le deja tocar nada.
    const auth = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const sesion = await auth.auth.signInWithPassword({
      email: people.professional.email,
      password,
    });
    assert.equal(sesion.error, null);
    const { data } = await auth
      .from("assignment_rules")
      .update({ priority: 999 })
      .eq("id", reglaCasa)
      .select("id");
    assert.deepEqual(data, [], "RLS no debe dejarle cambiar una regla");
    assert.notEqual(columna(reglaCasa, "priority"), "999");
    await auth.auth.signOut();
  });

  await t.test(
    "Cambiar la plantilla de una regla cambia lo que se asignaría",
    async () => {
      // Es el paso 5 del camino 2 del plan de verificación, hasta donde llega
      // este slice: la asignación real la hace el slice 3, pero el criterio ya
      // es configurable y aquí se ve sin tocar una línea de código.
      const client = await signedInAs("admin");
      const antes = contenido((await simular(client)).html);
      assert.ok(antes.includes(`Plantilla ${marca} casa`));

      const result = await enviar(
        client,
        `/rules/${reglaCasa}`,
        ['name="name"'],
        {
          name: `Casa ${marca}`,
          priority: columna(reglaCasa, "priority"),
          templateId: plantillas.gym,
          goal: "general_health",
          level: "beginner",
          environment: "home",
          equipment: "none",
          equipmentMode: "any",
          ageMin: "18",
          ageMax: "60",
        },
      );
      assert.equal(result.response.status, 200, alerta(contenido(result.html)));
      assert.equal(columna(reglaCasa, "template_id"), plantillas.gym);

      const despues = contenido((await simular(client)).html);
      assert.match(despues, new RegExp(`Gana «Casa ${marca}»`));
      assert.ok(
        despues.includes(`Plantilla ${marca} gimnasio`),
        "El siguiente paciente con ese perfil recibiría la plantilla nueva",
      );
    },
  );
});
