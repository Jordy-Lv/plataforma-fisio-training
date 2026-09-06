import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const prefix = "qa-backend-20260906t154046";
const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
  .split(/\r?\n/).filter(Boolean).map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]));
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const email = `${prefix}-service-admin-${randomUUID()}@example.invalid`;
const password = "Qa-backend-local-20260906!";
let userId;
let serviceId;

try {
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null, created.error?.message);
  userId = created.data.user.id;
  const promoted = await service.from("profiles").update({ role: "admin", is_active: true }).eq("id", userId);
  assert.equal(promoted.error, null, promoted.error?.message);
  const login = await client.auth.signInWithPassword({ email, password });
  assert.equal(login.error, null, login.error?.message);

  serviceId = randomUUID();
  const withPrice = await client.from("services").insert({
    id: serviceId, name: `${prefix}-priced-service`, description: "fixture",
    category: "nutrition", is_active: true, price: 45000,
  });
  const persisted = await service.from("services").select("id").eq("id", serviceId);
  const withoutPrice = await client.from("services").insert({
    id: serviceId, name: `${prefix}-unpriced-service`, description: "fixture",
    category: "nutrition", is_active: true,
  });
  assert.equal(withoutPrice.error, null, withoutPrice.error?.message);
  console.log(JSON.stringify({
    runId: "20260906t154046",
    results: [{
      id: "BACK-011-V1-admin-cannot-define-required-service-price",
      expected: "price-rejected-and-unpriced-accepted",
      actual: withPrice.error && persisted.data.length === 0 && !withoutPrice.error
        ? "price-rejected-and-unpriced-accepted" : "unexpected",
      passed: Boolean(withPrice.error && persisted.data.length === 0 && !withoutPrice.error),
      evidence: { pricedInsertCode: withPrice.error?.code ?? null, persistedAfterPricedInsert: persisted.data.length },
    }],
  }, null, 2));
} finally {
  if (serviceId) await service.from("services").delete().eq("id", serviceId);
  if (userId) await service.auth.admin.deleteUser(userId);
}
