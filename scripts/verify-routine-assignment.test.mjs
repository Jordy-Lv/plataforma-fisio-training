/**
 * Verifica el motor de asignación conectado a la base: la decisión por API,
 * el aislamiento por rol, la reevaluación ante cambios y los caminos D1 sin
 * regla compatible o con el tamizaje incompleto.
 *
 * Requiere Supabase local encendido con la semilla base (`npm run db:reset`)
 * y `npm run dev` en marcha. No necesita catálogo, plantillas ni reglas
 * sembradas: crea sus propios ejercicios, plantillas, reglas y personas, y
 * los borra al terminar (la regla propia del fixture es la que usan los
 * subtests que exigen «alguna regla activa»).
 *
 * Uso:  npm run test:routines
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { status, sql as rawSql, httpClient } from "./helpers/auth-http.mjs";
import { prepareAssignment } from "../lib/routines/assignment.ts";

const sql = (query) => rawSql(query).trim().split("\n")[0];
const password = "Rutinas-prueba-1234";
const client = () => createClient(status.API_URL, status.ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

test("Motor conectado a asignación, aislamiento y vistas", { timeout: 180000 }, async (t) => {
  const users = [];
  const templateId = randomUUID(), secondTemplateId = randomUUID(), ruleId = randomUUID();
  const safeId = randomUUID(), excludedId = randomUUID();
  t.after(async () => {
    if (process.env.FISIO_KEEP_ROUTINE_FIXTURES === "1") {
      writeFileSync("/tmp/fisio-routine-fixtures.json", JSON.stringify({ users: users.map(({ id, email, role }) => ({ id, email, role })), templateId, secondTemplateId, ruleId, safeId, excludedId }));
      return;
    }
    sql(`delete from public.alerts where patient_id in (${users.map((u) => `'${u.id}'`).join(",")});
      delete from public.routines where source_template_id in ('${templateId}', '${secondTemplateId}');
      delete from public.assignment_rules where id = '${ruleId}';
      delete from public.routine_templates where id in ('${templateId}', '${secondTemplateId}');
      delete from public.exercises where id in ('${safeId}', '${excludedId}');`);
    for (const user of users) { await user.api.auth.signOut(); sql(`delete from auth.users where id = '${user.id}'`); }
  });
  const perfilPorDefecto = { goal: "performance", level: "advanced", environment: "gym", equipment: "{barbell}" };
  async function person(role, specialty = null, { step = 3, ...perfil } = {}) {
    const api = client(), email = `rutinas-${randomUUID()}@demo.local`;
    const { data, error } = await api.auth.signUp({ email, password });
    assert.equal(error, null);
    const user = { api, email, id: data.user.id, role };
    users.push(user);
    sql(`update public.profiles set role = '${role}', specialty = ${specialty ? `'${specialty}'` : 'null'}, full_name = 'Prueba de rutinas ${role}' where id = '${user.id}'`);
    // `step` 2 deja al paciente **a un paso** de terminar: es el estado desde el
    // que se prueba el disparo automático del motor (D1).
    if (role === "patient") {
      const { goal, level, environment, equipment } = { ...perfilPorDefecto, ...perfil };
      sql(`insert into public.patient_details(profile_id, goal, level, environment, equipment, onboarding_step)
        values ('${user.id}', '${goal}', '${level}', '${environment}', '${equipment}', ${step})`);
    }
    return user;
  }
  const admin = await person("admin");
  const pro = await person("professional", "training");
  const physio = await person("professional", "physio");
  const outsider = await person("professional", "training");
  const patient = await person("patient");
  const emptyPatient = await person("patient");
  sql(`insert into public.care_assignments(patient_id, professional_id, kind) values
    ('${patient.id}', '${pro.id}', 'training'), ('${patient.id}', '${physio.id}', 'physio');
    insert into public.patient_conditions(patient_id, body_part) values ('${patient.id}', 'knee');
    insert into public.exercises(id, name, contraindications, is_custom) values
      ('${safeId}', 'Movimiento permitido de prueba', '{}', true),
      ('${excludedId}', 'Movimiento excluido de prueba', '{knee}', true);
    insert into public.routine_templates(id, name, kind) values
      ('${templateId}', 'Rutina de prueba A', 'training'), ('${secondTemplateId}', 'Rutina de prueba B', 'physio');
    insert into public.template_days(template_id, day_number, title) values
      ('${templateId}', 1, 'Sesión completa'), ('${secondTemplateId}', 1, 'Rehabilitación');
    insert into public.template_items(template_day_id, exercise_id, position, sets, reps, rest_seconds)
      select id, '${safeId}', position, 3, 12, 60 from public.template_days cross join generate_series(1,3) position
      where template_id in ('${templateId}', '${secondTemplateId}');
    insert into public.template_items(template_day_id, exercise_id, position, sets, reps)
      select id, '${excludedId}', 4, 3, 10 from public.template_days where template_id = '${templateId}';
    insert into public.assignment_rules(id, name, priority, conditions, template_id)
      values ('${ruleId}', 'Regla temporal de rutinas', -1000000,
        '{"goal":["performance"],"level":["advanced"],"environment":["gym"],"equipment_all_of":["barbell"]}', '${templateId}');`);
  async function context(actor = pro, target = patient) {
    const result = await actor.api.rpc("routine_assignment_context", { target_patient: target.id });
    assert.equal(result.error, null);
    return result.data;
  }
  function commit(actor, target, snapshot, changes = {}) {
    const decision = prepareAssignment(snapshot);
    return actor.api.rpc("commit_routine_assignment", {
      target_patient: target.id, expected_context: snapshot,
      ...(decision.selectedRule ? { selected_rule: decision.selectedRule } : {}),
      excluded_exercises: decision.excludedExercises, assignment_notes: decision.notes, ...changes,
    });
  }
  const templateContents = () => sql(`select jsonb_agg(to_jsonb(i) order by i.id)
    from public.template_items i join public.template_days d on d.id = i.template_day_id where d.template_id = '${templateId}'`);
  const original = templateContents();
  let firstId, pendingId;

  await t.test("La decisión usa el motor y rechaza un perfil inválido o plantilla inactiva", async () => {
    const snapshot = await context();
    const decision = prepareAssignment(snapshot);
    assert.equal(decision.selectedRule, ruleId);
    assert.deepEqual(decision.excludedExercises, [excludedId]);
    assert.match(decision.notes, /rodilla/i);
    assert.equal(prepareAssignment({ ...snapshot, rules: [] }).selectedRule, undefined);
    assert.throws(() => prepareAssignment({ ...snapshot, profile: { ...snapshot.profile, conditions: ['inventada'] } }), /inválidos/);
    assert.throws(() => prepareAssignment({ ...snapshot, templates: snapshot.templates.map((v) => ({ ...v, is_active: false })) }), /inactiva/);
  });
  await t.test("La acción HTTP asigna, filtra y conserva la plantilla", async () => {
    const web = httpClient();
    await web.submit('/login', { email: pro.email, password });
    const result = await web.submit(`/pro/routines/${patient.id}`, {}, 'name="patientId"');
    assert.match(result.html, /Rutina asignada\. El paciente ya puede consultarla/);
    firstId = sql(`select id from public.routines where patient_id = '${patient.id}' and status = 'active'`);
    assert.match(firstId, /^[a-f0-9-]{36}$/);
    assert.equal(sql(`select count(*) from public.routine_items i join public.routine_days d on d.id=i.routine_day_id where d.routine_id='${firstId}'`), '3');
    assert.equal(sql(`select assigned_by is null from public.routines where id='${firstId}'`), 't');
    assert.equal(templateContents(), original);
    // KAN-10 · D2: la plantilla es de tipo `training`, así que el aviso es del
    // entrenador. El fisioterapeuta acompaña al mismo paciente y NO lo recibe:
    // antes le llegaba, y era ruido.
    const alert = await pro.api.from('alerts').select('payload').eq('patient_id', patient.id);
    assert.equal(alert.error, null);
    assert.equal(alert.data.length, 1);
    assert.equal(alert.data[0].payload.outcome, 'assigned');
    assert.deepEqual((await physio.api.from('alerts').select('id').eq('patient_id', patient.id)).data, []);
    assert.equal((await admin.api.from('alerts').select('id').eq('patient_id', patient.id)).data.length >= 1, true);
  });
  await t.test("Un cambio posterior del perfil o de la regla obliga a reevaluar", async () => {
    const stale = await context();
    sql(`update public.assignment_rules set name='Regla temporal actualizada' where id='${ruleId}'`);
    assert.equal((await commit(pro, patient, stale)).error?.code, '22023');
    const staleProfile = await context();
    sql(`update public.patient_details set birth_date='1990-01-01' where profile_id='${patient.id}'`);
    assert.equal((await commit(pro, patient, staleProfile)).error?.code, '22023');
    assert.equal(sql(`select count(*) from public.routines where patient_id='${patient.id}'`), '1');
  });
  await t.test("Ni el paciente, el profesional ajeno ni el anónimo pueden invocar la asignación", async () => {
    const snapshot = await context();
    for (const actor of [patient, outsider, { api: client() }]) {
      assert.equal((await actor.api.rpc('routine_assignment_context', { target_patient: patient.id })).error?.code, '42501');
      assert.equal((await commit(actor, patient, snapshot)).error?.code, '42501');
    }
    const forged = await commit(pro, patient, snapshot, { excluded_exercises: [] });
    assert.equal(forged.error?.code, '22023');
    const web = httpClient();
    await web.submit('/login', { email: outsider.email, password });
    const result = await web.request(`/pro/routines/${patient.id}`);
    assert.match(result.html, /404|could not be found/);
    assert.ok(!result.html.includes('name="patientId"'));
  });
  await t.test("Un día vacío se reserva al equipo, conserva la activa y avisa a quien entrena ese tipo", async () => {
    sql(`update public.exercises set contraindications='{knee}' where id='${safeId}'`);
    const result = await commit(pro, patient, await context());
    assert.equal(result.error, null);
    assert.equal(result.data.outcome, 'pending_review');
    pendingId = result.data.routine_id;
    assert.equal(sql(`select status from public.routines where id='${firstId}'`), 'active');
    assert.equal(sql(`select count(*) from public.routine_items i join public.routine_days d on d.id=i.routine_day_id where d.routine_id='${pendingId}'`), '0');
    assert.deepEqual((await patient.api.from('routines').select('id').eq('id', pendingId)).data, []);
    assert.deepEqual((await patient.api.from('routine_days').select('id').eq('routine_id', pendingId)).data, []);
    assert.deepEqual((await patient.api.from('alerts').select('id').eq('patient_id', patient.id)).data, []);
    assert.deepEqual((await outsider.api.from('alerts').select('id').eq('patient_id', patient.id)).data, []);
    const alert = await pro.api.from('alerts').select('payload').eq('patient_id', patient.id).order('created_at', { ascending: false }).limit(1);
    assert.equal(alert.data[0].payload.outcome, 'pending_review');
    sql(`update public.exercises set contraindications='{}' where id='${safeId}'`);
  });
  await t.test("Cambiar la regla asigna otra plantilla y conserva ambas especialidades", async () => {
    sql(`update public.assignment_rules set template_id='${secondTemplateId}' where id='${ruleId}'`);
    const result = await commit(pro, patient, await context());
    assert.equal(result.error, null);
    assert.equal(result.data.outcome, 'assigned');
    assert.equal(sql(`select count(*) from public.routines where patient_id='${patient.id}' and status='active'`), '2');
    const web = httpClient();
    await web.submit('/login', { email: patient.email, password });
    const { html } = await web.request('/routine');
    assert.match(html, /Rutina de prueba A/);
    assert.match(html, /Rutina de prueba B/);
    assert.ok(!html.includes('Pendiente de revisión'));
    assert.equal(templateContents(), original);
  });
  await t.test("BACK-002 · el servidor recalcula el ganador y no acepta la regla del cliente", async () => {
    const decoyRule = randomUUID();
    // Regla activa, plantilla activa, criterios que coinciden con el paciente,
    // pero con peor prioridad: no es la ganadora determinista.
    sql(`insert into public.assignment_rules(id, name, priority, conditions, template_id)
      values ('${decoyRule}', 'Regla señuelo BACK-002', 999999,
        '{"goal":["performance"],"level":["advanced"],"environment":["gym"],"equipment_all_of":["barbell"]}',
        '${secondTemplateId}')`);
    try {
      const snapshot = await context();
      const before = sql(`select count(*) from public.routines where patient_id='${patient.id}'`);
      // Enviar otra regla activa en lugar de la ganadora: rechazado.
      const forgedRule = await pro.api.rpc('commit_routine_assignment', {
        target_patient: patient.id, expected_context: snapshot, selected_rule: decoyRule,
      });
      assert.equal(forgedRule.error?.code, '22023');
      // Declarar `no_match` (regla nula) habiendo una ganadora: rechazado.
      const forgedNull = await pro.api.rpc('commit_routine_assignment', {
        target_patient: patient.id, expected_context: snapshot,
      });
      assert.equal(forgedNull.error?.code, '22023');
      assert.equal(sql(`select count(*) from public.routines where patient_id='${patient.id}'`), before);
    } finally {
      sql(`delete from public.assignment_rules where id = '${decoyRule}'`);
    }
  });
  await t.test("Sin coincidencia se registra aviso y el paciente ve un estado explicativo", async () => {
    // El servidor recalcula el ganador (BACK-002): para que el resultado sea
    // realmente `no_match` no puede quedar ninguna regla activa —ni la de
    // prueba ni las del seed compartido—. Se desactivan y se restauran.
    const active = sql(`select coalesce(string_agg(id::text, ','), '') from public.assignment_rules where is_active`);
    sql(`update public.assignment_rules set is_active = false where is_active`);
    try {
      const snapshot = await context(admin, emptyPatient);
      const result = await admin.api.rpc('commit_routine_assignment', { target_patient: emptyPatient.id, expected_context: snapshot });
      assert.equal(result.error, null);
      assert.equal(result.data.outcome, 'no_match');
      assert.equal(sql(`select count(*) from public.routines where patient_id='${emptyPatient.id}'`), '0');
      const web = httpClient();
      await web.submit('/login', { email: emptyPatient.email, password });
      assert.match((await web.request('/routine')).html, /Tu profesional está preparando tu rutina/);
    } finally {
      if (active) sql(`update public.assignment_rules set is_active = true where id in ('${active.split(',').join("','")}')`);
    }
  });
  await t.test("Un fallo al copiar revierte el cierre de la rutina y los avisos", async () => {
    sql(`insert into public.template_days(template_id,day_number) values ('${secondTemplateId}',2)`);
    const snapshot = await context();
    const before = sql(`select count(*) from public.routines where patient_id='${patient.id}'`);
    const result = await pro.api.rpc('commit_routine_assignment', { target_patient: patient.id, expected_context: snapshot, selected_rule: ruleId });
    assert.equal(result.error?.code, '22023');
    assert.equal(sql(`select count(*) from public.routines where patient_id='${patient.id}'`), before);
    assert.equal(sql(`select count(*) from public.routines where patient_id='${patient.id}' and status='active'`), '2');
    sql(`delete from public.template_days where template_id='${secondTemplateId}' and day_number=2`);
  });
  await t.test("Dos asignaciones simultáneas conservan una sola rutina activa por tipo", async () => {
    const snapshot = await context();
    const results = await Promise.all([commit(pro, patient, snapshot), commit(admin, patient, snapshot)]);
    for (const result of results) assert.equal(result.error, null);
    assert.equal(sql(`select count(*) from public.routines where patient_id='${patient.id}' and status='active' and kind='physio'`), '1');
  });
  await t.test("BACK-003 · la copia directa por RPC deja un evento de asignación manual", async () => {
    // El camino manual: el profesional llama `copy_routine_template` sin pasar
    // por `commit_routine_assignment`. Es legítimo (D1), pero antes no dejaba
    // ningún `routine_assignment_event` y se perdía la traza.
    const before = Number(sql(`select count(*) from public.routine_assignment_events where patient_id='${patient.id}'`));
    const copy = await pro.api.rpc("copy_routine_template", { patient_id: patient.id, template_id: templateId });
    assert.equal(copy.error, null);
    const routineId = copy.data;
    assert.match(routineId, /^[a-f0-9-]{36}$/);

    const events = await pro.api.from("routine_assignment_events")
      .select("outcome, payload, routine_id").eq("routine_id", routineId);
    assert.equal(events.error, null);
    assert.equal(events.data.length, 1, "la copia directa deja exactamente un evento");
    assert.equal(events.data[0].outcome, "assigned");
    assert.equal(events.data[0].payload.source, "manual");
    assert.equal(events.data[0].payload.template_id, templateId);
    assert.equal(
      Number(sql(`select count(*) from public.routine_assignment_events where patient_id='${patient.id}'`)),
      before + 1,
    );
    // El evento generó su aviso para el equipo, igual que el camino con reglas.
    const alert = await pro.api.from("alerts").select("payload")
      .eq("patient_id", patient.id).eq("type", "routine_assignment")
      .order("created_at", { ascending: false }).limit(1);
    assert.equal(alert.error, null);
    assert.equal(alert.data[0].payload.routine_id, routineId);
    assert.equal(alert.data[0].payload.outcome, "assigned");

    // Segunda llamada directa: rutina nueva, evento nuevo. No se acumulan en la
    // misma rutina (idempotencia del registrador).
    const again = await pro.api.rpc("copy_routine_template", { patient_id: patient.id, template_id: templateId });
    assert.equal(again.error, null);
    assert.notEqual(again.data, routineId);
    assert.equal(
      Number(sql(`select count(*) from public.routine_assignment_events where routine_id='${routineId}'`)),
      1,
    );

    // El paciente no puede leer el registro de decisiones.
    assert.deepEqual(
      (await patient.api.from("routine_assignment_events").select("id").eq("routine_id", routineId)).data,
      [],
    );
  });
  // ---- KAN-9 · D1: el motor se dispara solo al terminar el registro ---------

  /** Termina el registro **como el propio paciente**, que es quien lo hace. */
  const terminarRegistro = (persona, conditions = []) =>
    persona.api.rpc("finish_patient_onboarding", {
      patient_id: persona.id,
      conditions,
    });

  const rutinasDe = (persona) =>
    sql(`select coalesce(string_agg(status::text || ':' || coalesce(source_template_id::text,'-'), ','), '')
           from public.routines where patient_id = '${persona.id}'`);

  await t.test("D1 · al terminar el registro la rutina se asigna sola", async () => {
    const recién = await person("patient", null, { step: 2 });
    assert.equal(rutinasDe(recién), "", "Un paciente a medio registrar no tiene rutina");
    // La plantilla no se fija: un subtest anterior repunta la regla, y lo que
    // se comprueba aquí es que gana **la que gana ahora**, no una en concreto.
    const esperada = sql(`select template_id from public.assignment_rules where id = '${ruleId}'`);

    // Nadie pulsa nada: esto es lo único que hace el paciente.
    const { error } = await terminarRegistro(recién);
    assert.equal(error, null, "Terminar el registro no puede fallar");

    assert.equal(
      rutinasDe(recién),
      `active:${esperada}`,
      "Al terminar el registro tiene que quedar una rutina activa de la plantilla que gana",
    );
    // El paciente la ve: es el punto 2 del alcance.
    const suya = await recién.api.from("routines").select("id, status").eq("patient_id", recién.id);
    assert.equal(suya.error, null);
    assert.equal(suya.data.length, 1);
    assert.equal(suya.data[0].status, "active");

    // Y queda la traza, marcada como automática para distinguirla del botón.
    const evento = sql(
      `select outcome || '|' || coalesce(payload->>'source','-') || '|' || coalesce(payload->>'rule_id','-')
         from public.routine_assignment_events where patient_id = '${recién.id}'`,
    );
    assert.equal(evento, `assigned|onboarding|${ruleId}`);

    // El paso queda en 3 aunque la asignación haya escrito por el camino.
    assert.equal(
      sql(`select onboarding_step from public.patient_details where profile_id='${recién.id}'`),
      "3",
    );

    // Reentrante: volver a llamar no asigna una segunda rutina.
    assert.equal((await terminarRegistro(recién)).error, null);
    assert.equal(rutinasDe(recién), `active:${esperada}`);
    assert.equal(
      Number(sql(`select count(*) from public.routine_assignment_events where patient_id='${recién.id}'`)),
      1,
    );
  });

  await t.test("D1 · sin regla compatible no se inventa una rutina, y se avisa", async () => {
    // `seed:rules` incluye «Acondicionamiento general» sin condiciones, que
    // gana siempre: sin desactivar las reglas, `no_match` es inalcanzable. Es
    // el comportamiento correcto del negocio, y por eso hay que provocarlo.
    const activas = sql(`select coalesce(string_agg(id::text, ','), '') from public.assignment_rules where is_active`);
    assert.ok(activas, "La base tiene que tener alguna regla activa para esta prueba");
    const restaurar = () =>
      sql(`update public.assignment_rules set is_active = true
            where id in (${activas.split(",").map((id) => `'${id}'`).join(",")})`);
    sql(`update public.assignment_rules set is_active = false`);
    try {
      const huérfano = await person("patient", null, { step: 2 });
      assert.equal((await terminarRegistro(huérfano)).error, null);

      assert.equal(rutinasDe(huérfano), "", "Sin regla compatible no se crea ninguna rutina");
      assert.equal(
        sql(`select outcome from public.routine_assignment_events where patient_id='${huérfano.id}'`),
        "no_match",
      );
      // El trigger avisa al equipo para que alguien la prepare a mano.
      assert.ok(
        Number(sql(`select count(*) from public.alerts where patient_id='${huérfano.id}' and type='routine_assignment'`)) > 0,
        "El caso sin coincidencia tiene que dejar aviso al equipo",
      );
      // Y el registro sí quedó terminado: el paciente no se queda a medias.
      assert.equal(
        sql(`select onboarding_step from public.patient_details where profile_id='${huérfano.id}'`),
        "3",
      );
    } finally {
      restaurar();
    }
  });

  await t.test("D1 · si el tamizaje deja el día corto, la rutina espera revisión", async () => {
    // Plantilla y regla propias, con un perfil que ninguna otra regla de la
    // prueba usa: así esta gana sin desordenar los demás subtests.
    const cortaId = randomUUID(), reglaCortaId = randomUUID();
    const hombroA = randomUUID(), hombroB = randomUUID();
    sql(`insert into public.exercises(id, name, contraindications, is_custom) values
          ('${hombroA}', 'Empuje de hombro A de prueba', '{shoulder}', true),
          ('${hombroB}', 'Empuje de hombro B de prueba', '{shoulder}', true);
        insert into public.routine_templates(id, name, kind) values ('${cortaId}', 'Rutina corta de prueba', 'physio');
        insert into public.template_days(template_id, day_number, title) values ('${cortaId}', 1, 'Día único');
        insert into public.template_items(template_day_id, exercise_id, position, sets, reps)
          select id, '${safeId}', 1, 3, 10 from public.template_days where template_id = '${cortaId}';
        insert into public.template_items(template_day_id, exercise_id, position, sets, reps)
          select id, '${hombroA}', 2, 3, 10 from public.template_days where template_id = '${cortaId}';
        insert into public.template_items(template_day_id, exercise_id, position, sets, reps)
          select id, '${hombroB}', 3, 3, 10 from public.template_days where template_id = '${cortaId}';
        insert into public.assignment_rules(id, name, priority, conditions, template_id)
          values ('${reglaCortaId}', 'Regla corta de prueba', -2000000,
            '{"goal":["rehab"],"level":["beginner"],"environment":["home"]}', '${cortaId}');`);
    try {
      const frágil = await person("patient", null, {
        step: 2, goal: "rehab", level: "beginner", environment: "home", equipment: "{none}",
      });
      // La condición se registra en el mismo envío que cierra el registro, que
      // es como llega de verdad desde el formulario del paciente.
      assert.equal(
        (await terminarRegistro(frágil, [{ body_part: "shoulder", severity: "moderate" }])).error,
        null,
      );

      assert.equal(
        rutinasDe(frágil),
        `pending_review:${cortaId}`,
        "De tres ejercicios, dos contraindicados dejan el día corto",
      );
      assert.equal(
        sql(`select outcome from public.routine_assignment_events where patient_id='${frágil.id}'`),
        "pending_review",
      );
      // **El paciente no la ve**: una propuesta incompleta es del equipo.
      const suya = await frágil.api.from("routines").select("id").eq("patient_id", frágil.id);
      assert.equal(suya.error, null);
      assert.deepEqual(suya.data, []);
    } finally {
      sql(`delete from public.routines where source_template_id = '${cortaId}';
           delete from public.assignment_rules where id = '${reglaCortaId}';
           delete from public.routine_templates where id = '${cortaId}';
           delete from public.exercises where id in ('${hombroA}', '${hombroB}')`);
    }
  });
});
