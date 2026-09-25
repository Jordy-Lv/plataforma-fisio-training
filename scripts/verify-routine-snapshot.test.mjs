/**
 * Verifica la copia transaccional de rutinas (el snapshot): que `template_days`
 * y `template_items` se copian tal cual a `routine_days`/`routine_items` y
 * que editar la copia no toca la plantilla de origen.
 *
 * Requiere solo Supabase local encendido (`npx supabase start`): no depende
 * de ninguna semilla, ni siquiera de la base (`supabase/seed.sql`). Crea sus
 * propias cuentas por `signUp`, su propio ejercicio y sus propias plantillas,
 * y los borra al terminar.
 *
 * Uso:  npm run test:routines:snapshot
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const container = "supabase_db_plataforma-fisio-training";
const sql = (query) => execFileSync("docker", [
  "exec", container, "psql", "-U", "postgres", "-d", "postgres",
  "-Atq", "-v", "ON_ERROR_STOP=1", "-c", query,
], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const contents = (id, template = false) => JSON.parse(sql(`
  select coalesce(jsonb_agg(jsonb_build_object(
    'day_number', d.day_number, 'title', d.title,
    'items', (select jsonb_agg(jsonb_build_object(
      'exercise_id', i.exercise_id, 'position', i.position, 'sets', i.sets,
      'reps', i.reps, 'target_weight', i.target_weight,
      'rest_seconds', i.rest_seconds, 'notes', i.notes
    ) order by i.position) from public.${template ? "template" : "routine"}_items i
    where i.${template ? "template" : "routine"}_day_id = d.id)
  ) order by d.day_number), '[]'::jsonb)
  from public.${template ? "template" : "routine"}_days d
  where d.${template ? "template" : "routine"}_id = '${id}'
`));

test("Asignación transaccional de rutinas por API", { timeout: 120_000 }, async (t) => {
  const status = JSON.parse(execFileSync(process.execPath, [
    "node_modules/supabase/dist/supabase.js",
    "status", "--output", "json",
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname));

  const users = [];
  const templateId = randomUUID();
  const physioId = randomUUID();
  const emptyId = randomUUID();
  const brokenId = randomUUID();
  const exerciseId = randomUUID();

  t.after(async () => {
    for (const { client } of users) await client.auth.signOut();
    sql(`delete from public.routines where source_template_id in ('${templateId}', '${physioId}', '${emptyId}', '${brokenId}');
      delete from public.routine_templates where id in ('${templateId}', '${physioId}', '${emptyId}', '${brokenId}');
      delete from public.exercises where id = '${exerciseId}';`);
    for (const { id } of users) sql(`delete from auth.users where id = '${id}'`);
  });

  async function person(role, specialty = null) {
    const client = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signUp({
      email: `snapshot-${randomUUID()}@demo.local`, password: "Snapshot-demo-1234",
    });
    assert.equal(error, null);
    assert.ok(data.session);
    const user = { id: data.user.id, client };
    users.push(user);
    sql(`update public.profiles set role = '${role}',
      specialty = ${specialty ? `'${specialty}'` : "null"} where id = '${user.id}'`);
    return user;
  }

  const admin = await person("admin");
  const pro = await person("professional", "training");
  const outsider = await person("professional", "physio");
  const patients = [await person("patient"), await person("patient"), await person("patient")];
  const patient = patients[0];
  sql(`insert into public.care_assignments (patient_id, professional_id, kind)
    values ('${patient.id}', '${pro.id}', 'training');
    insert into public.exercises (id, name, is_custom)
    values ('${exerciseId}', 'Ejercicio de prueba de snapshot', true);
    insert into public.routine_templates (id, name, kind) values
      ('${templateId}', 'Plantilla de tres días', 'training'),
      ('${physioId}', 'Plantilla de rehabilitación', 'physio'),
      ('${emptyId}', 'Plantilla sin días', 'training'),
      ('${brokenId}', 'Plantilla incompleta', 'training');
    insert into public.template_days (template_id, day_number, title)
      select id, day_number, 'Día ' || day_number
      from public.routine_templates cross join generate_series(1, 3) day_number
      where id in ('${templateId}', '${physioId}', '${brokenId}');
    insert into public.template_items (
      template_day_id, exercise_id, position, sets, reps, target_weight, rest_seconds, notes
    ) select d.id, '${exerciseId}', position, 3, 10 + position,
      case when position = 1 then 7.5 else null end, 60,
      case when position = 1 then 'Movimiento controlado' else null end
      from public.template_days d cross join generate_series(1, 3) position
      where d.template_id in ('${templateId}', '${physioId}', '${brokenId}')
        and not (d.template_id = '${brokenId}' and d.day_number = 3);`);

  const original = contents(templateId, true);
  const copy = (user, target = patient, source = templateId) => user.client.rpc(
    "copy_routine_template", { patient_id: target.id, template_id: source },
  );
  const counts = () => sql(`select
    (select count(*) from public.routines where patient_id = '${patient.id}'),
    (select count(*) from public.routine_days d join public.routines r on r.id = d.routine_id where r.patient_id = '${patient.id}'),
    (select count(*) from public.routine_items i join public.routine_days d on d.id = i.routine_day_id join public.routines r on r.id = d.routine_id where r.patient_id = '${patient.id}')`);
  let firstId;

  await t.test("El profesional a cargo copia los tres días con su prescripción y origen", async () => {
    const { data, error } = await copy(pro);
    assert.equal(error, null);
    assert.match(data, /^[a-f0-9-]{36}$/);
    firstId = data;
    assert.deepEqual(contents(firstId), original);
    assert.equal(sql(`select source_template_id || '/' || assigned_by || '/' || status
      from public.routines where id = '${firstId}'`), `${templateId}/${pro.id}/active`);
    assert.equal(sql(`select count(*) from public.routine_items i
      join public.routine_days d on d.id = i.routine_day_id
      where d.routine_id = '${firstId}' and i.was_modified`), "0");
  });

  await t.test("Tres pacientes reciben copias independientes y la plantilla sigue idéntica", async () => {
    const ids = [firstId];
    for (const target of patients.slice(1)) {
      const { data, error } = await copy(admin, target);
      assert.equal(error, null);
      ids.push(data);
      assert.deepEqual(contents(data), original);
    }
    assert.equal(new Set(ids).size, 3);
    assert.deepEqual(contents(templateId, true), original);
    const dayId = sql(`select id from public.routine_days where routine_id = '${firstId}' and day_number = 1`);
    const change = await pro.client.from("routine_items").update({ sets: 5, was_modified: true })
      .eq("routine_day_id", dayId).eq("position", 1).select("id");
    assert.equal(change.error, null);
    assert.equal(change.data.length, 1);
    assert.equal(contents(firstId)[0].items[0].sets, 5);
    for (const id of ids.slice(1)) assert.deepEqual(contents(id), original);
    assert.deepEqual(contents(templateId, true), original);
  });

  await t.test("Paciente, profesional ajeno y anónimo no pueden asignar", async () => {
    const before = counts();
    const anonymous = { client: createClient(status.API_URL, status.ANON_KEY) };
    for (const user of [patient, outsider, anonymous]) {
      const { error } = await copy(user);
      assert.equal(error?.code, "42501");
    }
    assert.equal(counts(), before);
    for (const user of [outsider, patients[1]]) {
      const { data, error } = await user.client.from("routines").select("id").eq("id", firstId);
      assert.equal(error, null);
      assert.deepEqual(data, []);
    }
    const read = await patient.client.from("routines").select("id").eq("id", firstId);
    assert.equal(read.error, null);
    assert.equal(read.data.length, 1);
    const itemId = sql(`select i.id from public.routine_items i join public.routine_days d on d.id = i.routine_day_id
      where d.routine_id = '${firstId}' order by d.day_number, i.position limit 1`);
    const update = await patient.client.from("routine_items").update({ sets: 99 }).eq("id", itemId).select("id");
    assert.equal(update.error, null);
    assert.deepEqual(update.data, []);
    assert.equal(sql(`select sets from public.routine_items where id = '${itemId}'`), "5");
  });

  await t.test("Sin plantilla válida o paciente activo no se modifica ninguna rutina", async () => {
    const before = counts();
    for (const source of [randomUUID(), emptyId]) {
      assert.equal((await copy(admin, patient, source)).error?.code, "22023");
    }
    sql(`update public.routine_templates set is_active = false where id = '${templateId}'`);
    assert.equal((await copy(admin)).error?.code, "22023");
    sql(`update public.routine_templates set is_active = true where id = '${templateId}'`);
    assert.equal((await copy(admin, pro)).error?.code, "22023");
    sql(`update public.profiles set is_active = false where id = '${patient.id}'`);
    assert.equal((await copy(admin)).error?.code, "22023");
    sql(`update public.profiles set is_active = true where id = '${patient.id}'`);
    sql(`update public.profiles set is_active = false where id = '${admin.id}'`);
    assert.equal((await copy(admin)).error?.code, "42501");
    sql(`update public.profiles set is_active = true where id = '${admin.id}'`);
    assert.equal(counts(), before);
  });

  await t.test("Un fallo en el tercer día revierte la copia y el cierre de la anterior", async () => {
    const before = counts();
    const previous = contents(firstId);
    const result = await copy(pro, patient, brokenId);
    assert.equal(result.error?.code, "22023");
    assert.match(result.error.message, /día 3 no tiene ejercicios/);
    assert.equal(counts(), before);
    assert.deepEqual(contents(firstId), previous);
    assert.equal(sql(`select status from public.routines where id = '${firstId}'`), "active");
  });

  await t.test("Reemplazar entrenamiento conserva las sesiones y la rehabilitación activa", async () => {
    const rehab = await copy(admin, patient, physioId);
    assert.equal(rehab.error, null);
    const dayId = sql(`select id from public.routine_days where routine_id = '${firstId}' and day_number = 1`);
    const itemId = sql(`select id from public.routine_items where routine_day_id = '${dayId}' and position = 1`);
    const session = await patient.client.from("sessions").insert({
      routine_id: firstId, routine_day_id: dayId, patient_id: patient.id, status: "in_progress",
    }).select("id").single();
    assert.equal(session.error, null);
    const log = await patient.client.from("session_logs").insert({
      session_id: session.data.id, routine_item_id: itemId, patient_id: patient.id,
      status: "done", actual_sets: 3, actual_reps: 12, actual_weight: 8,
    }).select("id, session_id, routine_item_id, actual_sets, actual_reps, actual_weight").single();
    assert.equal(log.error, null);
    const remaining = await patient.client.from("routine_items").select("id").eq("routine_day_id", dayId).neq("id", itemId);
    assert.equal(remaining.error, null);
    if (remaining.data.length) {
      const marks = await patient.client.from("session_logs").insert(remaining.data.map((item) => ({
        session_id: session.data.id, routine_item_id: item.id, patient_id: patient.id,
        status: "done", actual_sets: 3, actual_reps: 12, pain_level: 0,
      })));
      assert.equal(marks.error, null);
    }
    const closed = await patient.client.from("sessions").update({ status: "completed" }).eq("id", session.data.id);
    assert.equal(closed.error, null);
    const replacement = await copy(pro);
    assert.equal(replacement.error, null);
    assert.equal(sql(`select status from public.routines where id = '${firstId}'`), "completed");
    assert.equal(sql(`select ends_on = (now() at time zone 'America/Bogota')::date from public.routines where id = '${firstId}'`), "t");
    assert.equal(sql(`select status from public.routines where id = '${rehab.data}'`), "active");
    assert.deepEqual(contents(replacement.data), original);
    const saved = await patient.client.from("session_logs")
      .select("id, session_id, routine_item_id, actual_sets, actual_reps, actual_weight").eq("id", log.data.id).single();
    assert.equal(saved.error, null);
    assert.deepEqual(saved.data, log.data);
    const sessionRead = await pro.client.from("sessions").select("id").eq("id", session.data.id);
    assert.equal(sessionRead.error, null);
    assert.equal(sessionRead.data.length, 1);
  });

  await t.test("Dos asignaciones simultáneas dejan una sola rutina activa del mismo tipo", async () => {
    const results = await Promise.all([copy(pro), copy(admin)]);
    for (const result of results) assert.equal(result.error, null);
    assert.notEqual(results[0].data, results[1].data);
    assert.equal(sql(`select count(*) from public.routines where patient_id = '${patient.id}' and kind = 'training' and status = 'active'`), "1");
    for (const { data } of results) assert.deepEqual(contents(data), original);
    assert.deepEqual(contents(templateId, true), original);
    const duplicate = await admin.client.from("routines").insert({
      patient_id: patient.id, kind: "training", name: "Duplicada",
    });
    assert.equal(duplicate.error?.code, "23505");
  });

  await t.test("Una asignación de cuidado finalizada deja de autorizar la copia", async () => {
    sql(`update public.care_assignments set ended_at = now()
      where patient_id = '${patient.id}' and professional_id = '${pro.id}'`);
    const before = counts();
    assert.equal((await copy(pro)).error?.code, "42501");
    assert.equal(counts(), before);
  });
});
