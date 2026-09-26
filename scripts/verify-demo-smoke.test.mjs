import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { JSDOM } from "jsdom";
import { appUrl, status, sql, httpClient, expectRedirect } from "./helpers/auth-http.mjs";
import { todayInBogota, addDays } from "../lib/routines/calendar.ts";

// Solo infraestructura local: auth-http rechaza destinos remotos antes de crear datos.
// Las acciones del recorrido usan sesiones reales; SQL prepara y retira las fixtures.
const api = () => createClient(status.API_URL, status.ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const value = (query) => sql(query).trim().split("\n")[0];
const rows = async (query) => {
  const result = await query;
  assert.equal(result.error, null, result.error?.message);
  return result.data;
};

async function submitSelected(web, route, selector, values) {
  const page = await web.request(route);
  assert.equal(page.response.status, 200);
  const dom = new JSDOM(page.html);
  try {
    const form = dom.window.document.querySelector(selector);
    assert.ok(form, `Falta el formulario ${selector}`);
    const body = new FormData();
    for (const input of form.querySelectorAll('input[type="hidden"][name]')) body.append(input.name, input.value);
    assert.ok([...body.keys()].some((key) => key.startsWith("$ACTION_")));
    for (const [key, value] of Object.entries(values)) body.set(key, value);
    return web.request(route, { method: "POST", body });
  } finally {
    dom.window.close();
  }
}

test("Smoke de demo: trainer, fisioterapeuta y cliente", { timeout: 300_000 }, async (t) => {
  const marker = randomUUID();
  const password = `Demo-${marker}!`;
  const users = [];
  const templates = [randomUUID(), randomUUID()];
  const exercises = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const today = todayInBogota();
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const contexts = [];
  const admin = api();
  t.after(async () => {
    mkdirSync("work/smoke", { recursive: true });
    for (const [index, context] of contexts.entries()) await context.tracing.stop({ path: `work/smoke/recorrido-${index}.zip` });
    await browser.close();
    // Se registran los correos antes de intentar el alta: limpia incluso un fallo a mitad.
    const emails = users.map((user) => `'${user.email}'`).join(",");
    if (emails) sql(`
      delete from public.routine_schedules where patient_id in (select id from auth.users where email in (${emails}));
      delete from public.routines where patient_id in (select id from auth.users where email in (${emails}));
      delete from public.alerts where patient_id in (select id from auth.users where email in (${emails}));
      delete from public.person_registrations where email in (${emails})
        or created_by in (select id from auth.users where email in (${emails}));
      delete from auth.users where email in (${emails});`);
    sql(`delete from public.routine_templates where id in ('${templates.join("','")}');
      delete from public.exercises where id in ('${exercises.join("','")}');`);
    await admin.auth.signOut();
    for (const user of users) await user.api?.auth.signOut();
    assert.equal(Number(value(`select count(*) from auth.users where email like 'smoke-%${marker}@demo.local'`)), 0);
  });
  assert.equal((await admin.auth.signInWithPassword({ email: "admin@demo.local", password: "demo1234" })).error, null);

  async function person(name, role, specialty) {
    const user = { name: `Smoke ${name} ${marker}`, email: `smoke-${name}-${marker}@demo.local`, api: api(), web: httpClient() };
    users.push(user);
    const reservation = await admin.rpc("prepare_person_registration", {
      person_email: user.email, person_name: user.name, person_phone: "",
      person_role: role, person_specialty: specialty,
    });
    assert.equal(reservation.error, null);
    const signup = await user.api.auth.signUp({ email: user.email, password,
      options: { data: { registration_token: reservation.data } } });
    assert.equal(signup.error, null);
    user.id = signup.data.user.id;
    expectRedirect(await user.web.submit("/login", { email: user.email, password }), role === "patient" ? "/patient" : "/pro");
    return user;
  }

  async function open(page, route) {
    const response = await page.goto(new URL(route, appUrl).href);
    assert.equal(response.status(), 200, `No abrió ${route}`);
    await page.locator("h1").waitFor();
    // El tema marca su opción solo después de hidratar; no interactuar con HTML aún inerte.
    await page.locator('[aria-label="Tema de la aplicación"] [aria-checked="true"]').waitFor();
    assert.doesNotMatch(await page.locator("body").innerText(), /Application error|Internal Server Error|could not be found|No pudimos cargar|Algo salió mal/i);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Desbordamiento horizontal en ${route}`);
  }

  async function screen(user, mobile = false) {
    const context = await browser.newContext({ viewport: mobile ? { width: 375, height: 812 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    contexts.push(context);
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on("pageerror", (error) => failures.push(`${new URL(page.url()).pathname}: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error") failures.push(`${new URL(page.url()).pathname}: ${message.text()}`); });
    page.on("response", (response) => {
      if (response.status() >= 400 && new URL(response.url()).origin === new URL(appUrl).origin)
        failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    await open(page, "/login");
    await page.locator('[name="email"]').fill(user.email);
    await page.locator('[name="password"]').fill(password);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(`**/${user === patient ? "patient" : "pro"}`);
    await page.getByRole("button", { name: "Cerrar sesión", exact: true }).waitFor();
    return page;
  }

  // Las trazas quedan en work/ (ignorado por Git), con datos ficticios y credenciales locales.
  const trainer = await person("trainer", "professional", "training");
  const physio = await person("fisio", "professional", "physio");
  const outsider = await person("ajeno", "professional", "training");
  let patient;
  const assigned = [];

  await t.test("Trainer: alta del cliente y vínculo automático", async () => {
    patient = { name: `Cliente smoke ${marker}`, email: `smoke-cliente-${marker}@demo.local`, api: api(), web: httpClient() };
    users.push(patient);
    const result = await trainer.web.submit("/people", {
      fullName: patient.name, email: patient.email, password, phone: "", role: "patient",
    }, 'name="fullName"');
    assert.match(result.html, /Persona creada\./);
    const login = await patient.api.auth.signInWithPassword({ email: patient.email, password });
    assert.equal(login.error, null);
    patient.id = login.data.user.id;
    const links = await rows(trainer.api.from("care_assignments").select("professional_id,kind").eq("patient_id", patient.id));
    assert.deepEqual(links, [{ professional_id: trainer.id, kind: "training" }]);
    assert.equal((await admin.from("care_assignments").insert({ patient_id: patient.id, professional_id: physio.id, kind: "physio" })).error, null);
  });

  await t.test("Cliente: ingreso y onboarding persistente con condición de rodilla", async () => {
    expectRedirect(await patient.web.submit("/login", { email: patient.email, password }), "/patient");
    expectRedirect(await patient.web.request("/patient"), "/patient/onboarding");
    for (const data of [
      { step: "1", goal: "performance", level: "advanced" },
      { step: "2", environment: "gym", equipment: ["barbell"] },
      { step: "3", conditions: JSON.stringify([{ body_part: "knee", severity: "moderate", notes: "Condición para smoke" }]) },
    ]) expectRedirect(await patient.web.submit("/patient/onboarding", data, 'name="step"'), data.step === "3" ? "/patient" : "/patient/onboarding");
    assert.deepEqual(await rows(patient.api.from("patient_details").select("goal,level,environment,equipment,onboarding_step").eq("profile_id", patient.id).single()), {
      goal: "performance", level: "advanced", environment: "gym", equipment: ["barbell"], onboarding_step: 3,
    });
    assert.equal((await rows(patient.api.from("patient_conditions").select("body_part").eq("patient_id", patient.id)))[0].body_part, "knee");
  });

  // Tres ejercicios seguros y uno realmente contraindicado: la exclusión no es trivial.
  for (const [index, id] of exercises.entries()) sql(`insert into public.exercises(id,name,description,media_url,contraindications,is_custom)
    values('${id}','Smoke ejercicio ${index + 1}','Movimiento controlado para la demostración.','/icons/icon-192.png','${index === 3 ? "{knee}" : "{}"}',true)`);
  for (const [index, id] of templates.entries()) sql(`
    insert into public.routine_templates(id,name,kind,days_per_week) values('${id}','Smoke ${index === 0 ? "entrenamiento" : "rehabilitación"}','${index === 0 ? "training" : "physio"}',1);
    insert into public.template_days(template_id,day_number,title) values('${id}',1,'Sesión smoke');
    insert into public.template_items(template_day_id,exercise_id,position,sets,reps,rest_seconds)
      select d.id,e.id,e.position,3,10,60 from public.template_days d
      cross join (values ${exercises.map((e, i) => `('${e}'::uuid,${i + 1})`).join(",")}) e(id,position) where d.template_id='${id}';`);
  const original = value(`select jsonb_agg(to_jsonb(i) order by i.id) from public.template_items i join public.template_days d on d.id=i.template_day_id where d.template_id in ('${templates.join("','")}')`);

  for (const [index, actor] of [trainer, physio].entries()) await t.test(`${index === 0 ? "Trainer" : "Fisioterapeuta"}: asignar, excluir contraindicación, ajustar y programar`, async () => {
    const route = `/pro/routines/${patient.id}`;
    // ADR-0009: cada profesional elige la plantilla de su especialidad, que crea
    // el borrador; después confirma con el formulario `name="patientId"`.
    await actor.web.submit(route, {}, `value="${templates[index]}"`);
    const result = await actor.web.submit(route, {}, 'name="patientId"');
    assert.match(result.html, /Rutina asignada\. El paciente ya puede consultarla/);
    const routine = await rows(actor.api.from("routines").select("id,kind").eq("patient_id", patient.id).eq("source_template_id", templates[index]).eq("status", "active").single());
    const day = await rows(actor.api.from("routine_days").select("id").eq("routine_id", routine.id).single());
    const items = await rows(actor.api.from("routine_items").select("id,exercise_id,sets").eq("routine_day_id", day.id).order("position"));
    assert.equal(items.length, 3);
    assert.ok(items.every((item) => item.exercise_id !== exercises[3]));
    const changed = await submitSelected(actor.web, route,
      `form:has(input[name="id"][value="${items[0].id}"]):has(input[name="sets"])`,
      { id: items[0].id, patientId: patient.id, sets: "4", reps: "12", targetWeight: "5", restSeconds: "60", notes: "Ajuste smoke" });
    assert.match(changed.html, /Ejercicio ajustado para este paciente/);
    assert.equal((await rows(actor.api.from("routine_items").select("sets").eq("id", items[0].id).single())).sets, 4);
    const scheduled = await actor.web.submit(`${route}/calendar`, { patientId: patient.id, dayId: day.id, scheduledOn: today }, "data-calendar-schedule");
    assert.match(scheduled.html, /Sesión programada/);
    assert.equal((await rows(patient.api.from("routine_schedules").select("created_by").eq("routine_day_id", day.id).single())).created_by, actor.id);
    assigned.push({ ...routine, dayId: day.id, items });
    assert.equal(value(`select jsonb_agg(to_jsonb(i) order by i.id) from public.template_items i join public.template_days d on d.id=i.template_day_id where d.template_id in ('${templates.join("','")}')`), original, "La plantilla debe conservarse idéntica");
  });

  await t.test("Fisioterapeuta: registrar asistencia, dos tamizajes y gráfica de evolución", async () => {
    const attendance = await physio.web.submit(`/attendance/${patient.id}`, { attendedOn: today, notes: "Asistencia smoke" }, 'name="attendedOn"');
    assert.match(attendance.html, /Asistencia registrada/);
    for (const [takenOn, weightKg] of [[addDays(today, -7), "80"], [today, "78"]]) {
      const result = await physio.web.submit(`/screenings/${patient.id}`, { takenOn, weightKg, heightCm: "180", bodyFatPct: "20", notes: "Tamizaje smoke" }, 'name="takenOn"');
      assert.match(result.html, /Tamizaje registrado/);
    }
    const measurements = await rows(patient.api.from("screenings").select("weight_kg,bmi,taken_by").eq("patient_id", patient.id).order("taken_on"));
    assert.deepEqual(measurements.map((m) => m.weight_kg), [80, 78]);
    assert.ok(measurements.every((m) => m.bmi > 0 && m.taken_by === physio.id));
    assert.match((await physio.web.request(`/evolution/${patient.id}`)).html, /<svg[^>]*role="img"/);
  });

  await t.test("Cliente móvil: ejecutar ambas rutinas y reportar dolor en tres sesiones reales", async () => {
    const page = await screen(patient, true);
    try {
      assert.equal(assigned.length, 2);
      for (const routine of [assigned[0], assigned[1], assigned[1], assigned[1]]) {
        await open(page, "/routine");
        await page.locator(`form:has(input[name="dayId"][value="${routine.dayId}"]) button[type="submit"]`).click();
        await page.waitForURL(/\/routine\/sessions\/[a-f0-9-]+$/);
        await page.waitForLoadState("networkidle");
        const sessionId = new URL(page.url()).pathname.split("/").at(-1);
        for (const [index, item] of routine.items.entries()) {
          const article = page.locator(`#ejercicio-${item.id}`);
          const summary = article.locator("summary").filter({ hasText: /Registrar ejercicio|Editar registro/ });
          if (!(await summary.evaluate((node) => node.parentElement.open))) await summary.click();
          const form = article.locator('form:has(input[name="itemId"])');
          const pain = routine.kind === "physio" && index === 1;
          await form.locator('[name="status"]').selectOption(pain ? "skipped" : index === 2 ? "modified" : "done");
          await form.locator('[name="actualSets"]').fill("3");
          await form.locator('[name="actualReps"]').fill("12");
          await form.locator('[name="actualWeight"]').fill("5");
          await form.locator('[name="perceivedEffort"]').fill("6");
          await form.locator(`label:has(input[name="painLevel"][value="${pain ? 8 : 0}"])`).click();
          if (pain) {
            await form.locator('[name="painLocation"]').selectOption("knee");
            await form.locator('[name="notes"]').fill("Me generó dolor en la rodilla — smoke");
          }
          if (index === 2) await form.locator('[name="replacedByExerciseId"]').selectOption(exercises[0]);
          await form.locator('button[type="submit"]').click();
          await article.getByText(/guardado/, { exact: false }).first().waitFor();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        await page.getByRole("button", { name: "Terminar sesión", exact: true }).click();
        await page.getByText("Sesión completada", { exact: false }).first().waitFor();
        await page.reload();
        assert.equal(await page.getByRole("button", { name: "Terminar sesión", exact: true }).count(), 0);
        const logs = await rows(patient.api.from("session_logs").select("status,actual_sets,actual_reps,actual_weight,pain_level,pain_location,notes,perceived_effort").eq("session_id", sessionId));
        assert.equal(logs.length, 3);
        assert.ok(logs.every((log) => log.actual_sets === 3 && log.actual_reps === 12 && log.actual_weight === 5 && log.perceived_effort === 6));
        if (routine.kind === "physio") {
          const skipped = logs.find((log) => log.status === "skipped");
          assert.equal(skipped.pain_level, 8);
          assert.equal(skipped.pain_location, "knee");
          assert.equal(skipped.notes, "Me generó dolor en la rodilla — smoke");
        }
        assert.equal((await rows(patient.api.from("sessions").select("status").eq("id", sessionId).single())).status, "completed");
        for (const actor of [trainer, physio]) assert.match((await actor.web.request(`/pro/sessions/${sessionId}`)).html, /Real:/);
      }
    } catch (error) {
      mkdirSync("work/smoke", { recursive: true });
      await page.screenshot({ path: "work/smoke/cliente-fallo.png", fullPage: true });
      throw error;
    }
  });

  await t.test("Fisioterapeuta: dolor persistente visible y repartido según KAN-10", async () => {
    const alerts = await rows(physio.api.from("alerts").select("id,payload,read_at").eq("patient_id", patient.id).eq("type", "pain"));
    assert.ok(alerts.length > 0, "Tres sesiones deben generar dolor persistente");
    assert.ok(alerts.some((a) => new Set(a.payload.evidence.flat().map((e) => e.session_id)).size >= 3));
    const alert = alerts[0];
    const result = await physio.web.submit("/pro/alerts", { alertId: alert.id }, `value="${alert.id}"`);
    assert.equal(result.response.status, 200);
    assert.ok((await rows(physio.api.from("alerts").select("read_at").eq("id", alert.id).single())).read_at);
    // Matriz de KAN-10 (docs/04): con fisioterapeuta en el equipo, el dolor le toca solo a él.
    // Contrato acordado con Jordy el 2026-09-26; antes se esperaba copia al entrenador.
    const trainerAlerts = await rows(trainer.api.from("alerts").select("id").eq("patient_id", patient.id).eq("type", "pain"));
    assert.deepEqual(trainerAlerts, [], "El entrenador no recibe alertas de dolor si el paciente tiene fisioterapeuta");
  });

  await t.test("Aislamiento: controles positivos y rechazo de lectura o escritura ajenas", async () => {
    for (const actor of [trainer, physio, patient]) assert.ok((await rows(actor.api.from("sessions").select("id").eq("patient_id", patient.id))).length >= 4);
    for (const table of ["sessions", "session_logs", "screenings", "attendance", "alerts"]) {
      assert.deepEqual(await rows(outsider.api.from(table).select("id").eq("patient_id", patient.id)), [], table);
    }
    assert.deepEqual(await rows(outsider.api.from("patient_details").select("profile_id").eq("profile_id", patient.id)), []);
    assert.deepEqual(await rows(patient.api.from("alerts").select("id")), []);
    assert.deepEqual(await rows(patient.api.from("routine_items").update({ sets: 12 }).eq("id", assigned[0].items[0].id).select("id")), []);
    expectRedirect(await patient.web.request("/pro"), "/patient");
    const hidden = await outsider.web.request(`/people/${patient.id}`);
    assert.ok(hidden.response.status === 404 || /could not be found|noindex/.test(hidden.html));
    assert.ok(!hidden.html.includes(patient.name));
    assert.deepEqual(await rows(outsider.api.from("profiles").select("id").eq("id", patient.id)), []);
  });

  await t.test("Pantallas hidratadas: navegación por rol, calendario, progreso y cierre de sesión", async () => {
    for (const actor of [trainer, physio, patient]) {
      const page = await screen(actor, actor === patient);
      const routes = actor === patient
        ? ["/patient", "/routine", "/routine/calendar", "/patient/profile", "/attendance/me", "/memberships/me", "/offer"]
        : ["/pro", "/people", `/people/${patient.id}`, "/pro/routines", `/pro/routines/${patient.id}`, `/pro/routines/${patient.id}/calendar`, "/pro/sessions", "/pro/alerts", `/screenings/${patient.id}`, `/evolution/${patient.id}`, "/exercises"];
      for (const route of routes) await open(page, route);
      await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
      await page.waitForURL("**/login");
      await page.goto(new URL(actor === patient ? "/patient" : "/pro", appUrl).href);
      await page.waitForURL("**/login");
      assert.equal(new URL(page.url()).pathname, "/login");
    }
  });
  await t.test("Sin errores de JavaScript, hidratación ni recursos rotos", () => {
    assert.deepEqual(failures, [], "La demo no debe registrar errores de JavaScript, hidratación o recursos");
  });

});
