// Camino 9 del plan de verificación: aislamiento de datos.
//
// Se ejecuta contra la API de Supabase con el token de sesión de cada persona,
// nunca a través de la interfaz: la interfaz puede estar ocultando un botón
// mientras la fila sigue siendo accesible. Requiere Supabase local encendido
// y los profesionales de la semilla. Crea pacientes propios y los retira al terminar;
// no borra sesiones ni alertas de las cuentas usadas para presentar la demo.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = fileURLToPath(new URL("../", import.meta.url));

let DIEGO;
let ELENA;
const fixture = Object.fromEntries(["exercise", "routine", "otherRoutine", "day", "otherDay", "item", "otherItem", "session"].map((key) => [key, randomUUID()]));

const CONTENEDOR = "supabase_db_plataforma-fisio-training";

function sql(consulta) {
  return execFileSync(
    "docker",
    ["exec", CONTENEDOR, "psql", "-U", "postgres", "-d", "postgres", "-tA", "-v", "ON_ERROR_STOP=1", "-c", consulta],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

// Datos clínicos mínimos para poder intentar leerlos desde la sesión equivocada.
// Se crean por SQL directo porque son el escenario de la prueba, no una semilla.
function prepararEscenario() {
  return sql(`
    insert into public.exercises (id, name, is_custom, contraindications)
      values ('${fixture.exercise}', 'Sentadilla de prueba', true, '{knee}')
      on conflict (id) do nothing;

    insert into public.routines (id, patient_id, kind, name)
      values ('${fixture.routine}', '${DIEGO}', 'training', 'Rutina de prueba')
      on conflict (id) do nothing;
    insert into public.routine_days (id, routine_id, day_number, title)
      values ('${fixture.day}', '${fixture.routine}', 1, 'Día 1')
      on conflict (id) do nothing;
    insert into public.routine_items (id, routine_day_id, exercise_id, position, sets, reps)
      values ('${fixture.item}', '${fixture.day}',
              '${fixture.exercise}', 1, 3, 10)
      on conflict (id) do nothing;

    -- Rutina, sesión y registro de Elena: lo que Diego no debe poder ver.
    insert into public.routines (id, patient_id, kind, name)
      values ('${fixture.otherRoutine}', '${ELENA}', 'training', 'Rutina de Elena')
      on conflict (id) do nothing;
    insert into public.routine_days (id, routine_id, day_number)
      values ('${fixture.otherDay}', '${fixture.otherRoutine}', 1)
      on conflict (id) do nothing;
    insert into public.routine_items (id, routine_day_id, exercise_id, position)
      values ('${fixture.otherItem}', '${fixture.otherDay}',
              '${fixture.exercise}', 1)
      on conflict (id) do nothing;
    insert into public.sessions (id, routine_id, routine_day_id, patient_id, status)
      values ('${fixture.session}', '${fixture.otherRoutine}',
              '${fixture.otherDay}', '${ELENA}', 'completed')
      on conflict (id) do nothing;
    insert into public.session_logs (session_id, routine_item_id, patient_id, status, pain_level, pain_location)
      select '${fixture.session}', '${fixture.otherItem}', '${ELENA}', 'done', 8, 'knee'
      where not exists (select 1 from public.session_logs where patient_id = '${ELENA}');

    insert into public.alerts (type, patient_id, recipient_id, severity)
      select 'pain', '${DIEGO}', '00000000-0000-4000-a000-000000000003', 'critical'
      where not exists (select 1 from public.alerts where patient_id = '${DIEGO}');
  `);
}

function limpiarEscenario() {
  sql(`
    delete from public.alerts where patient_id in ('${DIEGO}', '${ELENA}');
    delete from public.session_logs where patient_id in ('${DIEGO}', '${ELENA}');
    delete from public.sessions where patient_id in ('${DIEGO}', '${ELENA}');
    delete from public.routines where id in ('${fixture.routine}', '${fixture.otherRoutine}');
    delete from public.exercises where id = '${fixture.exercise}';
  `);
}

test("Camino 9 — aislamiento de datos entre pacientes", { timeout: 120_000 }, async (t) => {
  const status = JSON.parse(
    execFileSync(path.join(root, "node_modules/.bin/supabase"), ["status", "--output", "json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname));

  const temporary = [];
  t.after(async () => {
    if (DIEGO && ELENA) limpiarEscenario();
    for (const person of temporary) {
      await person.client.auth.signOut();
      sql(`delete from auth.users where id='${person.id}'`);
    }
  });
  async function patient() {
    const email = `rls-${randomUUID()}@demo.local`;
    const client = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await client.auth.signUp({ email, password: "demo1234" });
    assert.equal(result.error, null);
    const person = { client, email, id: result.data.user.id };
    temporary.push(person);
    sql(`insert into public.patient_details(profile_id,goal,level,environment,equipment,onboarding_step)
      values('${person.id}','general_health','beginner','home','{none}',3)`);
    return person;
  }
  const owner = await patient(), other = await patient();
  DIEGO = owner.id;
  ELENA = other.id;
  sql(`insert into public.care_assignments(patient_id,professional_id,kind) values
    ('${DIEGO}','00000000-0000-4000-a000-000000000002','training'),
    ('${DIEGO}','00000000-0000-4000-a000-000000000003','physio')`);
  prepararEscenario();

  const sesion = async (email) => {
    const cliente = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await cliente.auth.signInWithPassword({ email, password: "demo1234" });
    assert.equal(error, null, `no se pudo iniciar sesión como ${email}: ${error?.message}`);
    return cliente;
  };

  const diego = owner.client;
  const beto = await sesion("entrenador@demo.local");
  const carla = await sesion("fisio@demo.local");

  // Red de seguridad: si RLS bloqueara absolutamente todo, los seis casos de
  // abajo pasarían sin demostrar nada. Estas tres lecturas deben devolver datos.
  await t.test("un paciente sí ve lo suyo", async () => {
    const { data, error } = await diego.from("routines").select("id, name");
    assert.equal(error, null);
    assert.equal(data.length, 1, "Diego debería ver exactamente su propia rutina");
  });

  await t.test("un profesional sí ve a su paciente asignado", async () => {
    const { data, error } = await carla.from("profiles").select("id, full_name").eq("id", DIEGO);
    assert.equal(error, null);
    assert.equal(data.length, 1, "Carla tiene a Diego asignado y debería verlo");
  });

  await t.test("1. paciente consulta session_logs de otro paciente", async () => {
    const { data, error } = await diego.from("session_logs").select("id, pain_level").eq("patient_id", ELENA);
    assert.equal(error, null);
    assert.deepEqual(data, [], "un paciente no puede leer los registros de otro");
  });

  await t.test("2. paciente consulta patient_details de otro paciente", async () => {
    const { data, error } = await diego.from("patient_details").select("profile_id, goal").eq("profile_id", ELENA);
    assert.equal(error, null);
    assert.deepEqual(data, [], "un paciente no puede leer el perfil clínico de otro");
  });

  await t.test("3. profesional consulta un paciente no asignado", async () => {
    const { data: perfiles } = await beto.from("profiles").select("id, full_name").eq("id", ELENA);
    assert.deepEqual(perfiles, [], "un profesional no ve ni el nombre de quien no tiene asignado");

    const { data: detalles } = await beto.from("patient_details").select("profile_id").eq("profile_id", ELENA);
    assert.deepEqual(detalles, [], "tampoco sus datos clínicos");

    const { data: sesiones } = await beto.from("sessions").select("id").eq("patient_id", ELENA);
    assert.deepEqual(sesiones, [], "tampoco sus sesiones");
  });

  await t.test("4. paciente intenta update sobre un routine_item propio", async () => {
    const { data, error } = await diego
      .from("routine_items")
      .update({ sets: 99 })
      .eq("id", fixture.item)
      .select();
    assert.deepEqual(data ?? [], [], "el paciente ejecuta su rutina, no la edita");
    assert.equal(error, null);
    assert.equal(sql(`select sets from public.routine_items where id = '${fixture.item}'`), "3");
  });

  await t.test("5. paciente consulta alerts", async () => {
    const { data, error } = await diego.from("alerts").select("id, type");
    assert.equal(error, null);
    assert.deepEqual(data, [], "las alertas son una herramienta clínica: el paciente no las ve");
  });

  await t.test("6. paciente inserta una sesión a nombre de otro", async () => {
    const { error } = await diego.from("sessions").insert({
      routine_id: fixture.otherRoutine,
      routine_day_id: fixture.otherDay,
      patient_id: ELENA,
      status: "in_progress",
    });
    assert.notEqual(error, null, "debe rechazarse por la política with check");
    assert.equal(sql(`select count(*) from public.sessions where patient_id = '${ELENA}'`), "1");
  });

  // Fuera del camino 9, pero es la escalada de privilegios más obvia.
  await t.test("un paciente no puede ascenderse a administrador", async () => {
    const { error } = await diego.from("profiles").update({ role: "admin" }).eq("id", DIEGO);
    assert.notEqual(error, null, "el disparador profiles_protect_columns debe rechazarlo");
    assert.equal(sql(`select role from public.profiles where id = '${DIEGO}'`), "patient");
  });
});
