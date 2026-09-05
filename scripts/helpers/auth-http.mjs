import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

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
  async function submit(route, values, marker = "") {
    const { html, response } = await request(route);
    assert.equal(response.status, 200, `No abrió ${route}`);
    const body = new FormData();
    const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
      .map((m) => m[0])
      .find((value) => value.includes(marker));
    assert.ok(form, `No se encontró el formulario ${marker} en ${route}`);
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
    for (const [key, value] of Object.entries(values)) {
      body.delete(key);
      for (const item of Array.isArray(value) ? value : [value])
        body.append(key, item);
    }
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

export { appUrl, localHosts, status, sql, decode, httpClient, expectRedirect };
