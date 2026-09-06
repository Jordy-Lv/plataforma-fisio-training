import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const runId = "20260906t154046";
const prefix = `qa-backend-${runId}`;
const env = Object.fromEntries(
  readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);

assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, "http://127.0.0.1:55431");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  options,
);

const created = {
  users: [],
  exercises: [],
  templates: [],
  plans: [],
  alerts: [],
};
const results = [];
const password = "Qa-backend-local-20260906!";

function record(id, expected, actual, evidence = {}) {
  const passed = expected === actual;
  results.push({ id, expected, actual, passed, evidence });
  assert.equal(actual, expected, `${id}: expected ${expected}, got ${actual}`);
}

async function createPerson(label, role, specialty = null) {
  const email = `${prefix}-${label}-${randomUUID()}@example.invalid`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${prefix}-${label}` },
  });
  assert.equal(error, null, `fixture ${label}: ${error?.message}`);
  created.users.push(data.user.id);
  const update = await service
    .from("profiles")
    .update({ role, specialty, full_name: `${prefix}-${label}`, is_active: true })
    .eq("id", data.user.id)
    .select("id")
    .single();
  assert.equal(update.error, null, `profile ${label}: ${update.error?.message}`);
  if (role === "patient") {
    const details = await service.from("patient_details").insert({
      profile_id: data.user.id,
      goal: "rehab",
      level: "beginner",
      environment: "home",
      equipment: ["bands"],
      birth_date: "1990-01-01",
      onboarding_step: 3,
    });
    assert.equal(details.error, null, `details ${label}: ${details.error?.message}`);
  }
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
  const login = await client.auth.signInWithPassword({ email, password });
  assert.equal(login.error, null, `login ${label}: ${login.error?.message}`);
  return { id: data.user.id, email, client };
}

async function exactDelete(table, ids) {
  if (!ids.length) return;
  const { error } = await service.from(table).delete().in("id", ids);
  if (error) throw new Error(`cleanup ${table}: ${error.message}`);
}

async function cleanup() {
  await exactDelete("alerts", created.alerts);
  await service.from("routine_assignment_events").delete().in("patient_id", created.users);
  await service.from("membership_notices").delete().in("patient_id", created.users);
  await service.from("memberships").delete().in("patient_id", created.users);
  await service.from("attendance").delete().in("patient_id", created.users);
  await service.from("screenings").delete().in("patient_id", created.users);
  await service.from("routines").delete().in("patient_id", created.users);
  await service.from("assignment_rules").delete().in("template_id", created.templates);
  await exactDelete("routine_templates", created.templates);
  await exactDelete("plans", created.plans);
  await exactDelete("exercises", created.exercises);
  for (const id of [...created.users].reverse()) {
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) throw new Error(`cleanup auth user ${id}: ${error.message}`);
  }
}

try {
  const admin = await createPerson("admin", "admin");
  const pro = await createPerson("pro-training", "professional", "training");
  const physio = await createPerson("pro-physio", "professional", "physio");
  const outsider = await createPerson("pro-outsider", "professional", "training");
  const endedPro = await createPerson("pro-ended", "professional", "training");
  const inactivePro = await createPerson("pro-inactive", "professional", "training");
  const patientA = await createPerson("patient-a", "patient");
  const patientB = await createPerson("patient-b", "patient");
  const patientIncomplete = await createPerson("patient-incomplete", "patient");
  const inactivePatient = await createPerson("patient-inactive", "patient");

  await service.from("patient_details").update({ onboarding_step: 1, environment: null, equipment: [] })
    .eq("profile_id", patientIncomplete.id);
  const assignments = await service.from("care_assignments").insert([
    { patient_id: patientA.id, professional_id: pro.id, kind: "training" },
    { patient_id: patientA.id, professional_id: physio.id, kind: "physio" },
    { patient_id: patientA.id, professional_id: endedPro.id, kind: "training", ended_at: "2026-09-05T12:00:00Z" },
  ]);
  assert.equal(assignments.error, null, assignments.error?.message);

  const own = await patientA.client.from("profiles").select("id").eq("id", patientA.id);
  record("CTRL-RLS-01-active-patient-reads-own-profile", "allowed", own.error === null && own.data.length === 1 ? "allowed" : "denied");
  const assigned = await pro.client.from("profiles").select("id").eq("id", patientA.id);
  record("CTRL-RLS-02-assigned-professional-reads-patient", "allowed", assigned.error === null && assigned.data.length === 1 ? "allowed" : "denied");
  const crossPatient = await patientA.client.from("patient_details").select("profile_id").eq("profile_id", patientB.id);
  record("CTRL-RLS-03-patient-cannot-read-other-patient", "denied", crossPatient.error || crossPatient.data.length ? "allowed" : "denied");
  const outsiderRead = await outsider.client.from("profiles").select("id").eq("id", patientA.id);
  record("CTRL-RLS-04-unassigned-professional-cannot-read-patient", "denied", outsiderRead.error || outsiderRead.data.length ? "allowed" : "denied");
  const endedRead = await endedPro.client.from("profiles").select("id").eq("id", patientA.id);
  record("CTRL-RLS-05-ended-assignment-cannot-read-patient", "denied", endedRead.error || endedRead.data.length ? "allowed" : "denied");
  const directAssignment = await outsider.client.from("care_assignments").insert({
    patient_id: patientB.id,
    professional_id: outsider.id,
    kind: "training",
  });
  record("CTRL-RLS-06-professional-cannot-appropriate-patient", "denied", directAssignment.error ? "denied" : "allowed");

  const metadata = await patientB.client.auth.updateUser({ data: { role: "admin", specialty: "physio" } });
  assert.equal(metadata.error, null);
  const roleResult = await patientB.client.rpc("current_role");
  const adminResult = await patientB.client.rpc("is_admin");
  record("CTRL-AUTH-01-editable-metadata-does-not-change-role", "patient", roleResult.data);
  record("CTRL-AUTH-02-editable-metadata-does-not-grant-admin", false, adminResult.data);

  const planId = randomUUID();
  created.plans.push(planId);
  const planCreate = await admin.client.from("plans").insert({ id: planId, name: `${prefix}-plan`, price: 100000 });
  record("CTRL-RLS-07-admin-can-create-plan", "allowed", planCreate.error ? "denied" : "allowed");
  const patientPlan = await patientB.client.from("plans").insert({ name: `${prefix}-forbidden`, price: 1 });
  record("CTRL-RLS-08-patient-cannot-create-plan", "denied", patientPlan.error ? "denied" : "allowed");

  await service.from("profiles").update({ is_active: false }).eq("id", inactivePatient.id);
  const inactiveOwnRead = await inactivePatient.client.from("profiles").select("id,is_active").eq("id", inactivePatient.id);
  record("BACK-001-V1-inactive-patient-old-token-reads-profile", "allowed", inactiveOwnRead.error === null && inactiveOwnRead.data.length === 1 ? "allowed" : "denied", { rows: inactiveOwnRead.data?.length ?? null });
  const inactiveHealthRead = await inactivePatient.client.from("patient_details").select("profile_id,goal").eq("profile_id", inactivePatient.id);
  record("BACK-001-V2-inactive-patient-old-token-reads-health-profile", "allowed", inactiveHealthRead.error === null && inactiveHealthRead.data.length === 1 ? "allowed" : "denied", { rows: inactiveHealthRead.data?.length ?? null });
  const changedName = `${prefix}-changed-after-deactivation`;
  const inactiveUpdate = await inactivePatient.client.from("profiles").update({ full_name: changedName }).eq("id", inactivePatient.id).select("full_name").single();
  const persistedInactiveName = await service.from("profiles").select("full_name").eq("id", inactivePatient.id).single();
  record("BACK-001-V3-inactive-patient-old-token-updates-profile", "persisted", !inactiveUpdate.error && persistedInactiveName.data?.full_name === changedName ? "persisted" : "rejected");

  await service.from("profiles").update({ is_active: false }).eq("id", inactivePro.id);
  const inactiveExerciseId = randomUUID();
  created.exercises.push(inactiveExerciseId);
  const inactiveProInsert = await inactivePro.client.from("exercises").insert({
    id: inactiveExerciseId,
    name: `${prefix}-inactive-pro-write`,
    description: "fixture",
    media_url: "https://example.invalid/fixture.png",
    environments: ["home"],
    is_custom: true,
  });
  const persistedInactiveExercise = await service.from("exercises").select("id").eq("id", inactiveExerciseId);
  record("BACK-001-V4-inactive-professional-old-token-writes-catalog", "persisted", !inactiveProInsert.error && persistedInactiveExercise.data.length === 1 ? "persisted" : "rejected");

  const exerciseIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  created.exercises.push(...exerciseIds);
  const exerciseRows = exerciseIds.map((id, index) => ({
    id,
    name: `${prefix}-exercise-${index}`,
    description: "fixture",
    media_url: "https://example.invalid/fixture.png",
    contraindications: index === 0 ? ["knee"] : [],
    environments: ["home", "gym"],
    is_custom: true,
  }));
  assert.equal((await service.from("exercises").insert(exerciseRows)).error, null);
  assert.equal((await service.from("patient_conditions").insert({
    patient_id: patientA.id,
    body_part: "knee",
    severity: "moderate",
    notes: `${prefix}-condition`,
  })).error, null);

  async function createTemplate(label, exerciseOrder) {
    const templateId = randomUUID();
    const dayId = randomUUID();
    created.templates.push(templateId);
    assert.equal((await service.from("routine_templates").insert({
      id: templateId,
      name: `${prefix}-${label}`,
      kind: "training",
      goal: "rehab",
      level: "beginner",
      environment: label === "nonmatching" ? "gym" : "home",
      days_per_week: 1,
      is_active: true,
    })).error, null);
    assert.equal((await service.from("template_days").insert({ id: dayId, template_id: templateId, day_number: 1 })).error, null);
    assert.equal((await service.from("template_items").insert(exerciseOrder.map((exerciseId, index) => ({
      template_day_id: dayId,
      exercise_id: exerciseId,
      position: index + 1,
      sets: 3,
      reps: 10,
    })))).error, null);
    return templateId;
  }

  const matchingTemplate = await createTemplate("matching", exerciseIds.slice(1));
  const nonmatchingTemplate = await createTemplate("nonmatching", exerciseIds);
  const matchingRule = randomUUID();
  const nonmatchingRule = randomUUID();
  assert.equal((await service.from("assignment_rules").insert([
    { id: matchingRule, name: `${prefix}-matching-rule`, priority: 10, conditions: { goal: ["rehab"], environment: ["home"] }, template_id: matchingTemplate, is_active: true },
    { id: nonmatchingRule, name: `${prefix}-nonmatching-rule`, priority: 20, conditions: { environment: ["gym"] }, template_id: nonmatchingTemplate, is_active: true },
  ])).error, null);

  const context = await pro.client.rpc("routine_assignment_context", { target_patient: patientA.id });
  record("CTRL-RPC-01-assigned-professional-gets-assignment-context", "allowed", context.error ? "denied" : "allowed");
  const normalCommit = await pro.client.rpc("commit_routine_assignment", {
    target_patient: patientA.id,
    expected_context: context.data,
    selected_rule: matchingRule,
    excluded_exercises: [],
    assignment_notes: `${prefix}-normal`,
  });
  record("CTRL-RPC-02-matching-winning-rule-commits", "assigned", normalCommit.data?.outcome ?? `error:${normalCommit.error?.code}`);

  const forgedCommit = await pro.client.rpc("commit_routine_assignment", {
    target_patient: patientA.id,
    expected_context: context.data,
    selected_rule: nonmatchingRule,
    excluded_exercises: [exerciseIds[0]],
    assignment_notes: `${prefix}-forged-nonmatch`,
  });
  const forgedRoutine = forgedCommit.data?.routine_id
    ? await service.from("routines").select("source_template_id,status").eq("id", forgedCommit.data.routine_id).single()
    : { data: null };
  record("BACK-002-V1-nonmatching-rule-is-accepted-by-commit-rpc", "persisted", !forgedCommit.error && forgedRoutine.data?.source_template_id === nonmatchingTemplate ? "persisted" : "rejected", { outcome: forgedCommit.data?.outcome ?? null });

  const forgedNoMatch = await pro.client.rpc("commit_routine_assignment", {
    target_patient: patientA.id,
    expected_context: context.data,
    selected_rule: null,
    excluded_exercises: [],
    assignment_notes: `${prefix}-forged-no-match`,
  });
  const noMatchEvents = await service.from("routine_assignment_events").select("id").eq("patient_id", patientA.id).eq("outcome", "no_match");
  record("BACK-002-V2-null-rule-is-accepted-while-rule-matches", "persisted", !forgedNoMatch.error && noMatchEvents.data.length === 1 ? "persisted" : "rejected", { outcome: forgedNoMatch.data?.outcome ?? null });

  const directCopy = await pro.client.rpc("copy_routine_template", {
    patient_id: patientA.id,
    template_id: nonmatchingTemplate,
  });
  const unsafeItems = directCopy.data
    ? await service.from("routine_days").select("routine_items(exercise_id)").eq("routine_id", directCopy.data)
    : { data: [] };
  const directExerciseIds = (unsafeItems.data ?? []).flatMap((day) => day.routine_items.map((item) => item.exercise_id));
  record("BACK-003-V1-direct-copy-rpc-bypasses-rule-and-contraindication-filter", "unsafe-persisted", !directCopy.error && directExerciseIds.includes(exerciseIds[0]) ? "unsafe-persisted" : "rejected", { itemCount: directExerciseIds.length });

  const forgedScreening = await pro.client.from("screenings").insert({
    patient_id: patientA.id,
    taken_on: "2026-09-01",
    weight_kg: 70,
    height_cm: 170,
    measurements: {},
    taken_by: outsider.id,
    notes: `${prefix}-forged-author`,
  }).select("id,taken_by").single();
  record("BACK-004-V1-professional-forges-screening-author", "persisted", !forgedScreening.error && forgedScreening.data.taken_by === outsider.id ? "persisted" : "rejected");
  const forgedAttendance = await pro.client.from("attendance").insert({
    patient_id: patientA.id,
    attended_on: "2026-09-01",
    check_in_at: "2026-09-01T08:00:00-05:00",
    registered_by: outsider.id,
    notes: `${prefix}-forged-author`,
  }).select("id,registered_by").single();
  record("BACK-004-V2-professional-forges-attendance-author", "persisted", !forgedAttendance.error && forgedAttendance.data.registered_by === outsider.id ? "persisted" : "rejected");

  const invalidMembership = await admin.client.from("memberships").insert({
    patient_id: pro.id,
    plan_id: planId,
    started_on: "2026-10-31",
    expires_on: "2026-09-30",
    amount: -1,
    status: "active",
    notes: `${prefix}-invalid-semantics`,
  }).select("id,patient_id,started_on,expires_on,amount").single();
  record("BACK-005-V1-membership-accepts-nonpatient-inverted-dates-negative-amount", "persisted", !invalidMembership.error && invalidMembership.data.patient_id === pro.id ? "persisted" : "rejected", invalidMembership.data ?? { code: invalidMembership.error?.code });
  const deactivatePlan = await admin.client.from("plans").update({ is_active: false }).eq("id", planId);
  assert.equal(deactivatePlan.error, null);
  const inactivePlanMembership = await admin.client.from("memberships").insert({
    patient_id: patientB.id,
    plan_id: planId,
    started_on: "2026-09-01",
    expires_on: "2026-10-01",
    amount: 100000,
    status: "active",
    notes: `${prefix}-inactive-plan`,
  }).select("id").single();
  record("BACK-005-V2-membership-accepts-inactive-plan", "persisted", inactivePlanMembership.error ? "rejected" : "persisted");

  const alertId = randomUUID();
  created.alerts.push(alertId);
  assert.equal((await service.from("alerts").insert({
    id: alertId,
    type: "pain",
    patient_id: patientA.id,
    recipient_id: pro.id,
    severity: "critical",
    payload: { marker: prefix },
  })).error, null);
  const alterAlert = await pro.client.from("alerts").update({
    read_at: new Date().toISOString(),
    severity: "info",
    payload: { marker: "tampered" },
  }).eq("id", alertId);
  record("CTRL-RLS-09-recipient-cannot-alter-alert-content", "denied", alterAlert.error ? "denied" : "allowed");
  const markRead = await pro.client.from("alerts").update({ read_at: new Date().toISOString() }).eq("id", alertId).select("read_at").single();
  record("CTRL-RLS-10-recipient-can-mark-own-alert-read", "allowed", markRead.error ? "denied" : "allowed");
  const patientAlerts = await patientA.client.from("alerts").select("id");
  record("CTRL-RLS-11-patient-cannot-read-alerts", "denied", patientAlerts.error || patientAlerts.data.length ? "allowed" : "denied");

  console.log(JSON.stringify({
    runId,
    baseCommit: "3f2eeb591a8e3ded85bfdbb9c19fb21e31092126",
    api: env.NEXT_PUBLIC_SUPABASE_URL,
    totals: {
      checks: results.length,
      controls: results.filter((item) => item.id.startsWith("CTRL-")).length,
      reproducedVariants: results.filter((item) => item.id.startsWith("BACK-")).length,
    },
    results,
  }, null, 2));
} finally {
  await cleanup();
}
