/**
 * Verifica la siembra de plantillas de ejemplo: que crea las cuatro completas,
 * que reejecutarla no duplica nada y que aparecen en el panel tal como se
 * sembraron.
 *
 * Requiere Supabase local encendido, el catálogo sembrado
 * (`npm run seed:exercises`) y `npm run dev` en marcha.
 *
 * Uso:  npm run test:templates:seed
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { appUrl, decode, httpClient, sql, status } from "./helpers/auth-http.mjs";

const nombres = [
  "Fuerza en casa · principiante",
  "Hipertrofia en gimnasio · intermedio",
  "Rehabilitación de rodilla · fase inicial",
  "Rehabilitación lumbar · fase inicial",
];

const sembrar = () =>
  execFileSync("npm", ["run", "--silent", "seed:templates"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const enLista = (valores) => valores.map((valor) => `'${valor}'`).join(", ");

const contar = (consulta) => Number(sql(consulta).trim());

function locationOf(result) {
  const location =
    result.response.headers.get("location") ??
    result.html.match(
      /<meta[^>]*http-equiv="refresh"[^>]*content="[^;]*;url=([^"]+)"/,
    )?.[1];
  assert.ok(location, `Se esperaba una redirección, llegó ${result.response.status}`);
  return new URL(decode(location), appUrl).pathname;
}

test("Siembra de plantillas de ejemplo", { timeout: 180_000 }, async (t) => {
  const password = `Test-${crypto.randomUUID()}!`;
  const email = `seed-plantillas-${crypto.randomUUID()}@demo.local`;
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

  await t.test("Las cuatro plantillas quedan completas y activas", () => {
    sembrar();

    assert.equal(
      contar(
        `select count(*) from public.routine_templates where name in (${enLista(nombres)})`,
      ),
      4,
    );
    assert.equal(
      contar(
        `select count(*) from public.routine_templates
          where name in (${enLista(nombres)}) and is_active`,
      ),
      4,
      "Una plantilla de ejemplo nace lista para asignarse",
    );
    assert.equal(
      contar(
        `select count(*) from public.routine_templates t
          where t.name in (${enLista(nombres)})
            and not exists (select 1 from public.template_days d where d.template_id = t.id)`,
      ),
      0,
      "Ninguna se siembra sin días",
    );
    assert.equal(
      contar(
        `select count(*) from public.template_days d
          join public.routine_templates t on t.id = d.template_id
          where t.name in (${enLista(nombres)})
            and not exists (select 1 from public.template_items i where i.template_day_id = d.id)`,
      ),
      0,
      "Un día sin ejercicios dejaría la plantilla incompleta",
    );

    // Dos de entrenamiento y dos de rehabilitación, como pide el alcance.
    assert.equal(
      contar(
        `select count(*) from public.routine_templates
          where name in (${enLista(nombres)}) and kind = 'training'`,
      ),
      2,
    );
    assert.equal(
      contar(
        `select count(*) from public.routine_templates
          where name in (${enLista(nombres)}) and kind = 'physio'`,
      ),
      2,
    );
  });

  await t.test("Reejecutarla no duplica ni cambia lo sembrado", () => {
    const antes = contar("select count(*) from public.routine_templates");
    const itemsAntes = contar("select count(*) from public.template_items");

    const salida = sembrar();
    assert.match(salida, /0 creadas, 4 ya estaban/);

    assert.equal(contar("select count(*) from public.routine_templates"), antes);
    assert.equal(contar("select count(*) from public.template_items"), itemsAntes);
  });

  await t.test("Aparecen en el panel con su contenido en orden", async () => {
    const client = httpClient();
    const acceso = await client.submit("/login", { email, password });
    assert.equal(locationOf(acceso), "/admin");

    const { response, html } = await client.request("/templates");
    assert.equal(response.status, 200);
    for (const nombre of nombres)
      assert.ok(html.includes(nombre), `Falta «${nombre}» en el panel`);

    const id = sql(
      `select id from public.routine_templates where name = '${nombres[0]}'`,
    ).trim();
    const ficha = await client.request(`/templates/${id}`);
    assert.equal(ficha.response.status, 200);
    assert.ok(ficha.html.includes("Tren inferior"), "Falta el título del día 1");

    // El orden de la pantalla es el que se sembró en `position`.
    const orden = sql(
      `select e.name from public.template_items i
         join public.template_days d on d.id = i.template_day_id
         join public.exercises e on e.id = i.exercise_id
         join public.routine_templates t on t.id = d.template_id
        where t.name = '${nombres[0]}' and d.day_number = 1
        order by i.position`,
    )
      .trim()
      .split("\n");
    const posiciones = orden.map((nombre) => ficha.html.indexOf(nombre));
    assert.ok(
      posiciones.every((posicion, indice) =>
        indice === 0 ? posicion >= 0 : posicion > posiciones[indice - 1],
      ),
      "La ficha no respeta el orden sembrado",
    );
  });
});
