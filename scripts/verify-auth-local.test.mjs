import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServerClient } from "@supabase/ssr";

const root = fileURLToPath(new URL("../", import.meta.url));

test("Autenticación y cookies SSR contra Supabase local", { timeout: 120_000 }, async (t) => {
  const status = JSON.parse(execFileSync(path.join(root, "node_modules/.bin/supabase"), ["status", "--output", "json"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }));
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname));

  const fixture = await mkdtemp(path.join(tmpdir(), "fisio-auth-test-"));
  let server;
  let userId;
  let output = "";

  t.after(async () => {
    if (server && server.exitCode === null) {
      const stopped = once(server, "exit");
      server.kill("SIGTERM");
      await stopped;
    }
    await rm(fixture, { recursive: true, force: true });
    if (userId) {
      assert.match(userId, /^[0-9a-f-]{36}$/);
      execFileSync("docker", [
        "exec", "supabase_db_plataforma-fisio-training", "psql", "-U", "postgres", "-d", "postgres",
        "-v", "ON_ERROR_STOP=1", "-c", `delete from auth.users where id = '${userId}'::uuid`,
      ], { stdio: "pipe" });
    }
  });

  await mkdir(path.join(fixture, "app"));
  await cp(path.join(root, "lib/supabase"), path.join(fixture, "lib/supabase"), { recursive: true });
  await cp(path.join(root, "middleware.ts"), path.join(fixture, "middleware.ts"));
  await cp(path.join(root, "tsconfig.json"), path.join(fixture, "tsconfig.json"));
  await symlink(path.join(root, "node_modules"), path.join(fixture, "node_modules"), "dir");
  await writeFile(path.join(fixture, "package.json"), JSON.stringify({ private: true }));
  await writeFile(path.join(fixture, "next.config.mjs"), `export default { outputFileTracingRoot: ${JSON.stringify(root)} };`);
  await writeFile(path.join(fixture, "app/layout.tsx"), "export default function Layout({ children }: { children: React.ReactNode }) { return <html lang='es'><body>{children}</body></html>; }");
  await writeFile(path.join(fixture, "app/page.tsx"), `
    import { createClient } from '@/lib/supabase/server';
    export const dynamic = 'force-dynamic';
    export default async function Page() {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      return <main data-user={user?.id ?? 'anonymous'}>Prueba de sesión</main>;
    }
  `);

  server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", fixture, "--hostname", "127.0.0.1", "--port", "0"], {
    cwd: fixture,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_SUPABASE_URL: status.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { output += chunk.toString(); });
  server.stderr.on("data", (chunk) => { output += chunk.toString(); });
  let appUrl;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    appUrl = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if (appUrl && output.includes("Ready")) break;
    assert.equal(server.exitCode, null, output);
    await setTimeout(200);
  }
  assert.ok(appUrl, `No arrancó el servidor de prueba: ${output}`);

  const jar = new Map();
  const auth = createServerClient(status.API_URL, status.ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => value ? jar.set(name, value) : jar.delete(name)),
    },
  });
  const email = `auth-check-${crypto.randomUUID()}@demo.local`;
  const password = `Test-${crypto.randomUUID()}!`;
  let session;

  async function loadPage(cookies = jar) {
    const cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    const response = await fetch(appUrl, { headers: { cookie } });
    const html = await response.text();
    assert.equal(response.status, 200, output);
    for (const entry of response.headers.getSetCookie()) {
      const pair = entry.split(";")[0];
      const equals = pair.indexOf("=");
      const name = pair.slice(0, equals);
      const value = pair.slice(equals + 1);
      if (value) cookies.set(name, value);
      else cookies.delete(name);
    }
    return { response, html };
  }

  await t.test("Una visita anónima no obtiene identidad ni cookies de sesión", async () => {
    const { response, html } = await loadPage();
    assert.match(html, /data-user="anonymous"/);
    assert.equal(response.headers.getSetCookie().length, 0);
  });

  await t.test("Registro e inicio de sesión con correo y contraseña", async () => {
    const registered = await auth.auth.signUp({ email, password });
    assert.equal(registered.error, null);
    userId = registered.data.user?.id;
    assert.ok(userId);
    assert.equal((await auth.auth.signOut()).error, null);
    const signedIn = await auth.auth.signInWithPassword({ email, password });
    assert.equal(signedIn.error, null);
    session = signedIn.data.session;
    assert.ok(session);
    assert.ok(jar.size);
  });

  await t.test("El componente de servidor reconoce al usuario tras dos recargas", async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { html } = await loadPage();
      assert.ok(html.includes(`data-user="${userId}"`));
    }
  });

  await t.test("Una sesión próxima a vencer se renueva y conserva cookies y cabeceras privadas", async () => {
    const cookieName = [...jar.keys()].find((name) => name.endsWith("-auth-token") || name.endsWith("-auth-token.0")).replace(/\.0$/, "");
    const expired = { ...session, expires_at: Math.floor(Date.now() / 1000) - 1 };
    const cookieValue = `base64-${Buffer.from(JSON.stringify(expired)).toString("base64url")}`;
    jar.clear();
    jar.set(cookieName, cookieValue);
    const { response, html } = await loadPage();
    assert.ok(html.includes(`data-user="${userId}"`));
    assert.ok(response.headers.getSetCookie().length > 0);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.notEqual(jar.get(cookieName), cookieValue);
    assert.ok((await loadPage()).html.includes(`data-user="${userId}"`));
  });

  await t.test("Una cookie manipulada no permite suplantar a un usuario", async () => {
    const cookieName = [...jar.keys()][0].replace(/\.\d+$/, "");
    const parts = session.access_token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    payload.sub = crypto.randomUUID();
    parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const forged = { ...session, access_token: parts.join("."), refresh_token: "invalid-token" };
    const fakeJar = new Map([[cookieName, `base64-${Buffer.from(JSON.stringify(forged)).toString("base64url")}`]]);
    assert.match((await loadPage(fakeJar)).html, /data-user="anonymous"/);
  });

  await t.test("Una sesión sin credenciales válidas se limpia y permanece anónima", async () => {
    const cookieName = [...jar.keys()][0].replace(/\.\d+$/, "");
    const invalid = { ...session, expires_at: 1, refresh_token: "invalid-token" };
    const invalidJar = new Map([[cookieName, `base64-${Buffer.from(JSON.stringify(invalid)).toString("base64url")}`]]);
    const { response, html } = await loadPage(invalidJar);
    assert.match(html, /data-user="anonymous"/);
    assert.ok(response.headers.getSetCookie().length > 0);
    assert.equal(invalidJar.size, 0);
    assert.match((await loadPage(invalidJar)).html, /data-user="anonymous"/);
  });
});
