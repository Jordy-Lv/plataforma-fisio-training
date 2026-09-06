import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const runId = "20260906t154046";
const prefix = `qa-backend-${runId}`;
const env = Object.fromEntries(
  readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter(Boolean).map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, "http://127.0.0.1:55431");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const password = "Qa-backend-local-20260906!";
const users = [];
const results = [];

function record(id, expected, actual, evidence = {}) {
  const passed = expected === actual;
  results.push({ id, expected, actual, passed, evidence });
  assert.equal(actual, expected, `${id}: expected ${expected}, got ${actual}`);
}

async function login(email) {
  const client = anon();
  const result = await client.auth.signInWithPassword({ email, password });
  assert.equal(result.error, null, result.error?.message);
  return client;
}

async function createPerson(label, role, specialty = null) {
  const email = `${prefix}-auth-${label}-${randomUUID()}@example.invalid`;
  const result = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: `${prefix}-${label}` },
  });
  assert.equal(result.error, null, result.error?.message);
  users.push(result.data.user.id);
  const update = await service.from("profiles").update({ role, specialty, is_active: true })
    .eq("id", result.data.user.id);
  assert.equal(update.error, null, update.error?.message);
  return { id: result.data.user.id, email, client: await login(email) };
}

async function invitedSignup(email, token, metadata = {}) {
  const client = anon();
  const result = await client.auth.signUp({
    email, password,
    options: { data: { registration_token: token, ...metadata } },
  });
  if (result.data.user?.id) users.push(result.data.user.id);
  return { client, result };
}

async function cleanup() {
  await service.from("person_registrations").delete().like("email", `${prefix}-%`);
  for (const id of [...new Set(users)].reverse()) {
    const deleted = await service.auth.admin.deleteUser(id);
    if (deleted.error && !deleted.error.message.includes("not found")) throw deleted.error;
  }
}

try {
  const admin = await createPerson("admin", "admin");
  const pro = await createPerson("pro", "professional", "training");
  const patient = await createPerson("patient", "patient");

  const publicEmail = `${prefix}-auth-public-${randomUUID()}@example.invalid`;
  const publicSignup = await anon().auth.signUp({
    email: publicEmail, password,
    options: { data: { role: "admin", specialty: "physio", full_name: `${prefix}-public` } },
  });
  assert.equal(publicSignup.error, null, publicSignup.error?.message);
  users.push(publicSignup.data.user.id);
  const publicProfile = await service.from("profiles").select("role,specialty").eq("id", publicSignup.data.user.id).single();
  record("CTRL-AUTH-LIFE-01-public-metadata-cannot-self-assign-role", "patient/null",
    `${publicProfile.data?.role}/${publicProfile.data?.specialty}`);

  const proEmail = `${prefix}-auth-invited-pro-${randomUUID()}@example.invalid`;
  const preparedPro = await admin.client.rpc("prepare_person_registration", {
    person_email: proEmail, person_name: `${prefix} invited pro`, person_phone: "+570000000",
    person_role: "professional", person_specialty: "physio",
  });
  assert.equal(preparedPro.error, null, preparedPro.error?.message);
  const signedPro = await invitedSignup(proEmail, preparedPro.data, { role: "admin", specialty: "training" });
  assert.equal(signedPro.result.error, null, signedPro.result.error?.message);
  const invitedProProfile = await service.from("profiles").select("role,specialty").eq("id", signedPro.result.data.user.id).single();
  const consumed = await service.from("person_registrations").select("token").eq("token", preparedPro.data);
  record("CTRL-AUTH-LIFE-02-admin-invites-professional-with-server-role", "professional/physio/consumed",
    `${invitedProProfile.data?.role}/${invitedProProfile.data?.specialty}/${consumed.data.length ? "present" : "consumed"}`);

  const forbiddenPro = await pro.client.rpc("prepare_person_registration", {
    person_email: `${prefix}-auth-forbidden-pro-${randomUUID()}@example.invalid`,
    person_name: `${prefix} forbidden pro`, person_phone: null,
    person_role: "professional", person_specialty: "training",
  });
  record("CTRL-AUTH-LIFE-03-professional-cannot-invite-professional", "denied", forbiddenPro.error ? "denied" : "allowed");

  const patientEmail = `${prefix}-auth-invited-patient-${randomUUID()}@example.invalid`;
  const preparedPatient = await pro.client.rpc("prepare_person_registration", {
    person_email: patientEmail, person_name: `${prefix} invited patient`, person_phone: null,
    person_role: "patient", person_specialty: null,
  });
  assert.equal(preparedPatient.error, null, preparedPatient.error?.message);
  const signedPatient = await invitedSignup(patientEmail, preparedPatient.data);
  assert.equal(signedPatient.result.error, null, signedPatient.result.error?.message);
  const assignment = await service.from("care_assignments").select("kind,ended_at")
    .eq("patient_id", signedPatient.result.data.user.id).eq("professional_id", pro.id).single();
  record("CTRL-AUTH-LIFE-04-professional-invite-creates-patient-assignment", "training/active",
    `${assignment.data?.kind}/${assignment.data?.ended_at === null ? "active" : "ended"}`);

  const wrongEmail = `${prefix}-auth-wrong-${randomUUID()}@example.invalid`;
  const wrongTokenEmail = `${prefix}-auth-token-owner-${randomUUID()}@example.invalid`;
  const tokenForWrongEmail = await admin.client.rpc("prepare_person_registration", {
    person_email: wrongTokenEmail, person_name: `${prefix} owner`, person_phone: null,
    person_role: "patient", person_specialty: null,
  });
  assert.equal(tokenForWrongEmail.error, null, tokenForWrongEmail.error?.message);
  const wrongSignup = await invitedSignup(wrongEmail, tokenForWrongEmail.data);
  record("CTRL-AUTH-LIFE-05-token-is-bound-to-email", "denied", wrongSignup.result.error ? "denied" : "allowed");
  const wrongUser = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  record("CTRL-AUTH-LIFE-06-failed-token-signup-leaves-no-auth-user", false,
    wrongUser.data.users.some((u) => u.email === wrongEmail));

  const duplicate = await admin.client.rpc("prepare_person_registration", {
    person_email: patient.email.toUpperCase(), person_name: `${prefix} duplicate`, person_phone: null,
    person_role: "patient", person_specialty: null,
  });
  record("CTRL-AUTH-LIFE-07-existing-email-case-insensitive-is-denied", "denied", duplicate.error ? "denied" : "allowed");

  const cancellableEmail = `${prefix}-auth-cancel-${randomUUID()}@example.invalid`;
  const cancellable = await admin.client.rpc("prepare_person_registration", {
    person_email: cancellableEmail, person_name: `${prefix} cancel`, person_phone: null,
    person_role: "patient", person_specialty: null,
  });
  assert.equal(cancellable.error, null, cancellable.error?.message);
  await pro.client.rpc("cancel_person_registration", { registration_token: cancellable.data });
  const afterOutsiderCancel = await service.from("person_registrations").select("token").eq("token", cancellable.data);
  record("CTRL-AUTH-LIFE-08-noncreator-cannot-cancel-registration", "present", afterOutsiderCancel.data.length ? "present" : "missing");
  await admin.client.rpc("cancel_person_registration", { registration_token: cancellable.data });
  const afterCreatorCancel = await service.from("person_registrations").select("token").eq("token", cancellable.data);
  record("CTRL-AUTH-LIFE-09-creator-can-cancel-registration", "missing", afterCreatorCancel.data.length ? "present" : "missing");

  const staleDeactivate = await admin.client.rpc("deactivate_person", { person_id: pro.id, expected_assignments: 0 });
  record("CTRL-AUTH-LIFE-10-stale-assignment-count-blocks-deactivation", "denied", staleDeactivate.error ? "denied" : "allowed");
  const correctDeactivate = await admin.client.rpc("deactivate_person", { person_id: pro.id, expected_assignments: 1 });
  assert.equal(correctDeactivate.error, null, correctDeactivate.error?.message);
  const proState = await service.from("profiles").select("is_active").eq("id", pro.id).single();
  const linkState = await service.from("care_assignments").select("ended_at")
    .eq("professional_id", pro.id).eq("patient_id", signedPatient.result.data.user.id).single();
  record("CTRL-AUTH-LIFE-11-deactivation-closes-professional-assignments", "inactive/ended",
    `${proState.data?.is_active ? "active" : "inactive"}/${linkState.data?.ended_at ? "ended" : "active"}`);

  const crossFinish = await patient.client.rpc("finish_patient_onboarding", {
    patient_id: signedPatient.result.data.user.id, conditions: [],
  });
  record("CTRL-AUTH-LIFE-12-patient-cannot-finish-other-onboarding", "denied", crossFinish.error ? "denied" : "allowed");

  console.log(JSON.stringify({ runId, results }, null, 2));
} finally {
  await cleanup();
}
