import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const prefix = "qa-backend-20260906t154046-http";
const appUrl = "http://127.0.0.1:3107";
const env = Object.fromEntries(
  readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
assert.equal(env.FISIO_TEST_APP_URL, appUrl);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const users = [];
const results = [];
const password = "Qa-backend-http-20260906!";
const changedPassword = "Qa-backend-http-changed-20260906!";

function decode(text) {
  return text.replaceAll("&quot;", '"').replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function client() {
  const jar = new Map();
  async function request(path, init = {}) {
    const response = await fetch(new URL(path, appUrl), {
      ...init,
      redirect: "manual",
      headers: {
        ...(jar.size ? { cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; ") } : {}),
        ...init.headers,
      },
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const at = pair.indexOf("=");
      const name = pair.slice(0, at);
      const value = pair.slice(at + 1);
      if (value) jar.set(name, value);
      else jar.delete(name);
    }
    return { response, body: await response.text() };
  }
  async function form(path, marker) {
    const opened = await request(path);
    assert.equal(opened.response.status, 200, `open ${path}`);
    const source = [...opened.body.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
      .map((item) => item[0]).find((item) => item.includes(marker));
    assert.ok(source, `form ${marker} in ${path}`);
    const body = new FormData();
    for (const match of source.matchAll(/<input\b[^>]*>/g)) {
      const attrs = Object.fromEntries([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)]
        .map((item) => [item[1], decode(item[2])]));
      if (attrs.type === "hidden" && attrs.name) body.append(attrs.name, attrs.value ?? "");
    }
    const actionField = [...body.keys()].find((key) => key.startsWith("$ACTION_"));
    assert.ok(actionField, `server action id ${path}`);
    return { body, actionField };
  }
  return { request, form, jar };
}

function result(id, actual, evidence = {}) {
  results.push({ id, actual, evidence });
}

async function person(label, role = "patient") {
  const email = `${prefix}-${label}-${randomUUID()}@example.invalid`;
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null);
  users.push(created.data.user.id);
  const profile = await service.from("profiles").update({ role, specialty: null, is_active: true, full_name: `${prefix}-${label}` })
    .eq("id", created.data.user.id);
  assert.equal(profile.error, null);
  if (role === "patient") {
    const details = await service.from("patient_details").insert({
      profile_id: created.data.user.id,
      goal: "general_health",
      level: "beginner",
      environment: "home",
      equipment: ["none"],
      onboarding_step: 3,
    });
    assert.equal(details.error, null);
  }
  return { id: created.data.user.id, email };
}

try {
  const active = await person("active");
  const inactive = await person("inactive");

  const goodBrowser = client();
  const loginForm = await goodBrowser.form("/login", 'name="email"');
  result("HTTP-SA-01-build-specific-action-id", "resolved", {
    kind: loginForm.actionField.startsWith("$ACTION_ID_") ? "id" : "reference",
    length: loginForm.actionField.length,
  });
  loginForm.body.set("email", active.email);
  loginForm.body.set("password", password);
  const login = await goodBrowser.request("/login", {
    method: "POST",
    body: loginForm.body,
    headers: { origin: appUrl },
  });
  result("HTTP-AUTH-01-valid-login", login.response.status, {
    location: login.response.headers.get("location"),
    cookies: goodBrowser.jar.size,
  });
  const protectedPage = await goodBrowser.request("/patient");
  result("HTTP-AUTH-02-authenticated-page", protectedPage.response.status, {
    cacheControl: protectedPage.response.headers.get("cache-control"),
  });

  const evilBrowser = client();
  const evilForm = await evilBrowser.form("/login", 'name="email"');
  evilForm.body.set("email", active.email);
  evilForm.body.set("password", password);
  const crossOrigin = await evilBrowser.request("/login", {
    method: "POST",
    body: evilForm.body,
    headers: { origin: "http://qa-backend-cross-origin.invalid" },
  });
  result("HTTP-CSRF-01-cross-origin-server-action", crossOrigin.response.status, {
    sessionCookies: evilBrowser.jar.size,
  });

  const passwordForm = await goodBrowser.form("/actualizar-contrasena", 'name="password"');
  passwordForm.body.set("password", changedPassword);
  passwordForm.body.set("confirmPassword", changedPassword);
  const passwordChange = await goodBrowser.request("/actualizar-contrasena", {
    method: "POST",
    body: passwordForm.body,
    headers: { origin: appUrl },
  });
  const oldLogin = await createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options)
    .auth.signInWithPassword({ email: active.email, password });
  const newLogin = await createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options)
    .auth.signInWithPassword({ email: active.email, password: changedPassword });
  result("HTTP-AUTH-03-any-active-session-can-change-password", passwordChange.response.status, {
    location: passwordChange.response.headers.get("location"),
    oldPasswordAccepted: oldLogin.error === null,
    newPasswordAccepted: newLogin.error === null,
  });

  const inactiveBrowser = client();
  const inactiveForm = await inactiveBrowser.form("/login", 'name="email"');
  inactiveForm.body.set("email", inactive.email);
  inactiveForm.body.set("password", password);
  const inactiveLogin = await inactiveBrowser.request("/login", {
    method: "POST", body: inactiveForm.body, headers: { origin: appUrl },
  });
  assert.ok([303, 200].includes(inactiveLogin.response.status));
  await service.from("profiles").update({ is_active: false }).eq("id", inactive.id);
  const afterDeactivation = await inactiveBrowser.request("/patient");
  result("HTTP-AUTH-04-middleware-blocks-old-cookie-after-deactivation", afterDeactivation.response.status, {
    location: afterDeactivation.response.headers.get("location"),
    cacheControl: afterDeactivation.response.headers.get("cache-control"),
    remainingCookies: inactiveBrowser.jar.size,
  });

  async function cron(label, { method = "POST", authorization, xSecret, body } = {}) {
    const headers = {};
    if (authorization !== undefined) headers.authorization = authorization;
    if (xSecret !== undefined) headers["x-cron-secret"] = xSecret;
    if (body !== undefined) headers["content-type"] = "application/json";
    const response = await fetch(new URL("/api/cron/memberships", appUrl), {
      method,
      headers,
      body,
      redirect: "manual",
    });
    const raw = await response.text();
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch {}
    result(label, response.status, {
      noticeDays: parsed?.notice_days ?? null,
      errorClass: parsed?.error ? "reported" : null,
      cacheControl: response.headers.get("cache-control"),
    });
  }

  await cron("HTTP-CRON-01-GET-method-not-allowed", { method: "GET" });
  await cron("HTTP-CRON-02-no-secret");
  await cron("HTTP-CRON-03-wrong-secret", { authorization: "Bearer wrong" });
  await cron("HTTP-CRON-04-empty-secret", { xSecret: "" });
  await cron("HTTP-CRON-05-wrong-length", { xSecret: "x" });
  await cron("HTTP-CRON-06-bearer-wrong-overrides-correct-x-header", {
    authorization: "Bearer wrong",
    xSecret: env.CRON_SECRET,
  });
  await cron("HTTP-CRON-07-bearer-correct-overrides-wrong-x-header", {
    authorization: `Bearer ${env.CRON_SECRET}`,
    xSecret: "wrong",
    body: "{}",
  });
  await cron("HTTP-CRON-08-empty-body-uses-config", { xSecret: env.CRON_SECRET, body: "" });
  await cron("HTTP-CRON-09-invalid-json-uses-config", { xSecret: env.CRON_SECRET, body: "{" });
  await cron("HTTP-CRON-10-null-notice-days-uses-config", { xSecret: env.CRON_SECRET, body: '{"noticeDays":null}' });
  await cron("HTTP-CRON-11-string-notice-days-uses-config", { xSecret: env.CRON_SECRET, body: '{"noticeDays":"7"}' });
  await cron("HTTP-CRON-12-zero-notice-days", { xSecret: env.CRON_SECRET, body: '{"noticeDays":0}' });
  await cron("HTTP-CRON-13-negative-notice-days", { xSecret: env.CRON_SECRET, body: '{"noticeDays":-1}' });
  await cron("HTTP-CRON-14-decimal-notice-days", { xSecret: env.CRON_SECRET, body: '{"noticeDays":1.5}' });
  await cron("HTTP-CRON-15-large-notice-days", { xSecret: env.CRON_SECRET, body: '{"noticeDays":2147483647}' });

  console.log(JSON.stringify({
    runId: "20260906T154046",
    baseCommit: "3f2eeb591a8e3ded85bfdbb9c19fb21e31092126",
    appUrl,
    results,
  }, null, 2));
} finally {
  for (const id of [...users].reverse()) {
    const deleted = await service.auth.admin.deleteUser(id);
    if (deleted.error) throw new Error(`cleanup ${id}: ${deleted.error.message}`);
  }
}
