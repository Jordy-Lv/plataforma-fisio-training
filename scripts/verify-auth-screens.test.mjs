import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

import {
  localHosts,
  status,
  sql,
  decode,
  httpClient,
  expectRedirect,
} from "./helpers/auth-http.mjs";

async function recoveryCallback(client, email) {
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
  return callback;
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
      if (role === "patient")
        sql(
          `insert into public.patient_details(profile_id, goal, level, environment, equipment, onboarding_step) values('${id}', 'general_health', 'beginner', 'home', '{none}', 3)`,
        );
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
      "La baja cierra sesiones existentes y renovadas de los tres roles",
      async () => {
        for (const [role, route] of [
          ["patient", "/patient"],
          ["professional", "/pro"],
          ["admin", "/admin"],
        ]) {
          for (const expired of [false, true]) {
            const client = httpClient();
            expectRedirect(
              await client.submit("/login", {
                email: people[role].email,
                password,
              }),
              route,
            );
            const base = [...client.jar.keys()]
              .find((name) => name.includes("-auth-token"))
              .replace(/\.\d+$/, "");
            const value =
              client.jar.get(base) ??
              [...client.jar.entries()]
                .filter(([name]) => name.startsWith(`${base}.`))
                .sort(
                  ([a], [b]) =>
                    Number(a.split(".").at(-1)) - Number(b.split(".").at(-1)),
                )
                .map(([, chunk]) => chunk)
                .join("");
            const session = JSON.parse(
              Buffer.from(value.slice(7), "base64url").toString(),
            );
            if (expired) {
              session.expires_at = 1;
              client.jar.clear();
              client.jar.set(
                base,
                `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
              );
            }
            sql(
              `update public.profiles set is_active = false where id = '${people[role].id}'`,
            );
            try {
              const result = await client.request(route);
              expectRedirect(result, "/login");
              assert.match(
                result.response.headers.get("cache-control"),
                /no-store/,
              );
              assert.equal(client.jar.size, 0);
              assert.ok(!result.html.includes("Cerrar sesión"));
              const auth = createClient(status.API_URL, status.ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false },
              });
              const refreshed = await auth.auth.refreshSession({
                refresh_token: session.refresh_token,
              });
              assert.ok(refreshed.error);
              assert.equal(refreshed.data.session, null);
              expectRedirect(await client.request(route), "/login");
              assert.equal(
                (await client.request("/login?error=inactive")).response.status,
                200,
              );
            } finally {
              sql(
                `update public.profiles set is_active = true where id = '${people[role].id}'`,
              );
            }
          }
        }
      },
    );
    await t.test(
      "Una sesión dada de baja no puede enviar acciones pendientes",
      async () => {
        const client = httpClient();
        expectRedirect(
          await client.submit("/login", {
            email: people.professional.email,
            password,
          }),
          "/pro",
        );
        sql(
          `update public.profiles set is_active = false where id = '${people.professional.id}'`,
        );
        try {
          const result = await client.request("/recuperar", {
            method: "POST",
            body: new FormData(),
          });
          expectRedirect(result, "/login");
          assert.equal(result.response.status, 303);
          assert.equal(client.jar.size, 0);
        } finally {
          sql(
            `update public.profiles set is_active = true where id = '${people.professional.id}'`,
          );
        }
      },
    );
    await t.test(
      "El callback rechaza la recuperación de una persona inactiva",
      async () => {
        const client = httpClient();
        const callback = await recoveryCallback(
          client,
          people.professional.email,
        );
        sql(
          `update public.profiles set is_active = false where id = '${people.professional.id}'`,
        );
        try {
          const result = await client.request(callback);
          expectRedirect(result, "/login");
          assert.equal(client.jar.size, 0);
          expectRedirect(
            await client.request("/actualizar-contrasena"),
            "/recuperar",
          );
        } finally {
          sql(
            `update public.profiles set is_active = true where id = '${people.professional.id}'`,
          );
        }
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
        const callback = await recoveryCallback(client, email);
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
