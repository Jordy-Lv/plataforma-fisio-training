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
    assert.ok(
      [...body.keys()].some((key) => key.startsWith("$ACTION_")),
      "Falta el formulario de server action",
    );
    for (const [key, value] of Object.entries(values)) body.set(key, value);
    return request(route, { method: "POST", body });
  }
  return { request, submit, jar };
}

function expectRedirect(result, path) {
  const location =
    result.response.headers.get("location") ??
    result.html.match(
      /<meta[^>]*http-equiv="refresh"[^>]*content="[^;]*;url=([^"]+)"/,
    )?.[1];
  assert.ok(
    location,
    `Se esperaba redirección a ${path}, llegó ${result.response.status}: ${result.html.match(/role="alert"[^>]*>([^<]*)/)?.[1] ?? "sin alerta"}`,
  );
  assert.equal(new URL(decode(location), appUrl).pathname, path);
}

test(
  "Pantallas de sesión contra Next.js y Supabase local",
  { timeout: 120_000 },
  async (t) => {
    const password = `Test-${crypto.randomUUID()}!`;
    const people = {};
    const ids = [];
    t.after(() => {
      for (const id of ids) {
        assert.match(id, /^[a-f0-9-]{36}$/);
        sql(`delete from auth.users where id = '${id}'::uuid`);
      }
    });
    for (const role of ["patient", "professional", "admin", "inactive"]) {
      const email = `screens-${role}-${crypto.randomUUID()}@demo.local`;
      const auth = createClient(status.API_URL, status.ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const result = await auth.auth.signUp({ email, password });
      assert.equal(result.error, null);
      const id = result.data.user.id;
      assert.match(id, /^[a-f0-9-]{36}$/);
      ids.push(id);
      if (role === "professional")
        sql(
          `update public.profiles set role = 'professional', specialty = 'training' where id = '${id}'`,
        );
      if (role === "admin")
        sql(`update public.profiles set role = 'admin' where id = '${id}'`);
      if (role === "inactive")
        sql(`update public.profiles set is_active = false where id = '${id}'`);
      await auth.auth.signOut();
      people[role] = { email, id };
    }

    await t.test("Visitantes sin sesión regresan al acceso", async () => {
      for (const route of ["/admin", "/pro", "/patient"])
        expectRedirect(await httpClient().request(route), "/login");
    });
    await t.test(
      "Validación de servidor y mismo error para correo inexistente y clave incorrecta",
      async () => {
        const client = httpClient();
        const invalid = await client.submit("/login", {
          email: "incorrecto",
          password,
        });
        assert.ok(invalid.html.includes("Escribe un correo válido."));
        const wrong = await client.submit("/login", {
          email: people.patient.email,
          password: "incorrecta",
        });
        const unknown = await client.submit("/login", {
          email: `missing-${crypto.randomUUID()}@demo.local`,
          password,
        });
        const message =
          "No pudimos iniciar sesión. Revisa tu correo y contraseña.";
        assert.ok(wrong.html.includes(message));
        assert.ok(unknown.html.includes(message));
        assert.equal(client.jar.size, 0);
      },
    );
    await t.test(
      "Cada rol entra a su panel y no puede entrar al de otro",
      async () => {
        for (const [role, route] of [
          ["patient", "/patient"],
          ["professional", "/pro"],
          ["admin", "/admin"],
        ]) {
          const client = httpClient();
          expectRedirect(
            await client.submit("/login", {
              email: people[role].email,
              password,
            }),
            route,
          );
          assert.equal((await client.request(route)).response.status, 200);
          for (const other of ["/admin", "/pro", "/patient"].filter(
            (value) => value !== route,
          ))
            expectRedirect(await client.request(other), route);
          expectRedirect(await client.request("/login"), route);
          expectRedirect(await client.submit(route, {}), "/login");
          expectRedirect(await client.request(route), "/login");
          assert.equal(client.jar.size, 0);
        }
      },
    );
    await t.test(
      "Un perfil inactivo no conserva cookies de acceso a la aplicación",
      async () => {
        const client = httpClient();
        const result = await client.submit("/login", {
          email: people.inactive.email,
          password,
        });
        assert.ok(result.html.includes("No pudimos iniciar sesión."));
        assert.equal(client.jar.size, 0);
        expectRedirect(await client.request("/patient"), "/login");
      },
    );
    await t.test(
      "Un enlace inválido no habilita el cambio de contraseña",
      async () => {
        const client = httpClient();
        expectRedirect(
          await client.request("/auth/callback?code=invalid"),
          "/recuperar",
        );
        expectRedirect(
          await client.request("/actualizar-contrasena"),
          "/recuperar",
        );
      },
    );
    await t.test(
      "Recuperación por correo, cambio de contraseña y revocación del enlace",
      async () => {
        const client = httpClient();
        const email = people.patient.email;
        const recovery = await client.submit("/recuperar", { email });
        assert.ok(
          recovery.html.includes("Si el correo está registrado"),
          recovery.html.match(/role="alert"[^>]*>([^<]*)/)?.[1],
        );
        const mailUrl = status.INBUCKET_URL;
        assert.ok(localHosts.includes(new URL(mailUrl).hostname));
        let messages;
        for (let attempt = 0; attempt < 20; attempt++) {
          const response = await fetch(
            `${mailUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
          );
          messages = (await response.json()).messages;
          if (messages.length) break;
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        assert.ok(messages?.length, "No llegó el correo de recuperación");
        const mail = await (
          await fetch(`${mailUrl}/api/v1/message/${messages[0].ID}`)
        ).json();
        const link = decode(mail.HTML.match(/href="([^"]+)"/)[1]);
        assert.ok(localHosts.includes(new URL(link).hostname));
        const verified = await fetch(link, { redirect: "manual" });
        const callback = verified.headers.get("location");
        assert.equal(new URL(callback).pathname, "/auth/callback");
        expectRedirect(
          await client.request(callback),
          "/actualizar-contrasena",
        );
        const mismatch = await client.submit("/actualizar-contrasena", {
          password: "different-password",
          confirmPassword: "mismatch",
        });
        assert.ok(mismatch.html.includes("Las contraseñas deben coincidir."));
        const newPassword = `Changed-${crypto.randomUUID()}!`;
        expectRedirect(
          await client.submit("/actualizar-contrasena", {
            password: newPassword,
            confirmPassword: newPassword,
          }),
          "/login",
        );
        assert.equal(client.jar.size, 0);
        expectRedirect(await client.request(callback), "/recuperar");
        assert.ok(
          (await client.submit("/login", { email, password })).html.includes(
            "No pudimos iniciar sesión.",
          ),
        );
        expectRedirect(
          await client.submit("/login", { email, password: newPassword }),
          "/patient",
        );
        expectRedirect(await client.submit("/patient", {}), "/login");
      },
    );
  },
);
