import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const prefix = "qa-backend-20260906t154046-mail";
const appUrl = "http://127.0.0.1:3107";
const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
  .split(/\r?\n/).filter(Boolean).map((line) => {
    const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1)];
  }));
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const users = [], plans = [];
const results = [];
const password = "Qa-backend-mail-20260906!";
const triggerName = "qa_backend_20260906t154046_fail_notified";
let triggerInstalled = false;

function sql(statement) {
  return execFileSync("docker", ["exec", "supabase_db_fisio-qa-backend-20260906t145640", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", statement], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
function record(id, expected, actual, evidence = {}) {
  results.push({ id, expected, actual, passed: expected === actual, evidence });
  assert.equal(actual, expected, id);
}
function dateAt(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
async function person(label, role, specialty = null) {
  const email = `${prefix}-${label}-${randomUUID()}@example.invalid`;
  const made = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(made.error, null);
  users.push(made.data.user.id);
  assert.equal((await service.from("profiles").update({ role, specialty, is_active: true, full_name: `${prefix}-${label}` }).eq("id", made.data.user.id)).error, null);
  const client = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
  assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
  return { id: made.data.user.id, email, client };
}
async function cron(body = "{}") {
  const response = await fetch(new URL("/api/cron/memberships", appUrl), {
    method: "POST",
    headers: { authorization: `Bearer ${env.CRON_SECRET}`, "content-type": "application/json" },
    body,
  });
  return { status: response.status, data: await response.json() };
}
async function mailCount(email) {
  const response = await fetch(`${env.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
  assert.equal(response.status, 200);
  const data = await response.json();
  return data.total ?? data.messages_count ?? data.messages?.length ?? 0;
}

try {
  const admin = await person("admin", "admin");
  const pro = await person("pro", "professional", "training");
  const outsider = await person("outsider", "professional", "physio");
  const patient = await person("patient", "patient");
  const patientB = await person("patient-b", "patient");
  for (const target of [patient, patientB]) {
    assert.equal((await service.from("patient_details").insert({
      profile_id: target.id, goal: "general_health", level: "beginner",
      environment: "home", equipment: ["none"], onboarding_step: 3,
    })).error, null);
  }
  assert.equal((await service.from("care_assignments").insert({ patient_id: patient.id, professional_id: pro.id, kind: "training" })).error, null);
  const planId = randomUUID(); plans.push(planId);
  assert.equal((await admin.client.from("plans").insert({ id: planId, name: `${prefix}-plan`, price: 100000 })).error, null);

  const deniedAnon = await anon.rpc("review_membership_expiry", { notice_days: 4 });
  const deniedPatient = await patient.client.rpc("review_membership_expiry", { notice_days: 4 });
  record("CTRL-MEMBERSHIP-01-anon-cannot-call-review-rpc", "denied", deniedAnon.error ? "denied" : "allowed");
  record("CTRL-MEMBERSHIP-02-authenticated-patient-cannot-call-review-rpc", "denied", deniedPatient.error ? "denied" : "allowed");

  const failingMembershipId = randomUUID();
  assert.equal((await admin.client.from("memberships").insert({
    id: failingMembershipId, patient_id: patient.id, plan_id: planId,
    started_on: dateAt(-20), expires_on: dateAt(3), amount: 100000, status: "active",
    notes: `${prefix}-injected-notified-at-failure`,
  })).error, null);

  sql(`
    create or replace function private.${triggerName}() returns trigger language plpgsql as $$
    begin
      if old.notified_at is null and new.notified_at is not null then
        raise exception 'qa injected notified_at failure';
      end if;
      return new;
    end $$;
    create trigger ${triggerName} before update of notified_at on public.membership_notices
      for each row execute function private.${triggerName}();
  `);
  triggerInstalled = true;
  const beforeMail = await mailCount(patient.email);
  const failedMarkRun = await cron();
  const afterMail = await mailCount(patient.email);
  const failingNotice = await service.from("membership_notices").select("id,notified_at").eq("membership_id", failingMembershipId).single();
  record("BACK-009-V1-route-reports-email-sent-when-notified-at-update-fails", "false-success", failedMarkRun.status === 200 && failedMarkRun.data.emailed === 1 && failedMarkRun.data.emailErrors.length === 0
    && afterMail === beforeMail + 1 && failingNotice.data.notified_at === null ? "false-success" : "detected", {
      routeStatus: failedMarkRun.status, emailed: failedMarkRun.data.emailed,
      emailErrors: failedMarkRun.data.emailErrors.length, mailDelta: afterMail - beforeMail,
      notifiedAt: failingNotice.data.notified_at,
    });
  const secondFailedRun = await cron();
  const secondMail = await mailCount(patient.email);
  record("BACK-009-V2-subsequent-review-does-not-retry-unmarked-delivery", "not-retried", secondFailedRun.status === 200 && secondFailedRun.data.emailed === 0
    && secondMail === afterMail && failingNotice.data.notified_at === null ? "not-retried" : "retried", {
      emailed: secondFailedRun.data.emailed, mailDelta: secondMail - afterMail,
    });

  sql(`drop trigger ${triggerName} on public.membership_notices; drop function private.${triggerName}();`);
  triggerInstalled = false;

  const normalIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  assert.equal((await admin.client.from("memberships").insert([
    { id: normalIds[0], patient_id: patient.id, plan_id: planId, started_on: dateAt(-30), expires_on: dateAt(0), amount: 100000, status: "active", notes: `${prefix}-today` },
    { id: normalIds[1], patient_id: patient.id, plan_id: planId, started_on: dateAt(-30), expires_on: dateAt(-1), amount: 100000, status: "active", notes: `${prefix}-expired` },
    { id: normalIds[2], patient_id: patient.id, plan_id: planId, started_on: dateAt(-30), expires_on: dateAt(2), amount: 100000, status: "active", notes: `${prefix}-soon` },
    { id: normalIds[3], patient_id: patient.id, plan_id: planId, started_on: dateAt(-30), expires_on: dateAt(1), amount: 100000, status: "cancelled", notes: `${prefix}-cancelled` },
  ])).error, null);
  const beforeNormalMail = await mailCount(patient.email);
  const normalRun = await cron();
  const states = await service.from("memberships").select("id,status").in("id", normalIds);
  const state = Object.fromEntries(states.data.map((item) => [item.id, item.status]));
  record("CTRL-MEMBERSHIP-03-today-is-expiring-soon", "expiring_soon", state[normalIds[0]]);
  record("CTRL-MEMBERSHIP-04-past-date-is-expired", "expired", state[normalIds[1]]);
  record("CTRL-MEMBERSHIP-05-within-window-is-expiring-soon", "expiring_soon", state[normalIds[2]]);
  record("CTRL-MEMBERSHIP-06-cancelled-is-ignored", "cancelled", state[normalIds[3]]);
  const notices = await service.from("membership_notices").select("id,membership_id,notified_at").in("membership_id", normalIds);
  record("CTRL-MEMBERSHIP-07-three-new-notices-created", 3, notices.data.length);
  record("CTRL-MEMBERSHIP-08-normal-mails-mark-notified-at", true, notices.data.every((item) => item.notified_at !== null));
  const afterNormalMail = await mailCount(patient.email);
  record("CTRL-MEMBERSHIP-09-three-normal-mails-delivered-locally", 3, afterNormalMail - beforeNormalMail);
  const proAlerts = await pro.client.from("alerts").select("id").eq("patient_id", patient.id).eq("type", "membership_expiring");
  const outsiderAlerts = await outsider.client.from("alerts").select("id").eq("patient_id", patient.id).eq("type", "membership_expiring");
  const adminAlerts = await admin.client.from("alerts").select("id").eq("patient_id", patient.id).eq("type", "membership_expiring");
  record("CTRL-MEMBERSHIP-10-assigned-professional-receives-alerts", true, proAlerts.data.length >= 3);
  record("CTRL-MEMBERSHIP-11-unassigned-professional-sees-none", 0, outsiderAlerts.data.length);
  record("CTRL-MEMBERSHIP-12-admin-receives-alerts", true, adminAlerts.data.length >= 3);
  const repeatBefore = await mailCount(patient.email);
  const repeat = await cron();
  const repeatAfter = await mailCount(patient.email);
  record("CTRL-MEMBERSHIP-13-repeat-is-idempotent", "no-new-delivery", repeat.data.emailed === 0 && repeatAfter === repeatBefore ? "no-new-delivery" : "duplicated");

  const ownershipBefore = await patient.client.from("membership_notices").select("id").eq("membership_id", normalIds[2]);
  assert.equal((await admin.client.from("memberships").update({ patient_id: patientB.id }).eq("id", normalIds[2])).error, null);
  const oldPatientNotice = await patient.client.from("membership_notices").select("id").eq("membership_id", normalIds[2]);
  const newPatientNotice = await patientB.client.from("membership_notices").select("id").eq("membership_id", normalIds[2]);
  record("OBS-MEMBERSHIP-01-reassignment-leaves-notice-with-old-patient", "old-only", ownershipBefore.data.length === 1 && oldPatientNotice.data.length === 1 && newPatientNotice.data.length === 0 ? "old-only" : "changed");

  console.log(JSON.stringify({ runId: "20260906T154046", normalRunStatus: normalRun.status, results }, null, 2));
} finally {
  if (triggerInstalled) {
    try { sql(`drop trigger if exists ${triggerName} on public.membership_notices; drop function if exists private.${triggerName}();`); } catch {}
  }
  await service.from("memberships").delete().in("patient_id", users);
  if (plans.length) await service.from("plans").delete().in("id", plans);
  for (const id of [...users].reverse()) {
    const deleted = await service.auth.admin.deleteUser(id);
    if (deleted.error) throw new Error(`cleanup user: ${deleted.error.message}`);
  }
}
