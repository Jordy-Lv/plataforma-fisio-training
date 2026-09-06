import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const prefix = "qa-backend-20260906t154046-sessions";
const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
  .split(/\r?\n/).filter(Boolean).map((line) => {
    const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1)];
  }));
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const users = [];
const exercises = [];
const results = [];
const password = "Qa-backend-sessions-20260906!";

function record(id, expected, actual, evidence = {}) {
  results.push({ id, expected, actual, passed: expected === actual, evidence });
  assert.equal(actual, expected, id);
}

async function person(label, role, specialty = null) {
  const email = `${prefix}-${label}-${randomUUID()}@example.invalid`;
  const made = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(made.error, null);
  users.push(made.data.user.id);
  assert.equal((await service.from("profiles").update({ role, specialty, is_active: true, full_name: `${prefix}-${label}` }).eq("id", made.data.user.id)).error, null);
  const client = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
  assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
  return { id: made.data.user.id, client };
}

try {
  const admin = await person("admin", "admin");
  const pro = await person("pro", "professional", "training");
  const physio = await person("physio", "professional", "physio");
  const outsider = await person("outsider", "professional", "training");
  const patient = await person("patient", "patient");
  const other = await person("other", "patient");
  for (const target of [patient, other]) {
    assert.equal((await service.from("patient_details").insert({
      profile_id: target.id, goal: "performance", level: "advanced",
      environment: "gym", equipment: ["machines"], onboarding_step: 3,
    })).error, null);
  }
  assert.equal((await service.from("care_assignments").insert([
    { patient_id: patient.id, professional_id: pro.id, kind: "training" },
    { patient_id: patient.id, professional_id: physio.id, kind: "physio" },
  ])).error, null);

  const exerciseIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  exercises.push(...exerciseIds);
  assert.equal((await service.from("exercises").insert(exerciseIds.map((id, index) => ({
    id, name: `${prefix}-exercise-${index}`, description: "fixture",
    media_url: "https://example.invalid/fixture.png", is_custom: true,
  })))).error, null);
  const routineId = randomUUID(), dayId = randomUUID();
  const itemIds = [randomUUID(), randomUUID(), randomUUID()];
  const otherRoutineId = randomUUID(), otherDayId = randomUUID(), otherItemId = randomUUID();
  assert.equal((await service.from("routines").insert([
    { id: routineId, patient_id: patient.id, kind: "training", name: `${prefix}-routine` },
    { id: otherRoutineId, patient_id: other.id, kind: "training", name: `${prefix}-other-routine` },
  ])).error, null);
  assert.equal((await service.from("routine_days").insert([
    { id: dayId, routine_id: routineId, day_number: 1 },
    { id: otherDayId, routine_id: otherRoutineId, day_number: 1 },
  ])).error, null);
  assert.equal((await service.from("routine_items").insert([
    ...itemIds.map((id, index) => ({ id, routine_day_id: dayId, exercise_id: exerciseIds[index], position: index + 1, sets: 3, reps: 10, target_weight: 12 })),
    { id: otherItemId, routine_day_id: otherDayId, exercise_id: exerciseIds[3], position: 1, sets: 2, reps: 8 },
  ])).error, null);

  const starts = await Promise.all([
    patient.client.rpc("start_routine_session", { target_day: dayId }),
    patient.client.rpc("start_routine_session", { target_day: dayId }),
  ]);
  record("CTRL-SESSION-01-concurrent-start-resumes-one-session", "same", !starts[0].error && !starts[1].error && starts[0].data === starts[1].data ? "same" : "different");
  const first = starts[0].data;
  const startedRow = await patient.client.from("sessions").select("performed_on,status").eq("id", first).single();
  record("CTRL-SESSION-02-start-date-is-derived-in-colombia", "in_progress", startedRow.data.status, { performedOn: startedRow.data.performed_on });
  const otherStart = await patient.client.rpc("start_routine_session", { target_day: otherDayId });
  record("CTRL-SESSION-03-patient-cannot-start-other-patients-day", "denied", otherStart.error ? "denied" : "allowed");
  const forgedSession = await patient.client.from("sessions").insert({
    routine_id: otherRoutineId, routine_day_id: otherDayId, patient_id: other.id,
  });
  record("CTRL-SESSION-04-patient-cannot-create-session-for-other", "denied", forgedSession.error ? "denied" : "allowed");

  const baseLog = {
    session_id: first, routine_item_id: itemIds[0], patient_id: patient.id,
    status: "done", actual_sets: 3, actual_reps: 10, actual_weight: 8,
    perceived_effort: 6, pain_level: 0,
  };
  for (const [label, patch] of [
    ["pain-above-max", { pain_level: 11 }],
    ["pain-below-min", { pain_level: -1 }],
    ["effort-zero", { perceived_effort: 0 }],
    ["sets-negative", { actual_sets: -1 }],
    ["reps-too-high", { actual_reps: 1001 }],
    ["weight-too-high", { actual_weight: 10000 }],
    ["invalid-zone", { pain_level: 1, pain_location: "invalid" }],
    ["skipped-without-reason", { status: "skipped", pain_level: 0, pain_location: null, notes: null }],
    ["replacement-with-done", { replaced_by_exercise_id: exerciseIds[3] }],
  ]) {
    const attempt = await patient.client.from("session_logs").insert({ ...baseLog, ...patch });
    record(`CTRL-SESSION-VALIDATION-${label}`, "denied", attempt.error ? "denied" : "allowed");
  }

  const forgedPrescription = await patient.client.from("session_logs").insert({
    ...baseLog,
    exercise_id: exerciseIds[3],
    prescribed_sets: 99,
    prescribed_reps: 99,
    prescribed_weight: 99,
  }).select("exercise_id,prescribed_sets,prescribed_reps,prescribed_weight").single();
  record("CTRL-SESSION-05-prescription-is-derived-by-trigger", "derived", !forgedPrescription.error && forgedPrescription.data.exercise_id === exerciseIds[0]
    && forgedPrescription.data.prescribed_sets === 3 && forgedPrescription.data.prescribed_reps === 10
    && Number(forgedPrescription.data.prescribed_weight) === 12 ? "derived" : "client-controlled");

  const incompleteClose = await patient.client.from("sessions").update({ status: "completed" }).eq("id", first).select("id");
  record("CTRL-SESSION-06-incomplete-session-cannot-close", "denied", incompleteClose.error ? "denied" : "allowed");

  const secondLog = { ...baseLog, routine_item_id: itemIds[1], actual_reps: 9 };
  const concurrent = await Promise.allSettled([
    patient.client.from("session_logs").upsert(secondLog, { onConflict: "session_id,routine_item_id" }),
    patient.client.from("session_logs").upsert({ ...secondLog, actual_reps: 11 }, { onConflict: "session_id,routine_item_id" }),
  ]);
  assert.ok(concurrent.every((item) => item.status === "fulfilled" && !item.value.error));
  const oneRow = await service.from("session_logs").select("id,actual_reps").eq("session_id", first).eq("routine_item_id", itemIds[1]);
  record("CTRL-SESSION-07-concurrent-upsert-keeps-one-row", 1, oneRow.data.length, { finalReps: oneRow.data[0].actual_reps });

  const finalLog = { ...baseLog, routine_item_id: itemIds[2], actual_reps: 7 };
  const race = await Promise.all([
    patient.client.from("session_logs").upsert(finalLog, { onConflict: "session_id,routine_item_id" }),
    patient.client.from("sessions").update({ status: "completed" }).eq("id", first).select("id"),
  ]);
  const stateAfterRace = await service.from("sessions").select("status").eq("id", first).single();
  const logsAfterRace = await service.from("session_logs").select("id").eq("session_id", first);
  const invariant = stateAfterRace.data.status === "completed" ? logsAfterRace.data.length === 3 : stateAfterRace.data.status === "in_progress";
  record("CTRL-SESSION-08-final-log-close-race-preserves-invariant", true, invariant, {
    status: stateAfterRace.data.status, logs: logsAfterRace.data.length,
    logError: race[0].error?.code ?? null, closeError: race[1].error?.code ?? null,
  });
  if (stateAfterRace.data.status === "in_progress") {
    const closed = await patient.client.from("sessions").update({ status: "completed" }).eq("id", first).select("id").single();
    assert.equal(closed.error, null);
  }
  const closedRewrite = await patient.client.from("session_logs").update({ actual_reps: 50 }).eq("session_id", first).eq("routine_item_id", itemIds[0]);
  record("CTRL-SESSION-09-closed-log-is-immutable", "denied", closedRewrite.error ? "denied" : "allowed");
  const reopen = await patient.client.from("sessions").update({ status: "in_progress" }).eq("id", first);
  record("CTRL-SESSION-10-closed-session-cannot-reopen", "denied", reopen.error ? "denied" : "allowed");
  assert.equal((await pro.client.from("routine_items").update({ sets: 5, exercise_id: exerciseIds[3] }).eq("id", itemIds[0])).error, null);
  const snapshot = await patient.client.from("session_logs").select("exercise_id,prescribed_sets").eq("session_id", first).eq("routine_item_id", itemIds[0]).single();
  record("CTRL-SESSION-11-history-keeps-original-prescription", "preserved", snapshot.data.exercise_id === exerciseIds[0] && snapshot.data.prescribed_sets === 3 ? "preserved" : "changed");
  const deletion = await pro.client.from("routine_items").delete().eq("id", itemIds[0]);
  record("CTRL-SESSION-12-item-with-history-cannot-be-deleted", "denied", deletion.error ? "denied" : "allowed");
  const crossSpecialty = await physio.client.from("routine_items").update({ reps: 12 }).eq("id", itemIds[1]).select("id");
  record("OBS-SESSION-01-physio-can-edit-training-routine-for-shared-patient", "allowed", crossSpecialty.error || !crossSpecialty.data.length ? "denied" : "allowed");

  const abandonedStart = await patient.client.rpc("start_routine_session", { target_day: dayId });
  const abandoned = await patient.client.from("sessions").update({ status: "abandoned" }).eq("id", abandonedStart.data).select("id").single();
  record("CTRL-SESSION-13-incomplete-session-may-be-abandoned", "allowed", abandoned.error ? "denied" : "allowed");
  const abandonedReopen = await patient.client.from("sessions").update({ status: "in_progress" }).eq("id", abandonedStart.data);
  record("CTRL-SESSION-14-abandoned-session-cannot-reopen", "denied", abandonedReopen.error ? "denied" : "allowed");

  async function completePainSession(index) {
    const started = await patient.client.rpc("start_routine_session", { target_day: dayId });
    assert.equal(started.error, null);
    const rows = itemIds.map((item, itemIndex) => ({
      session_id: started.data,
      routine_item_id: item,
      patient_id: patient.id,
      status: itemIndex === 0 ? "skipped" : "done",
      actual_sets: itemIndex === 0 ? null : 3,
      actual_reps: itemIndex === 0 ? null : 10,
      pain_level: itemIndex === 0 ? 8 : 0,
      pain_location: itemIndex === 0 ? "knee" : null,
      notes: itemIndex === 0 ? `${prefix}-pain-${index}` : null,
    }));
    assert.equal((await patient.client.from("session_logs").insert(rows)).error, null);
    assert.equal((await patient.client.from("sessions").update({ status: "completed" }).eq("id", started.data)).error, null);
  }
  for (let index = 1; index <= 3; index += 1) await completePainSession(index);
  async function visible(actor) {
    const query = await actor.client.from("alerts").select("id,type,recipient_id,payload").eq("patient_id", patient.id).in("type", ["pain", "skipped"]);
    assert.equal(query.error, null); return query.data;
  }
  const proAlerts = await visible(pro);
  const physioAlerts = await visible(physio);
  const adminAlerts = await visible(admin);
  const outsiderAlerts = await visible(outsider);
  const patientAlerts = await visible(patient);
  record("CTRL-ALERT-01-three-sessions-generate-pain-alert", true, proAlerts.some((item) => item.type === "pain"));
  record("CTRL-ALERT-02-both-assigned-professionals-receive", proAlerts.length, physioAlerts.length);
  record("CTRL-ALERT-03-admin-receives-alerts", true, adminAlerts.length >= proAlerts.length);
  record("CTRL-ALERT-04-unassigned-professional-sees-none", 0, outsiderAlerts.length);
  record("CTRL-ALERT-05-patient-sees-none", 0, patientAlerts.length);
  const distinctEvidence = new Set(proAlerts.find((item) => item.type === "pain")?.payload.evidence.map((item) => item.session_id));
  record("CTRL-ALERT-06-pain-counts-distinct-sessions", true, distinctEvidence.size >= 3);

  console.log(JSON.stringify({ runId: "20260906T154046", results }, null, 2));
} finally {
  await service.from("routines").delete().in("patient_id", users);
  if (exercises.length) await service.from("exercises").delete().in("id", exercises);
  for (const id of [...users].reverse()) {
    const deleted = await service.auth.admin.deleteUser(id);
    if (deleted.error) throw new Error(`cleanup user: ${deleted.error.message}`);
  }
}
