/**
 * Verifica la asignación manual de rutinas (ADR-0009 y ADR-0010, change
 * `manual-routine-assignment`): elegir una plantilla crea un borrador que el
 * paciente no ve, se ajusta y se confirma; la especialidad se comprueba en la
 * base; terminar el registro ya no asigna nada.
 *
 * Requiere Supabase local encendido con la semilla base (`npm run db:reset`)
 * y la app en marcha en el 3000 (`npm run dev` o `next start`). No necesita
 * catálogo, plantillas ni reglas sembradas: crea sus propios ejercicios,
 * plantillas, una regla y personas, y los borra al terminar.
 *
 * Uso:  npm run test:routines
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { status, sql as rawSql, httpClient } from "./helpers/auth-http.mjs";

const sql = (query) => rawSql(query).trim().split("\n")[0];
const password = "Rutinas-prueba-1234";
const client = () => createClient(status.API_URL, status.ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const decode = (text) => text.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
const forms = (html) => [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map((m) => m[0]);
/** El cuerpo de un formulario del HTML, como lo enviaría un navegador sin JavaScript. */
function formBody(html, marker) {
  const form = forms(html).find((value) => value.includes(marker));
  assert.ok(form, `No se encontró el formulario ${marker}`);
  const body = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const attrs = Object.fromEntries([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], decode(m[2])]));
    if (attrs.type === "hidden" && attrs.name) body.append(attrs.name, attrs.value ?? "");
  }
  return body;
}

/**
 * Descartar: el formulario con el `routineId` que **no** lleva `name="patientId"`
 * (el de confirmar, que va antes, también lleva el `routineId`).
 */
async function discard(session, route, routineId) {
  const { html } = await session.request(route);
  const form = forms(html).find((value) => value.includes(`value="${routineId}"`) && !value.includes('name="patientId"'));
  assert.ok(form, "No se encontró el formulario de descartar");
  return session.request(route, { method: "POST", body: formBody(form, "") });
}

test("Asignación manual: borrador, confirmación, especialidad y registro", { timeout: 240000 }, async (t) => {
  const users = [];
  const ids = {
    safe: randomUUID(), excluded: randomUUID(),
    trainingA: randomUUID(), physioB: randomUUID(), emptyDayC: randomUUID(), shortD: randomUUID(), replaceE: randomUUID(),
    rule: randomUUID(),
  };
  const templateIds = [ids.trainingA, ids.physioB, ids.emptyDayC, ids.shortD, ids.replaceE];
  const inList = (values) => values.map((v) => `'${v}'`).join(",");
  t.after(async () => {
    const people = inList(users.map((u) => u.id));
    sql(`delete from public.alerts where patient_id in (${people});
      delete from public.routine_schedules where patient_id in (${people});
      delete from public.routines where patient_id in (${people});
      delete from public.assignment_rules where id = '${ids.rule}';
      delete from public.routine_templates where id in (${inList(templateIds)});
      delete from public.exercises where id in ('${ids.safe}', '${ids.excluded}');`);
    for (const user of users) { await user.api.auth.signOut(); sql(`delete from auth.users where id = '${user.id}'`); }
  });

  async function person(role, specialty = null, { step = 3 } = {}) {
    const api = client(), email = `rutinas-${randomUUID()}@demo.local`;
    const { data, error } = await api.auth.signUp({ email, password });
    assert.equal(error, null);
    const user = { api, email, id: data.user.id, role };
    users.push(user);
    sql(`update public.profiles set role = '${role}', specialty = ${specialty ? `'${specialty}'` : "null"}, full_name = 'Prueba de rutinas ${role}' where id = '${user.id}'`);
    if (role === "patient")
      sql(`insert into public.patient_details(profile_id, goal, level, environment, equipment, onboarding_step)
        values ('${user.id}', 'performance', 'advanced', 'gym', '{barbell}', ${step})`);
    return user;
  }
  async function web(user) {
    const session = httpClient();
    await session.submit("/login", { email: user.email, password });
    return session;
  }

  const admin = await person("admin");
  const pro = await person("professional", "training");
  const physio = await person("professional", "physio");
  const outsider = await person("professional", "training");
  const patient = await person("patient");
  const second = await person("patient");
  sql(`insert into public.care_assignments(patient_id, professional_id, kind) values
      ('${patient.id}', '${pro.id}', 'training'), ('${patient.id}', '${physio.id}', 'physio'),
      ('${second.id}', '${pro.id}', 'training');
    insert into public.patient_conditions(patient_id, body_part) values ('${patient.id}', 'knee'), ('${second.id}', 'knee');
    insert into public.exercises(id, name, contraindications, is_custom) values
      ('${ids.safe}', 'Movimiento permitido de prueba', '{}', true),
      ('${ids.excluded}', 'Movimiento excluido de prueba', '{knee}', true);
    insert into public.routine_templates(id, name, kind, level, environment, days_per_week) values
      ('${ids.trainingA}', 'Rutina de prueba A', 'training', 'advanced', 'gym', 1),
      ('${ids.physioB}', 'Rutina de prueba B', 'physio', 'beginner', 'home', 1),
      ('${ids.emptyDayC}', 'Rutina de prueba C', 'training', 'beginner', 'home', 2),
      ('${ids.shortD}', 'Rutina de prueba D', 'training', 'beginner', 'home', 1),
      ('${ids.replaceE}', 'Rutina de prueba E', 'training', 'advanced', 'gym', 1);
    insert into public.template_days(template_id, day_number, title)
      select id, 1, 'Día uno' from public.routine_templates where id in (${inList(templateIds)});
    insert into public.template_days(template_id, day_number, title) values ('${ids.emptyDayC}', 2, 'Día dos');
    insert into public.template_items(template_day_id, exercise_id, position, sets, reps, rest_seconds)
      select d.id, '${ids.safe}', p, 3, 12, 60 from public.template_days d cross join generate_series(1, 3) p
      where d.day_number = 1 and d.template_id in ('${ids.trainingA}', '${ids.physioB}', '${ids.emptyDayC}', '${ids.replaceE}');
    insert into public.template_items(template_day_id, exercise_id, position, sets, reps, rest_seconds)
      select d.id, '${ids.safe}', p, 3, 12, 60 from public.template_days d cross join generate_series(1, 2) p
      where d.template_id = '${ids.shortD}';
    insert into public.template_items(template_day_id, exercise_id, position, sets, reps)
      select id, '${ids.excluded}', 4, 3, 10 from public.template_days where template_id = '${ids.trainingA}';
    insert into public.template_items(template_day_id, exercise_id, position, sets, reps)
      select id, '${ids.excluded}', 1, 3, 10 from public.template_days where template_id = '${ids.emptyDayC}' and day_number = 2;
    insert into public.assignment_rules(id, name, priority, conditions, template_id)
      values ('${ids.rule}', 'Regla que ya no asigna', -1000000,
        '{"goal":["performance"],"level":["advanced"],"environment":["gym"]}', '${ids.trainingA}');`);

  const route = (target) => `/pro/routines/${target.id}`;
  const templateContents = () => sql(`select jsonb_agg(to_jsonb(i) order by i.id)
    from public.template_items i join public.template_days d on d.id = i.template_day_id where d.template_id = '${ids.trainingA}'`);
  const original = templateContents();
  const routinesOf = (target, where = "true") =>
    sql(`select coalesce(string_agg(status::text || ':' || coalesce(source_template_id::text, '-'), ',' order by created_at), '')
      from public.routines where patient_id = '${target.id}' and ${where}`);
  const events = (target) => sql(`select count(*) from public.routine_assignment_events where patient_id = '${target.id}'`);
  const alerts = (target) => sql(`select count(*) from public.alerts where patient_id = '${target.id}'`);
  const draftOf = (target, kind = "training") =>
    sql(`select id from public.routines where patient_id = '${target.id}' and kind = '${kind}' and status = 'pending_review'`);
  const proWeb = await web(pro);
  let stepOne, draftId;

  await t.test("Paso ①: plantillas del tipo, sin recomendada ni buscador", async () => {
    const { html, response } = await proWeb.request(route(patient));
    assert.equal(response.status, 200);
    stepOne = html;
    assert.match(html, /aria-current="step"[^>]*>[\s\S]*?Elegir plantilla/);
    assert.match(html, /Rutina de prueba A/);
    assert.match(html, /Rutina de prueba E/);
    assert.ok(!html.includes("Rutina de prueba B"), "El entrenador no ve plantillas de rehabilitación");
    assert.ok(!/recomendada/i.test(html));
    assert.ok(!html.includes('name="patientId"'), "Elegir no lleva el marcador de confirmar");
    assert.ok(!html.includes('id="catalogo-buscador"'), "Sin foco no hay buscador del catálogo");
    // La ficha del paciente y el aviso de lo que se quitaría.
    assert.match(html, /Rendimiento/);
    assert.match(html, /Rodilla/);
    assert.match(html, /quitará 1 ejercicio/);
    // Filtros por enlace; un valor inválido se ignora; `?tipo=` no cambia el tipo del profesional.
    const beginner = await proWeb.request(`${route(patient)}?nivel=beginner`);
    assert.ok(!beginner.html.includes("Rutina de prueba A"));
    assert.match(beginner.html, /Rutina de prueba C/);
    assert.match(beginner.html, /Quitar los filtros/);
    const invalid = await proWeb.request(`${route(patient)}?dias=99&nivel=nada`);
    assert.equal(invalid.response.status, 200);
    assert.match(invalid.html, /Rutina de prueba A/);
    const forced = await proWeb.request(`${route(patient)}?tipo=physio`);
    assert.ok(!forced.html.includes("Rutina de prueba B"));
  });

  await t.test("Elegir crea un borrador invisible, sin eventos ni alertas", async () => {
    const result = await proWeb.submit(route(patient), {}, `value="${ids.trainingA}"`);
    assert.equal(result.response.status, 200);
    assert.match(result.html, /Borrador creado/);
    draftId = draftOf(patient);
    assert.match(draftId, /^[a-f0-9-]{36}$/);
    assert.equal(routinesOf(patient), `pending_review:${ids.trainingA}`);
    assert.equal(sql(`select count(*) from public.routine_items i join public.routine_days d on d.id = i.routine_day_id where d.routine_id = '${draftId}'`), "3");
    assert.match(sql(`select replace(notes, e'\\n', ' ') from public.routines where id = '${draftId}'`),
      /se quitó «Movimiento excluido de prueba», contraindicado para Rodilla/);
    assert.equal(sql(`select assigned_by is null and starts_on is null from public.routines where id = '${draftId}'`), "t");
    assert.equal(templateContents(), original);
    assert.equal(events(patient), "0");
    assert.equal(alerts(patient), "0");
    // El paciente no ve nada del borrador.
    assert.deepEqual((await patient.api.from("routines").select("id")).data, []);
    assert.deepEqual((await patient.api.from("routine_days").select("id").eq("routine_id", draftId)).data, []);
    const patientWeb = await web(patient);
    assert.match((await patientWeb.request("/routine")).html, /Tu profesional está preparando tu rutina/);
    // El paso ②: el primer formulario con `name="patientId"` es el de confirmar.
    const { html } = await proWeb.request(route(patient));
    const first = forms(html).find((form) => form.includes('name="patientId"'));
    assert.match(first, /id="assign-routine"/);
    assert.match(html, /Qué se excluyó/);
    assert.match(html, /Borrador/);
    assert.match(html, /Descartar y elegir otra/);
  });

  await t.test("Un segundo envío no crea otro borrador y explica por qué", async () => {
    const stale = await proWeb.request(route(patient), { method: "POST", body: formBody(stepOne, `value="${ids.trainingA}"`) });
    assert.match(stale.html, /ya tiene un borrador/);
    const rpc = await pro.api.rpc("create_routine_draft", { target_patient: patient.id, template_id: ids.replaceE });
    assert.equal(rpc.error?.code, "22023");
    assert.match(rpc.error.message, /ya tiene un borrador de entrenamiento/);
    assert.equal(routinesOf(patient), `pending_review:${ids.trainingA}`);
    // El índice lo impide también por inserción directa.
    const direct = await pro.api.from("routines").insert({ patient_id: patient.id, kind: "training", name: "Otro borrador", status: "pending_review" });
    assert.equal(direct.error?.code, "23505");
  });

  await t.test("Un borrador no se activa sin confirmar", async () => {
    const forced = await pro.api.from("routines").update({ status: "active" }).eq("id", draftId);
    assert.equal(forced.error?.code, "42501");
    assert.equal(routinesOf(patient), `pending_review:${ids.trainingA}`);
  });

  await t.test("La especialidad limita quién crea, confirma y descarta (ADR-0010)", async () => {
    const anonymous = { api: client() };
    for (const actor of [patient, anonymous, outsider]) {
      assert.equal((await actor.api.rpc("create_routine_draft", { target_patient: patient.id, template_id: ids.trainingA })).error?.code, "42501");
      assert.equal((await actor.api.rpc("confirm_routine_draft", { target_routine: draftId })).error?.code, "42501");
      assert.equal((await actor.api.rpc("discard_routine_draft", { target_routine: draftId })).error?.code, "42501");
    }
    // Entrenador con plantilla de rehabilitación, por las dos puertas.
    assert.equal((await pro.api.rpc("create_routine_draft", { target_patient: patient.id, template_id: ids.physioB })).error?.code, "42501");
    assert.equal((await pro.api.rpc("copy_routine_template", { patient_id: patient.id, template_id: ids.physioB })).error?.code, "42501");
    // El fisioterapeuta del paciente no confirma ni descarta el borrador de entrenamiento.
    assert.equal((await physio.api.rpc("confirm_routine_draft", { target_routine: draftId })).error?.code, "42501");
    assert.equal((await physio.api.rpc("discard_routine_draft", { target_routine: draftId })).error?.code, "42501");
    assert.equal(routinesOf(patient, "kind = 'physio'"), "");
    // El administrador puede los dos tipos.
    const physioDraft = await admin.api.rpc("create_routine_draft", { target_patient: patient.id, template_id: ids.physioB });
    assert.equal(physioDraft.error, null);
    assert.equal((await admin.api.rpc("discard_routine_draft", { target_routine: physioDraft.data })).error, null);
    assert.equal(routinesOf(patient, "kind = 'physio'"), `archived:${ids.physioB}`);
    // El profesional ajeno ni siquiera abre la pantalla.
    const outsiderWeb = await web(outsider);
    const denied = await outsiderWeb.request(route(patient));
    assert.match(denied.html, /404|could not be found/);
    assert.ok(!denied.html.includes('name="patientId"'));
  });

  await t.test("Añadir a mano un contraindicado se permite con aviso", async () => {
    const dayId = sql(`select id from public.routine_days where routine_id = '${draftId}'`);
    const open = `${route(patient)}?dia=${dayId}&q=Movimiento+excluido`;
    const result = await proWeb.submit(open, {}, `value="${ids.excluded}"`);
    assert.match(result.html, /Ejercicio añadido al final del día\./);
    const { html } = await proWeb.request(route(patient));
    assert.match(html, /Contraindicado para Rodilla/);
    assert.match(html, /Sustitúyelo/);
    sql(`delete from public.routine_items where routine_day_id = '${dayId}' and exercise_id = '${ids.excluded}'`);
  });

  await t.test("Confirmar publica la rutina y avisa a quien entrena ese tipo", async () => {
    const result = await proWeb.submit(route(patient), {}, 'name="patientId"');
    assert.match(result.html, /Rutina asignada\. El paciente ya puede consultarla/);
    assert.equal(routinesOf(patient, "kind = 'training'"), `active:${ids.trainingA}`);
    assert.equal(sql(`select (assigned_by = '${pro.id}' and starts_on = (now() at time zone 'America/Bogota')::date)::text from public.routines where id = '${draftId}'`), "true");
    assert.equal(sql(`select outcome || '|' || (payload->>'source') from public.routine_assignment_events where routine_id = '${draftId}'`), "assigned|manual");
    const own = await pro.api.from("alerts").select("payload").eq("patient_id", patient.id);
    assert.equal(own.data.length, 1);
    assert.equal(own.data[0].payload.routine_id, draftId);
    assert.deepEqual((await physio.api.from("alerts").select("id").eq("patient_id", patient.id)).data, []);
    const patientWeb = await web(patient);
    const { html } = await patientWeb.request("/routine");
    assert.match(html, /Rutina de prueba A/);
    assert.ok(!html.includes("Pendiente de revisión"));
  });

  await t.test("Con la activa, el paso ③ y el aviso de la rutina del otro tipo", async () => {
    const { html } = await proWeb.request(route(patient));
    assert.match(html, /aria-current="step"[^>]*>[\s\S]*?Rutina activa/);
    assert.match(html, /Cambiar de plantilla/);
    assert.ok(!html.includes('id="catalogo-buscador"'));
    sql(`insert into public.routines(patient_id, kind, name, status, starts_on) values ('${patient.id}', 'physio', 'Rehabilitación ajena de prueba', 'active', current_date)`);
    const trainerView = await proWeb.request(route(patient));
    assert.match(trainerView.html, /También tiene una rutina de rehabilitación activa/);
    const physioWeb = await web(physio);
    const physioView = await physioWeb.request(route(patient));
    assert.match(physioView.html, /También tiene una rutina de entrenamiento activa/);
    assert.ok(!physioView.html.includes("Movimiento permitido de prueba"), "Sin los ejercicios del otro tipo");
    // El admin cambia de tipo con los chips.
    const adminWeb = await web(admin);
    const adminView = await adminWeb.request(`${route(patient)}?tipo=physio`);
    assert.match(adminView.html, /Rehabilitación ajena de prueba/);
    assert.match(adminView.html, /aria-current="step"[^>]*>[\s\S]*?Rutina activa/);
    // Edición compartida: el fisioterapeuta sigue pudiendo ajustar la de entrenamiento.
    const item = sql(`select i.id from public.routine_items i join public.routine_days d on d.id = i.routine_day_id where d.routine_id = '${draftId}' limit 1`);
    const shared = await physio.api.from("routine_items").update({ sets: 4 }).eq("id", item).select("sets");
    assert.equal(shared.error, null);
    assert.equal(shared.data[0].sets, 4);
  });

  await t.test("Reemplazar la activa conserva su historial; descartar no la toca", async () => {
    const dayId = sql(`select id from public.routine_days where routine_id = '${draftId}'`);
    sql(`insert into public.sessions(routine_id, routine_day_id, patient_id) values ('${draftId}', '${dayId}', '${patient.id}')`);
    // Una sesión programada de la activa: crear el borrador no la cancela.
    const planned = sql(`insert into public.routine_schedules(patient_id, routine_day_id, scheduled_on, created_by)
      values ('${patient.id}', '${dayId}', (now() at time zone 'America/Bogota')::date + 1, '${pro.id}') returning id`);
    await proWeb.submit(`${route(patient)}?paso=plantilla`, {}, `value="${ids.replaceE}"`);
    const replacement = draftOf(patient);
    assert.equal(sql(`select status from public.routines where id = '${draftId}'`), "active");
    assert.equal(sql(`select cancelled_at is null from public.routine_schedules where id = '${planned}'`), "t");
    const { html } = await proWeb.request(route(patient));
    assert.match(html, /ya tiene una rutina activa de este tipo/);
    // Descartar: la activa sigue igual.
    const discarded = await discard(proWeb, route(patient), replacement);
    assert.match(discarded.html, /Borrador descartado/);
    assert.equal(sql(`select status from public.routines where id = '${replacement}'`), "archived");
    assert.equal(sql(`select status from public.routines where id = '${draftId}'`), "active");
    // Elegir otra vez y confirmar: la anterior se cierra con sus sesiones.
    await proWeb.submit(`${route(patient)}?paso=plantilla`, {}, `value="${ids.replaceE}"`);
    const confirmed = await proWeb.submit(route(patient), {}, 'name="patientId"');
    assert.match(confirmed.html, /Rutina asignada\. El paciente ya puede consultarla/);
    assert.equal(sql(`select status || '|' || (ends_on is not null) from public.routines where id = '${draftId}'`), "completed|true");
    assert.equal(sql(`select count(*) from public.sessions where routine_id = '${draftId}'`), "1");
    assert.equal(routinesOf(patient, "kind = 'training' and status = 'active'"), `active:${ids.replaceE}`);
    assert.match((await proWeb.request(route(patient))).html, /Rutinas anteriores de entrenamiento/);
  });

  await t.test("Un día vacío bloquea la confirmación; los días cortos solo avisan", async () => {
    const created = await proWeb.submit(route(second), {}, `value="${ids.emptyDayC}"`);
    assert.match(created.html, /Borrador creado/);
    const empty = draftOf(second);
    const rejected = await pro.api.rpc("confirm_routine_draft", { target_routine: empty });
    assert.equal(rejected.error?.code, "22023");
    assert.match(rejected.error.message, /El día 2 no tiene ejercicios/);
    const screen = await proWeb.submit(route(second), {}, 'name="patientId"');
    assert.match(screen.html, /El día 2 no tiene ejercicios/);
    assert.equal(routinesOf(second), `pending_review:${ids.emptyDayC}`);
    await discard(proWeb, route(second), empty);
    await proWeb.submit(route(second), {}, `value="${ids.shortD}"`);
    const short = draftOf(second);
    const { html } = await proWeb.request(route(second));
    assert.match(html, /El día 1 tiene menos de tres ejercicios/);
    const confirmed = await pro.api.rpc("confirm_routine_draft", { target_routine: short });
    assert.equal(confirmed.error, null);
    assert.deepEqual(confirmed.data.short_days, [1]);
    assert.equal(sql(`select status from public.routines where id = '${short}'`), "active");
  });

  await t.test("Terminar el registro no asigna rutina, aunque una regla coincida", async () => {
    const newcomer = await person("patient", null, { step: 2 });
    const done = await newcomer.api.rpc("finish_patient_onboarding", { patient_id: newcomer.id, conditions: [] });
    assert.equal(done.error, null);
    assert.equal(sql(`select onboarding_step from public.patient_details where profile_id = '${newcomer.id}'`), "3");
    assert.equal(routinesOf(newcomer), "");
    assert.equal(events(newcomer), "0");
    assert.equal(alerts(newcomer), "0");
    const newcomerWeb = await web(newcomer);
    assert.match((await newcomerWeb.request("/routine")).html, /Tu profesional está preparando tu rutina/);
  });

  await t.test("Sin el registro terminado no se prepara la rutina", async () => {
    const pending = await person("patient", null, { step: 2 });
    const rejected = await admin.api.rpc("create_routine_draft", { target_patient: pending.id, template_id: ids.trainingA });
    assert.equal(rejected.error?.code, "22023");
    assert.match(rejected.error.message, /completar su perfil/);
    assert.equal(routinesOf(pending), "");
    const adminWeb = await web(admin);
    const { html } = await adminWeb.request(route(pending));
    assert.match(html, /aún no termina su registro/);
    assert.ok(!html.includes(`value="${ids.trainingA}"`));
  });

  await t.test("BACK-003 · la copia directa por RPC sigue dejando su evento manual", async () => {
    const copy = await pro.api.rpc("copy_routine_template", { patient_id: second.id, template_id: ids.replaceE });
    assert.equal(copy.error, null);
    const logged = await pro.api.from("routine_assignment_events").select("outcome, payload").eq("routine_id", copy.data);
    assert.equal(logged.data.length, 1);
    assert.equal(logged.data[0].outcome, "assigned");
    assert.equal(logged.data[0].payload.source, "manual");
    assert.deepEqual((await second.api.from("routine_assignment_events").select("id")).data, []);
  });
});
