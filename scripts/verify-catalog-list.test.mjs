/**
 * Verifica el listado del catálogo de ejercicios contra la aplicación local:
 * quién entra, qué filtra la búsqueda y qué se muestra cuando no hay nada.
 *
 * Requiere Supabase local encendido, el catálogo sembrado
 * (`npm run seed:exercises`) y `npm run dev` en marcha.
 *
 * Uso:  npm run test:catalog
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const appUrl = process.env.FISIO_TEST_APP_URL ?? "http://localhost:3000";
const localHosts = ["localhost", "127.0.0.1", "::1"];
assert.ok(
  localHosts.includes(new URL(appUrl).hostname),
  "Estas pruebas solo admiten una app local.",
);
const status = JSON.parse(
  execFileSync("./node_modules/.bin/supabase", ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
assert.ok(localHosts.includes(new URL(status.API_URL).hostname));

const sql = (query) =>
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_plataforma-fisio-training",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-Atc",
      query,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

const decode = (text) =>
  text
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

function httpClient() {
  const jar = new Map();
  async function request(target, options = {}) {
    const response = await fetch(new URL(target, appUrl), {
      ...options,
      redirect: "manual",
      headers: {
        origin: appUrl,
        cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        ...options.headers,
      },
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const index = pair.indexOf("=");
      const name = pair.slice(0, index),
        value = pair.slice(index + 1);
      if (value) jar.set(name, value);
      else jar.delete(name);
    }
    return { response, html: await response.text() };
  }
  async function submit(route, values) {
    const { html, response } = await request(route);
    assert.equal(response.status, 200, `No abrió ${route}`);
    const body = new FormData();
    for (const match of html.matchAll(/<input\b[^>]*>/g)) {
      const attrs = Object.fromEntries(
        [...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [
          m[1],
          decode(m[2]),
        ]),
      );
      if (attrs.type === "hidden" && attrs.name)
        body.append(attrs.name, attrs.value ?? "");
    }
    for (const [key, value] of Object.entries(values)) body.set(key, value);
    return request(route, { method: "POST", body });
  }
  return { request, submit };
}

function locationOf(result) {
  const location =
    result.response.headers.get("location") ??
    result.html.match(
      /<meta[^>]*http-equiv="refresh"[^>]*content="[^;]*;url=([^"]+)"/,
    )?.[1];
  assert.ok(location, `Se esperaba una redirección, llegó ${result.response.status}`);
  return new URL(decode(location), appUrl).pathname;
}

/** Nombres de ejercicio que muestra la página, leídos de los encabezados de tarjeta. */
function cardNames(html) {
  return [
    ...html.matchAll(
      /<h2 class="text-base font-semibold leading-6">.*?<a[^>]*href="\/exercises\/[^"]+"[^>]*>([^<]*)<\/a>/gs,
    ),
  ].map((match) => decode(match[1]));
}

function totalShown(html) {
  const match = html.match(/(\d+) ejercicios? encontrados?/);
  assert.ok(match, "La página no informa cuántos ejercicios encontró");
  return Number(match[1]);
}

test("Listado del catálogo de ejercicios", { timeout: 120_000 }, async (t) => {
  const sembrados = Number(
    sql("select count(*) from public.exercises where is_custom = false").trim(),
  );
  assert.ok(
    sembrados > 500,
    `El catálogo debe estar sembrado; hay ${sembrados}. Ejecuta npm run seed:exercises.`,
  );

  const password = `Test-${crypto.randomUUID()}!`;
  const people = {};
  const ids = [];
  t.after(() => {
    for (const id of ids) {
      assert.match(id, /^[a-f0-9-]{36}$/);
      sql(`delete from auth.users where id = '${id}'::uuid`);
    }
  });

  for (const role of ["admin", "professional", "patient"]) {
    const email = `catalog-${role}-${crypto.randomUUID()}@demo.local`;
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
        `update public.profiles set role = 'professional', specialty = 'training' where id = '${id}'`,
      );
    await auth.auth.signOut();
    people[role] = { email, id };
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

  await t.test("Sin sesión el catálogo devuelve al acceso", async () => {
    assert.equal(
      locationOf(await httpClient().request("/exercises")),
      "/login",
    );
  });

  await t.test("El paciente no entra al catálogo del equipo", async () => {
    const client = await signedInAs("patient");
    // Codex encadena aquí el bloqueo por onboarding; lo que importa es que
    // el paciente no llega al catálogo del equipo.
    assert.match(locationOf(await client.request("/exercises")), /^\/patient/);
  });

  await t.test("Admin y profesional ven el catálogo completo", async () => {
    for (const role of ["admin", "professional"]) {
      const client = await signedInAs(role);
      const { response, html } = await client.request("/exercises");
      assert.equal(response.status, 200, `${role} no pudo abrir el catálogo`);
      assert.equal(totalShown(html), sembrados);
      assert.equal(cardNames(html).length, 24, "La primera página trae 24 tarjetas");
      assert.ok(
        html.includes('aria-label="Páginas del catálogo"') &&
          html.includes("Siguiente"),
        "Falta la paginación",
      );
    }
  });

  await t.test("La búsqueda por nombre acota el listado", async () => {
    const client = await signedInAs("admin");
    const { html } = await client.request("/exercises?q=sentadilla");
    const total = totalShown(html);
    assert.ok(total > 0 && total < sembrados, "La búsqueda en español no acotó nada");
    for (const name of cardNames(html)) assert.match(name.toLowerCase(), /sentadilla/);
    const { html: previousName } = await client.request("/exercises?q=squat");
    assert.equal(totalShown(previousName), 0, "No deben quedar nombres del catálogo en inglés");
  });

  await t.test("Los filtros de equipamiento y entorno acotan el listado", async () => {
    const client = await signedInAs("admin");
    const { html } = await client.request("/exercises?equipment=dumbbells");
    const conMancuernas = totalShown(html);
    assert.ok(conMancuernas > 0 && conMancuernas < sembrados);
    assert.equal(
      conMancuernas,
      Number(sql("select count(*) from public.exercises where equipment @> array['dumbbells']").trim()),
    );

    const enCasa = await client.request("/exercises?environment=home");
    assert.equal(
      totalShown(enCasa.html),
      Number(sql("select count(*) from public.exercises where environments @> array['home']").trim()),
    );

    const musculo = await client.request("/exercises?muscle=biceps");
    assert.equal(
      totalShown(musculo.html),
      Number(sql("select count(*) from public.exercises where muscle_groups @> array['biceps']").trim()),
    );
  });

  await t.test("Una combinación sin resultados explica qué hacer", async () => {
    const client = await signedInAs("admin");
    const { html } = await client.request(
      "/exercises?muscle=neck&equipment=machines&environment=home",
    );
    assert.equal(totalShown(html), 0);
    assert.ok(html.includes("Ningún ejercicio coincide con estos filtros"));
    assert.ok(html.includes("Ver todo el catálogo"));
  });

  await t.test("Un filtro inválido en la URL no rompe la pantalla", async () => {
    const client = await signedInAs("admin");
    const { response, html } = await client.request(
      "/exercises?muscle=inventado&equipment=&page=cero",
    );
    assert.equal(response.status, 200);
    assert.equal(totalShown(html), sembrados);
  });

  await t.test("La segunda página trae ejercicios distintos", async () => {
    const client = await signedInAs("admin");
    const primera = cardNames((await client.request("/exercises")).html);
    const segunda = cardNames((await client.request("/exercises?page=2")).html);
    assert.equal(segunda.length, 24);
    assert.equal(primera.filter((name) => segunda.includes(name)).length, 0);
  });
});
