/**
 * Verifica BACK-012: el generador de la alerta `low_attendance`.
 *
 * La «asistencia esperada» del mes sale de los días de la rutina del paciente
 * (× semanas del mes); se alerta cuando la asistencia real cae por debajo del
 * umbral `alert_settings.low_attendance_pct`. La revisión es idempotente por
 * mes calendario, avisa al admin y al profesional a cargo, y el umbral se
 * puede ajustar.
 *
 * Requiere Supabase local encendido con su semilla. No necesita `npm run dev`:
 * llama la RPC con la clave de servicio, como haría el cron. Todo lo que crea
 * lleva una marca y se borra al terminar.
 *
 * Uso:  npm run test:attendance:cron
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { status, sql as rawSql } from "./helpers/auth-http.mjs";

const sql = (query) => rawSql(query).trim();
const password = "Asistencia-prueba-1234";

const anon = () =>
  createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const service = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Primer día del mes, `offset` meses hacia atrás desde hoy. */
function firstOfMonth(offset) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - offset);
  return d.toISOString().slice(0, 10);
}
/** Un día concreto (1..28) dentro de un mes dado como `YYYY-MM-01`. */
const dayOf = (monthStart, day) =>
  `${monthStart.slice(0, 8)}${String(day).padStart(2, "0")}`;

const review = (targetMonth) =>
  service.rpc("review_low_attendance", { target_month: targetMonth });

test("Generador de la alerta de asistencia baja", { timeout: 180_000 }, async (t) => {
  const users = [];
  const marca = `asis-${randomUUID().slice(0, 8)}`;
  // Meses lo bastante antiguos como para que ninguna rutina del seed de demo
  // (que arranca ~6 semanas atrás) entre en la evaluación: así el conteo
  // `flagged` solo cuenta las fixtures de esta prueba.
  const prevMonth = firstOfMonth(3);
  const prev2Month = firstOfMonth(4);
  const routineStart = firstOfMonth(7);
  const originalPct = sql(
    `select value from public.alert_settings where key = 'low_attendance_pct'`,
  );

  // Registrado antes de crear las fixtures: si el montaje falla a medias, la
  // limpieza por patrón de correo se ejecuta igual y no deja un admin huérfano
  // que descuadre otras pruebas.
  t.after(async () => {
    sql(`update public.alert_settings set value = ${originalPct} where key = 'low_attendance_pct'`);
    for (const user of users) await user.api.auth.signOut();
    sql(`delete from auth.users where email like '${marca}-%@demo.local'`);
  });

  async function person(role, specialty = null) {
    const api = anon();
    const email = `${marca}-${role}-${randomUUID().slice(0, 8)}@demo.local`;
    const { data, error } = await api.auth.signUp({ email, password });
    assert.equal(error, null);
    const user = { api, email, id: data.user.id, role };
    users.push(user);
    sql(
      `update public.profiles set role = '${role}', specialty = ${
        specialty ? `'${specialty}'` : "null"
      }, full_name = 'Prueba asistencia ${role}' where id = '${user.id}'`,
    );
    if (role === "patient")
      sql(
        `insert into public.patient_details (profile_id, goal, level, environment, equipment, onboarding_step)
         values ('${user.id}', 'performance', 'advanced', 'gym', '{barbell}', 3)`,
      );
    return user;
  }

  /** Una rutina activa de `days` días que empezó antes del mes evaluado. */
  function seedRoutine(patientId, days) {
    const routineId = randomUUID();
    sql(
      `insert into public.routines (id, patient_id, kind, name, status, starts_on)
       values ('${routineId}', '${patientId}', 'training', 'Rutina ${marca}', 'active', '${routineStart}')`,
    );
    for (let n = 1; n <= days; n += 1)
      sql(
        `insert into public.routine_days (routine_id, day_number, title)
         values ('${routineId}', ${n}, 'Día ${n}')`,
      );
    return routineId;
  }

  /** `count` asistencias en días distintos del mes `monthStart`. */
  function seedAttendance(patientId, monthStart, count) {
    for (let i = 0; i < count; i += 1)
      sql(
        `insert into public.attendance (patient_id, attended_on)
         values ('${patientId}', '${dayOf(monthStart, 2 + i * 2)}')`,
      );
  }

  const admin = await person("admin");
  const pro = await person("professional", "training");
  const outsider = await person("professional", "training");
  const low = await person("patient");
  const okPatient = await person("patient");
  const noRoutine = await person("patient");

  sql(
    `insert into public.care_assignments (patient_id, professional_id, kind) values
       ('${low.id}', '${pro.id}', 'training'),
       ('${okPatient.id}', '${pro.id}', 'training'),
       ('${noRoutine.id}', '${pro.id}', 'training')`,
  );

  // Rutina de 2 días => esperado ≈ round(2 * (días del mes / 7)) ≈ 9.
  seedRoutine(low.id, 2);
  seedRoutine(okPatient.id, 2);
  // `noRoutine` no recibe rutina: no tiene expectativa, no se evalúa.

  await t.test("Marca al paciente por debajo del umbral y avisa al equipo", async () => {
    seedAttendance(low.id, prevMonth, 3); // 3/9 ≈ 33 % < 50 %
    seedAttendance(okPatient.id, prevMonth, 6); // 6/9 ≈ 67 % ≥ 50 %

    const { data, error } = await review(prevMonth);
    assert.equal(error, null);
    assert.equal(data.period_month, prevMonth);
    assert.equal(data.pct_threshold, 50);
    assert.equal(data.flagged, 1, "solo el paciente con asistencia baja");

    const notice = sql(
      `select expected || '/' || attended from public.attendance_notices
       where patient_id = '${low.id}' and period_month = '${prevMonth}'`,
    );
    assert.equal(notice, "9/3");
    assert.equal(
      sql(`select count(*) from public.attendance_notices where patient_id = '${okPatient.id}'`),
      "0",
      "el paciente que sí asiste no deja aviso",
    );
    assert.equal(
      sql(`select count(*) from public.attendance_notices where patient_id = '${noRoutine.id}'`),
      "0",
      "sin rutina no hay expectativa que incumplir",
    );

    // Alerta para el admin y para el profesional a cargo; nadie más.
    assert.equal(
      sql(`select count(*) from public.alerts a join public.profiles p on p.id = a.recipient_id
           where a.type = 'low_attendance' and a.patient_id = '${low.id}'
             and p.id in ('${admin.id}', '${pro.id}')`),
      "2",
    );
    assert.equal(
      sql(`select count(*) from public.alerts
           where type = 'low_attendance' and patient_id = '${low.id}' and recipient_id = '${outsider.id}'`),
      "0",
      "el profesional sin asignación no recibe la alerta",
    );
    const payload = sql(
      `select payload->>'pct' from public.alerts
       where type = 'low_attendance' and patient_id = '${low.id}' limit 1`,
    );
    assert.equal(payload, "33.3");
    const mensaje = sql(
      `select payload->>'message' from public.alerts
       where type = 'low_attendance' and patient_id = '${low.id}' limit 1`,
    );
    assert.match(mensaje, /Asistió 3 de 9 sesiones previstas \(33\.3 %\)/);
  });

  await t.test("Dos ejecuciones seguidas no duplican avisos ni alertas", async () => {
    const beforeNotices = sql(
      `select count(*) from public.attendance_notices where patient_id = '${low.id}'`,
    );
    const beforeAlerts = sql(
      `select count(*) from public.alerts where type = 'low_attendance' and patient_id = '${low.id}'`,
    );
    const { data } = await review(prevMonth);
    assert.equal(data.flagged, 0);
    assert.deepEqual(data.new_notices, []);
    assert.equal(
      sql(`select count(*) from public.attendance_notices where patient_id = '${low.id}'`),
      beforeNotices,
    );
    assert.equal(
      sql(`select count(*) from public.alerts where type = 'low_attendance' and patient_id = '${low.id}'`),
      beforeAlerts,
    );
  });

  await t.test("El umbral es configurable", async () => {
    // Mes calendario distinto para esquivar la idempotencia. Los dos pacientes
    // con rutina asisten 6/9 ≈ 67 %: por encima del 50 %, por debajo del 80 %.
    seedAttendance(low.id, prev2Month, 6);
    seedAttendance(okPatient.id, prev2Month, 6);

    const bajo = await review(prev2Month);
    assert.equal(bajo.data.flagged, 0, "con umbral 50 % un 67 % no se marca");

    sql(`update public.alert_settings set value = 80 where key = 'low_attendance_pct'`);
    const alto = await review(prev2Month);
    assert.equal(alto.data.pct_threshold, 80);
    assert.equal(alto.data.flagged, 2, "con umbral 80 % ese 67 % sí se marca");

    sql(`update public.alert_settings set value = ${originalPct} where key = 'low_attendance_pct'`);
  });

  await t.test("RLS: el paciente ve su aviso; otro no", async () => {
    const propio = await low.api
      .from("attendance_notices")
      .select("expected, attended, pct, period_month")
      .eq("patient_id", low.id);
    assert.equal(propio.error, null);
    assert.ok(propio.data.length >= 1, "el paciente lee sus propios avisos");
    assert.ok(
      propio.data.some((row) => row.period_month === prevMonth && row.pct === 33.3),
      "entre ellos, el del mes con 33,3 %",
    );

    const ajeno = await okPatient.api
      .from("attendance_notices")
      .select("id")
      .eq("patient_id", low.id);
    assert.deepEqual(ajeno.data, [], "otro paciente no lee el aviso ajeno");

    const asignado = await pro.api
      .from("attendance_notices")
      .select("id")
      .eq("patient_id", low.id);
    assert.ok(asignado.data.length >= 1, "el profesional a cargo sí lo lee");

    const noAsignado = await outsider.api
      .from("attendance_notices")
      .select("id")
      .eq("patient_id", low.id);
    assert.deepEqual(noAsignado.data, [], "el profesional sin asignación no lo lee");
  });

  await t.test("Un cliente no puede invocar la revisión", async () => {
    for (const actor of [admin, pro, low]) {
      const result = await actor.api.rpc("review_low_attendance", {
        target_month: prevMonth,
      });
      assert.notEqual(result.error, null, `${actor.role} no debe poder ejecutarla`);
    }
  });
});
