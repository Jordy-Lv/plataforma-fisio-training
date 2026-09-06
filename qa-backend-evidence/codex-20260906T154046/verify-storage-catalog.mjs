import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const prefix = "qa-backend-20260906t154046-storage";
const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
  .split(/\r?\n/).filter(Boolean).map((line) => {
    const at = line.indexOf("=");
    return [line.slice(0, at), line.slice(at + 1)];
  }));
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const users = [];
const exercises = [];
const paths = [];
const results = [];
const password = "Qa-backend-storage-20260906!";
const pngA = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const pngB = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

function record(id, expected, actual, evidence = {}) {
  results.push({ id, expected, actual, passed: expected === actual, evidence });
  assert.equal(actual, expected, id);
}

async function person(label, role, specialty = null) {
  const email = `${prefix}-${label}-${randomUUID()}@example.invalid`;
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null);
  users.push(created.data.user.id);
  assert.equal((await service.from("profiles").update({ role, specialty, is_active: true })
    .eq("id", created.data.user.id)).error, null);
  const client = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
  assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
  return { id: created.data.user.id, client };
}

try {
  const proA = await person("pro-a", "professional", "training");
  const proB = await person("pro-b", "professional", "physio");
  const inactivePro = await person("pro-inactive", "professional", "training");
  const patient = await person("patient", "patient");

  const exerciseId = randomUUID();
  exercises.push(exerciseId);
  const created = await proA.client.from("exercises").insert({
    id: exerciseId,
    name: `${prefix}-owned-by-pro-a`,
    description: "fixture",
    media_url: "https://example.invalid/fixture.png",
    environments: ["home"],
    is_custom: true,
  }).select("id").single();
  record("CTRL-CATALOG-01-professional-creates-custom-exercise", "allowed", created.error ? "denied" : "allowed");

  const update = await proA.client.from("exercises").update({ name: `${prefix}-updated` })
    .eq("id", exerciseId).select("id,name");
  const persisted = await service.from("exercises").select("name").eq("id", exerciseId).single();
  record("BACK-006-V1-professional-cannot-edit-own-custom-exercise", "denied", update.error || update.data.length === 0 ? "denied" : "allowed", { persistedName: persisted.data.name });

  const patientCreate = await patient.client.from("exercises").insert({ name: `${prefix}-patient`, is_custom: true });
  record("CTRL-CATALOG-02-patient-cannot-create-exercise", "denied", patientCreate.error ? "denied" : "allowed");

  const ownedPath = `custom/${prefix}-${randomUUID()}.png`;
  paths.push(ownedPath);
  const uploadA = await proA.client.storage.from("exercise-media").upload(ownedPath, pngA, { contentType: "image/png" });
  record("CTRL-STORAGE-01-professional-uploads-custom-image", "allowed", uploadA.error ? "denied" : "allowed");
  const publicUrl = service.storage.from("exercise-media").getPublicUrl(ownedPath).data.publicUrl;
  const publicRead = await fetch(publicUrl);
  record("CTRL-STORAGE-02-image-is-public", 200, publicRead.status);

  const overwrite = await proB.client.storage.from("exercise-media").upload(ownedPath, pngB, { contentType: "image/png", upsert: true });
  const overwrittenBytes = Buffer.from(await (await fetch(publicUrl)).arrayBuffer());
  record("BACK-007-V1-professional-overwrites-another-professionals-object", "overwritten", !overwrite.error && overwrittenBytes.equals(pngB) ? "overwritten" : "rejected");

  const outsidePrefix = `imported/${prefix}-${randomUUID()}.png`;
  paths.push(outsidePrefix);
  const outside = await proA.client.storage.from("exercise-media").upload(outsidePrefix, pngA, { contentType: "image/png" });
  record("BACK-007-V2-professional-writes-outside-custom-prefix", "allowed", outside.error ? "denied" : "allowed");

  const emptyPath = `custom/${prefix}-empty-${randomUUID()}.png`;
  paths.push(emptyPath);
  const empty = await proA.client.storage.from("exercise-media").upload(emptyPath, Buffer.alloc(0), { contentType: "image/png" });
  record("BACK-008-V1-empty-file-with-image-mime-is-accepted", "allowed", empty.error ? "denied" : "allowed");

  const spoofPath = `custom/${prefix}-spoof-${randomUUID()}.png`;
  paths.push(spoofPath);
  const spoof = await proA.client.storage.from("exercise-media").upload(spoofPath, Buffer.from("not an image"), { contentType: "image/png" });
  record("BACK-008-V2-nonimage-bytes-with-image-mime-are-accepted", "allowed", spoof.error ? "denied" : "allowed");

  const exactPath = `custom/${prefix}-5mib-${randomUUID()}.png`;
  const overPath = `custom/${prefix}-5mib-plus-${randomUUID()}.png`;
  paths.push(exactPath, overPath);
  const exact = await proA.client.storage.from("exercise-media").upload(exactPath, Buffer.alloc(5 * 1024 * 1024), { contentType: "image/png" });
  const over = await proA.client.storage.from("exercise-media").upload(overPath, Buffer.alloc(5 * 1024 * 1024 + 1), { contentType: "image/png" });
  record("CTRL-STORAGE-03-exact-5mib-is-accepted", "allowed", exact.error ? "denied" : "allowed");
  record("CTRL-STORAGE-04-over-5mib-is-rejected", "denied", over.error ? "denied" : "allowed");

  await service.from("profiles").update({ is_active: false }).eq("id", inactivePro.id);
  const inactivePath = `custom/${prefix}-inactive-${randomUUID()}.png`;
  paths.push(inactivePath);
  const inactiveUpload = await inactivePro.client.storage.from("exercise-media").upload(inactivePath, pngA, { contentType: "image/png" });
  record("BACK-001-V5-inactive-professional-old-token-writes-storage", "allowed", inactiveUpload.error ? "denied" : "allowed");

  const patientPath = `custom/${prefix}-patient-${randomUUID()}.png`;
  const patientUpload = await patient.client.storage.from("exercise-media").upload(patientPath, pngA, { contentType: "image/png" });
  record("CTRL-STORAGE-05-patient-cannot-upload", "denied", patientUpload.error ? "denied" : "allowed");
  const proDelete = await proA.client.storage.from("exercise-media").remove([ownedPath]);
  const stillThere = await fetch(publicUrl);
  record("CTRL-STORAGE-06-professional-cannot-delete", "preserved", proDelete.error || stillThere.status === 200 ? "preserved" : "deleted");

  console.log(JSON.stringify({ runId: "20260906T154046", results }, null, 2));
} finally {
  if (paths.length) {
    const removed = await service.storage.from("exercise-media").remove(paths);
    if (removed.error) throw new Error(`cleanup storage: ${removed.error.message}`);
  }
  if (exercises.length) {
    const deleted = await service.from("exercises").delete().in("id", exercises);
    if (deleted.error) throw new Error(`cleanup exercises: ${deleted.error.message}`);
  }
  for (const id of [...users].reverse()) {
    const deleted = await service.auth.admin.deleteUser(id);
    if (deleted.error) throw new Error(`cleanup user: ${deleted.error.message}`);
  }
}
