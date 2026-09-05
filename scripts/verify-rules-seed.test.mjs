/**
 * Verifica la siembra de reglas de ejemplo: que crea las seis, que
 * reejecutarla no duplica nada, y que entre todas cubren los perfiles
 * frecuentes —lo que se comprueba con el propio simulador, que es la
 * herramienta con la que el equipo las revisará en la demostración.
 *
 * Requiere Supabase local encendido, el catálogo y las plantillas sembrados
 * (`npm run seed:exercises` y `npm run seed:templates`) y `npm run dev` en
 * marcha.
 *
 * Uso:  npm run test:rules:seed
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { httpClient, sql, status } from "./helpers/auth-http.mjs";

const REGLAS = [
  { name: "Rehabilitación de rodilla", priority: 10 },
  { name: "Rehabilitación lumbar", priority: 20 },
  { name: "Principiante en casa sin equipo", priority: 30 },
  { name: "Ganar músculo en gimnasio", priority: 40 },
  { name: "Entrenamiento en casa", priority: 50 },
  { name: "Acondicionamiento general", priority: 99 },
];

const sembrar = () =>
  execFileSync("npm", ["run", "--silent", "seed:rules"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const enLista = (valores) => valores.map((valor) => `'${valor}'`).join(", ");

const contar = (consulta) => Number(sql(consulta).trim());

/** Igual que en las demás pruebas de pantalla: el contenido llega en streaming. */
const contenido = (html) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replaceAll('\\"', '"')
    .replaceAll("\\n", "\n")
    .replace(/\\u([0-9a-f]{4})/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    );

/** Los perfiles que el equipo espera cubrir el primer día. */
const PERFILES = [
  {
    caso: "rehabilitación con la rodilla lesionada",
    query: "goal=rehab&level=beginner&environment=home&equipment=none&conditions=knee",
    gana: "Rehabilitación de rodilla",
  },
  {
    caso: "rehabilitación con lumbalgia",
    query:
      "goal=rehab&level=beginner&environment=home&equipment=none&conditions=lower_back",
    gana: "Rehabilitación lumbar",
  },
  {
    caso: "principiante en casa sin equipo",
    query: "goal=general_health&level=beginner&environment=home&equipment=none",
    gana: "Principiante en casa sin equipo",
  },
  {
    caso: "hipertrofia en gimnasio",
    query: "goal=gain_muscle&level=intermediate&environment=gym&equipment=machines",
    gana: "Ganar músculo en gimnasio",
  },
  {
    caso: "quien entrena en casa con mancuernas",
    query: "goal=lose_weight&level=intermediate&environment=home&equipment=dumbbells",
    gana: "Entrenamiento en casa",
  },
  {
    caso: "un perfil que no encaja en ninguna regla concreta",
    query: "goal=performance&level=advanced&environment=gym&equipment=barbell",
    gana: "Acondicionamiento general",
  },
];

test("Siembra de reglas de ejemplo", { timeout: 180_000 }, async (t) => {
  const password = `Test-${crypto.randomUUID()}!`;
  const email = `seed-reglas-${crypto.randomUUID()}@demo.local`;
  const auth = createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const alta = await auth.auth.signUp({ email, password });
  assert.equal(alta.error, null);
  const adminId = alta.data.user.id;
  assert.match(adminId, /^[a-f0-9-]{36}$/);
  sql(`update public.profiles set role = 'admin' where id = '${adminId}'`);
  await auth.auth.signOut();

  t.after(() => {
    sql(`delete from auth.users where id = '${adminId}'::uuid`);
  });

  const nombres = REGLAS.map((regla) => regla.name);

  await t.test("Siembra las seis reglas activas", () => {
    sembrar();
    assert.equal(
      contar(
        `select count(*) from public.assignment_rules where name in (${enLista(nombres)})`,
      ),
      REGLAS.length,
    );
    assert.equal(
      contar(
        `select count(*) from public.assignment_rules where is_active and name in (${enLista(nombres)})`,
      ),
      REGLAS.length,
      "Las reglas de ejemplo se siembran listas para asignar",
    );

    // El orden es parte del criterio: rehabilitación antes que cualquier
    // objetivo estético, y la genérica la última.
    const orden = sql(
      `select name from public.assignment_rules
        where name in (${enLista(nombres)}) order by priority, created_at`,
    )
      .trim()
      .split("\n");
    assert.deepEqual(orden, nombres);

    // Y todas apuntan a una plantilla activa: una regla sin destino no asigna.
    assert.equal(
      contar(
        `select count(*) from public.assignment_rules r
           join public.routine_templates t on t.id = r.template_id
          where r.name in (${enLista(nombres)}) and t.is_active`,
      ),
      REGLAS.length,
    );
  });

  await t.test("Reejecutarla no duplica ni pisa nada", () => {
    sql(
      `update public.assignment_rules set priority = 5
        where name = 'Acondicionamiento general'`,
    );
    const salida = sembrar();
    assert.match(salida, /ya existe, se deja como está/);
    assert.equal(
      contar(
        `select count(*) from public.assignment_rules where name in (${enLista(nombres)})`,
      ),
      REGLAS.length,
    );
    assert.equal(
      sql(
        `select priority from public.assignment_rules where name = 'Acondicionamiento general'`,
      ).trim(),
      "5",
      "Lo que el equipo cambió se respeta",
    );
    sql(
      `update public.assignment_rules set priority = 99
        where name = 'Acondicionamiento general'`,
    );
  });

  await t.test("Cubren los perfiles frecuentes", async () => {
    const client = httpClient();
    await client.submit("/login", { email, password });

    for (const perfil of PERFILES) {
      const { html } = await client.request(
        `/rules/simulador?simular=1&age=35&${perfil.query}`,
      );
      const texto = contenido(html);
      assert.match(
        texto,
        new RegExp(`Gana «${perfil.gana}»`),
        `El perfil de ${perfil.caso} debería resolverlo «${perfil.gana}»`,
      );
      assert.ok(
        !texto.includes("Ninguna regla coincide"),
        `El perfil de ${perfil.caso} se quedó sin rutina`,
      );
    }
  });
});
