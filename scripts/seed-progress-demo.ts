/**
 * Siembra los datos de demostración del slice 4 (seguimiento y membresías):
 * planes y servicios de la vitrina, y dos pacientes de demostración con tres o
 * cuatro tamizajes, varias semanas de sesiones con carga progresiva y membresías
 * en distintos estados. Es lo que pide la tarea 7.2 de
 * `add-progress-and-memberships` y lo que el plan de verificación llama "los
 * datos de demostración del día 10": sin ellos las gráficas de evolución y de
 * progresión de carga quedan vacías en la demo.
 *
 * Crea sus propios pacientes ("… (demo)") en vez de reutilizar a Diego y Elena
 * de `supabase/seed.sql`: esos dos son la base pristina que dan por hecho las
 * pruebas de `npm run test:*`, y llenarlos rompería sus comprobaciones de conteo
 * y de estado sin datos. Los pacientes de demostración se reconocen por su
 * correo `*.demo@demo.local`.
 *
 * Las fechas se calculan relativas a "hoy" en la zona del negocio
 * (`America/Bogota`), así que conviene volver a ejecutarlo el día de la demo para
 * que los tamizajes y las sesiones caigan en el rango que dibujan las gráficas.
 *
 * Es idempotente: reutiliza los pacientes de demostración si ya existen y borra
 * y vuelve a crear todo lo que cuelga de ellos. No toca ninguna otra fila.
 *
 * Requiere el catálogo y las plantillas sembrados (`npm run seed:exercises`,
 * `npm run seed:templates`) y Supabase local encendido, o `SUPABASE_URL` y
 * `SUPABASE_SERVICE_ROLE_KEY` apuntando al entorno desplegado.
 *
 * Uso:  npm run seed:progress-demo
 *
 * Este archivo, las otras siembras y el job de pg_cron son los únicos lugares
 * del proyecto que pueden usar la clave de servicio.
 */
import { createClient } from "@supabase/supabase-js";
import { entornoLocal } from "./helpers/supabase-admin.ts";
import type { Database } from "@/lib/db/types";

type Client = ReturnType<typeof createClient<Database>>;

/** Profesionales fijos de `supabase/seed.sql`. */
const BETO = "00000000-0000-4000-a000-000000000002"; // especialidad training
const CARLA = "00000000-0000-4000-a000-000000000003"; // especialidad physio

const DEMO_PASSWORD = "demo1234";
const ROUTINE_NAME = "Demo · Fuerza general";

/**
 * Hoy en la zona del negocio (`America/Bogota`), en formato `YYYY-MM-DD`. Es la
 * misma lógica de `lib/progress/vocabulary.ts`, copiada aquí para que el script
 * no dependa del cargador de alias que sí necesitan las pruebas.
 */
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

/** Una fecha `date` a `offset` días de hoy, leída en la zona del negocio. */
function isoDay(offset: number): string {
  const base = new Date(`${today()}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

/** Un timestamp a media mañana del día indicado. */
const morningOf = (day: string) => `${day}T13:30:00Z`;

const round1 = (value: number) => Math.round(value * 10) / 10;

function fail(message: string, error: { message: string } | null): void {
  if (error) throw new Error(`${message}: ${error.message}`);
}

// --- Vitrina: planes y servicios ---------------------------------------------

type PlanSeed = Omit<Database["public"]["Tables"]["plans"]["Insert"], "id" | "created_at">;

const PLANS: PlanSeed[] = [
  {
    name: "Plan Mensual",
    description: "Acceso libre a la sala y rutina personalizada, mes a mes.",
    price: 130000,
    billing_period: "monthly",
    features: ["Acceso libre a la sala", "Rutina personalizada", "Una evaluación al mes"],
    is_active: true,
  },
  {
    name: "Plan Trimestral",
    description: "Tres meses con seguimiento mensual y un descuento sobre el mensual.",
    price: 350000,
    billing_period: "quarterly",
    features: [
      "Todo lo del Plan Mensual",
      "Seguimiento mensual del profesional",
      "10% de ahorro frente al mensual",
    ],
    is_active: true,
  },
  {
    name: "Plan Semestral",
    description: "Seis meses con evaluación fisioterapéutica incluida al inicio.",
    price: 640000,
    billing_period: "semiannual",
    features: [
      "Todo lo del Plan Trimestral",
      "Evaluación fisioterapéutica inicial",
      "18% de ahorro frente al mensual",
    ],
    is_active: true,
  },
  {
    name: "Plan Anual",
    description: "Un año completo con la mejor tarifa y prioridad en la agenda.",
    price: 1150000,
    billing_period: "annual",
    features: [
      "Todo lo del Plan Semestral",
      "Prioridad para reservar horario",
      "26% de ahorro frente al mensual",
    ],
    is_active: true,
  },
  {
    name: "Plan Estudiante",
    description: "Tarifa reducida con carné vigente. Retirado de la vitrina por ahora.",
    price: 95000,
    billing_period: "monthly",
    features: ["Acceso en horario valle", "Rutina personalizada"],
    is_active: false,
  },
];

type ServiceSeed = Omit<
  Database["public"]["Tables"]["services"]["Insert"],
  "id" | "created_at"
>;

const SERVICES: ServiceSeed[] = [
  {
    name: "Asesoría nutricional",
    description: "Plan de alimentación y control de composición corporal con la nutricionista.",
    category: "nutrition",
    is_active: true,
  },
  {
    name: "Sesión de fisioterapia",
    description: "Valoración y tratamiento de lesiones o molestias con la fisioterapeuta.",
    category: "physio",
    is_active: true,
  },
  {
    name: "Clase de artes marciales",
    description: "Entrenamiento de defensa personal y acondicionamiento en grupo.",
    category: "martial_arts",
    is_active: true,
  },
  {
    name: "Taller de movilidad",
    description: "Sesión mensual centrada en rango de movimiento y prevención de lesiones.",
    category: "workshop",
    is_active: true,
  },
  {
    name: "Entrenamiento personalizado 1 a 1",
    description: "Sesiones individuales con el entrenador, fuera del plan grupal.",
    category: "training",
    is_active: true,
  },
];

/** Los identificadores actuales de una tabla con columna `name`, por nombre. */
async function idsByName(
  client: Client,
  table: "plans" | "services",
  names: string[],
): Promise<Map<string, string>> {
  const { data, error } = await client.from(table).select("id, name").in("name", names);
  fail(`No se pudieron leer ${table}`, error);
  return new Map((data ?? []).map((row) => [row.name, row.id]));
}

async function seedPlans(client: Client): Promise<void> {
  const existing = await idsByName(client, "plans", PLANS.map((plan) => plan.name));
  for (const plan of PLANS) {
    const id = existing.get(plan.name);
    if (id) {
      fail(
        `No se pudo actualizar el plan ${plan.name}`,
        (await client.from("plans").update(plan).eq("id", id)).error,
      );
      console.log(`· plans: "${plan.name}" actualizado`);
    } else {
      fail(
        `No se pudo crear el plan ${plan.name}`,
        (await client.from("plans").insert(plan)).error,
      );
      console.log(`✓ plans: "${plan.name}" creado`);
    }
  }
}

async function seedServices(client: Client): Promise<void> {
  const existing = await idsByName(client, "services", SERVICES.map((service) => service.name));
  for (const service of SERVICES) {
    const id = existing.get(service.name);
    if (id) {
      fail(
        `No se pudo actualizar el servicio ${service.name}`,
        (await client.from("services").update(service).eq("id", id)).error,
      );
      console.log(`· services: "${service.name}" actualizado`);
    } else {
      fail(
        `No se pudo crear el servicio ${service.name}`,
        (await client.from("services").insert(service)).error,
      );
      console.log(`✓ services: "${service.name}" creado`);
    }
  }
}

async function resolvePlanIds(client: Client): Promise<(name: string) => string> {
  const byName = await idsByName(
    client,
    "plans",
    PLANS.map((plan) => plan.name),
  );
  return (name: string) => {
    const id = byName.get(name);
    if (!id) throw new Error(`Falta el plan "${name}"; algo salió mal en la siembra de planes.`);
    return id;
  };
}

// --- Pacientes de demostración ---------------------------------------------------

type ScreeningShape = {
  weight_kg: number;
  body_fat_pct: number;
  measurements: Record<string, number>;
};

type MembershipShape = {
  plan: string;
  startedOffset: number;
  expiresOffset: number;
  status: Database["public"]["Enums"]["membership_status"];
  amount: number;
  note: string;
  /**
   * Deja también su fila en `membership_notices` para que el job de vencimientos
   * la trate como ya avisada: así el dato de demostración no altera los conteos
   * de `npm run test:memberships:cron`.
   */
  preNoticed?: boolean;
};

type DemoPatient = {
  email: string;
  fullName: string;
  heightCm: number;
  /** Profesionales que lo atienden y con qué especialidad se registra el vínculo. */
  assignments: { professional: string; kind: Database["public"]["Enums"]["professional_specialty"] }[];
  screeningStart: ScreeningShape;
  screeningStep: ScreeningShape;
  /** Si arrastra molestia de rodilla y termina saltando la sentadilla. */
  kneeStory: boolean;
  memberships: MembershipShape[];
};

const DEMO_PATIENTS: DemoPatient[] = [
  {
    email: "laura.perez.demo@demo.local",
    fullName: "Laura Pérez (demo)",
    heightCm: 165,
    assignments: [{ professional: BETO, kind: "training" }],
    // Adelgaza y baja grasa a lo largo del trimestre.
    screeningStart: {
      weight_kg: 74,
      body_fat_pct: 30,
      measurements: { waist_cm: 84, hip_cm: 102, chest_cm: 94, arm_cm: 29, thigh_cm: 58 },
    },
    screeningStep: {
      weight_kg: -1.8,
      body_fat_pct: -1.3,
      measurements: { waist_cm: -1.6, hip_cm: -1, chest_cm: -0.5, arm_cm: 0.1, thigh_cm: -0.7 },
    },
    kneeStory: false,
    memberships: [
      {
        plan: "Plan Mensual",
        startedOffset: -150,
        expiresOffset: -120,
        status: "expired",
        amount: 130000,
        note: "histórica del semestre pasado",
      },
      {
        plan: "Plan Trimestral",
        startedOffset: -12,
        expiresOffset: 78,
        status: "active",
        amount: 350000,
        note: "vigente",
      },
    ],
  },
  {
    email: "marcos.rojas.demo@demo.local",
    fullName: "Marcos Rojas (demo)",
    heightCm: 179,
    assignments: [
      { professional: BETO, kind: "training" },
      { professional: CARLA, kind: "physio" },
    ],
    // Gana algo de masa y mantiene el peso; la fisioterapeuta lo sigue por la rodilla.
    screeningStart: {
      weight_kg: 80,
      body_fat_pct: 22,
      measurements: { waist_cm: 90, hip_cm: 100, chest_cm: 104, arm_cm: 35, thigh_cm: 60 },
    },
    screeningStep: {
      weight_kg: 0.7,
      body_fat_pct: -0.8,
      measurements: { waist_cm: -0.6, hip_cm: 0.2, chest_cm: 0.6, arm_cm: 0.5, thigh_cm: 0.6 },
    },
    kneeStory: true,
    memberships: [
      {
        plan: "Plan Mensual",
        startedOffset: -95,
        expiresOffset: -65,
        status: "cancelled",
        amount: 130000,
        note: "cancelada a mitad de mes",
      },
      {
        plan: "Plan Mensual",
        startedOffset: -27,
        expiresOffset: 3,
        status: "expiring_soon",
        amount: 130000,
        note: "próxima a vencer, ya avisada",
        preNoticed: true,
      },
    ],
  },
];

/** Reutiliza el usuario de demostración si ya existe; si no, lo crea. */
async function resolveDemoUser(client: Client, patient: DemoPatient): Promise<string> {
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  fail("No se pudo listar los usuarios", error);
  const existing = (data.users ?? []).find(
    (user) => user.email?.toLowerCase() === patient.email.toLowerCase(),
  );
  if (existing) return existing.id;

  const created = await client.auth.admin.createUser({
    email: patient.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: patient.fullName },
  });
  fail(`No se pudo crear el paciente ${patient.email}`, created.error);
  const id = created.data.user?.id;
  if (!id) throw new Error(`El alta de ${patient.email} no devolvió identificador.`);
  console.log(`✓ paciente de demostración creado: ${patient.fullName}`);
  return id;
}

/** Deja las asignaciones de cuidado del paciente exactamente como las pide su config. */
async function syncAssignments(client: Client, patientId: string, patient: DemoPatient) {
  fail(
    `No se pudieron limpiar las asignaciones de ${patient.email}`,
    (await client.from("care_assignments").delete().eq("patient_id", patientId)).error,
  );
  fail(
    `No se pudieron crear las asignaciones de ${patient.email}`,
    (
      await client.from("care_assignments").insert(
        patient.assignments.map((assignment) => ({
          patient_id: patientId,
          professional_id: assignment.professional,
          kind: assignment.kind,
        })),
      )
    ).error,
  );
}

/** Borra todo lo que este script cuelga de un paciente, para volver a sembrarlo. */
async function wipePatientData(client: Client, patientId: string) {
  for (const table of ["memberships", "screenings", "routines", "attendance"] as const) {
    fail(
      `No se pudieron borrar filas de ${table}`,
      (await client.from(table).delete().eq("patient_id", patientId)).error,
    );
  }
}

// --- Tamizajes ----------------------------------------------------------------

/** Cuatro tamizajes, del más antiguo al más reciente, con una tendencia clara. */
function screeningRows(patient: DemoPatient, patientId: string, takenBy: string) {
  const weeksAgo = [13, 9, 5, 1];
  return weeksAgo.map((weeks, index) => ({
    patient_id: patientId,
    taken_on: isoDay(-weeks * 7),
    weight_kg: round1(patient.screeningStart.weight_kg + patient.screeningStep.weight_kg * index),
    height_cm: patient.heightCm,
    body_fat_pct: round1(
      patient.screeningStart.body_fat_pct + patient.screeningStep.body_fat_pct * index,
    ),
    measurements: Object.fromEntries(
      Object.entries(patient.screeningStart.measurements).map(([key, value]) => [
        key,
        round1(value + (patient.screeningStep.measurements[key] ?? 0) * index),
      ]),
    ),
    taken_by: takenBy,
    notes: "Datos de demostración.",
  }));
}

// --- Rutina y semanas de sesiones -------------------------------------------------

type ItemPlan = {
  /** Nombre exacto del catálogo de free-exercise-db. */
  exercise: string;
  sets: number;
  reps: number;
  /** Carga de la primera semana; `null` para un ejercicio con el peso del cuerpo. */
  baseWeight: number | null;
  /** Cuánto sube la carga cada vez que se repite el día. */
  growth: number;
};

type DayPlan = { dayNumber: number; title: string; items: ItemPlan[] };

const DAY_PLANS: DayPlan[] = [
  {
    dayNumber: 1,
    title: "Tren superior",
    items: [
      { exercise: "Barbell Bench Press - Medium Grip", sets: 4, reps: 8, baseWeight: 45, growth: 2.5 },
      { exercise: "Barbell Shoulder Press", sets: 4, reps: 10, baseWeight: 25, growth: 1.5 },
      { exercise: "Bent Over Barbell Row", sets: 4, reps: 10, baseWeight: 40, growth: 2.5 },
      { exercise: "Pullups", sets: 3, reps: 8, baseWeight: null, growth: 0 },
    ],
  },
  {
    dayNumber: 2,
    title: "Tren inferior",
    items: [
      // La sentadilla es la que el paciente con molestia de rodilla termina saltando.
      { exercise: "Barbell Squat", sets: 5, reps: 5, baseWeight: 60, growth: 5 },
      { exercise: "Romanian Deadlift", sets: 4, reps: 8, baseWeight: 50, growth: 2.5 },
      { exercise: "Leg Press", sets: 3, reps: 12, baseWeight: 120, growth: 10 },
      { exercise: "Standing Calf Raises", sets: 4, reps: 15, baseWeight: 40, growth: 5 },
    ],
  },
];

/** Resuelve los nombres de `DAY_PLANS` a identificadores; falla si falta alguno. */
async function resolveExercises(client: Client): Promise<Map<string, string>> {
  const names = [...new Set(DAY_PLANS.flatMap((day) => day.items.map((item) => item.exercise)))];
  const { data, error } = await client.from("exercises").select("id, name").in("name", names);
  fail("No se pudieron leer los ejercicios de la rutina", error);
  const idByName = new Map((data ?? []).map((row) => [row.name, row.id]));
  const missing = names.filter((name) => !idByName.has(name));
  if (missing.length > 0)
    throw new Error(
      `Faltan ejercicios (${missing.join(", ")}). Ejecuta antes npm run seed:exercises.`,
    );
  return idByName;
}

/** Monta una rutina de dos días y diez sesiones de cinco semanas para un paciente. */
async function seedRoutine(
  client: Client,
  patient: DemoPatient,
  patientId: string,
  exerciseId: Map<string, string>,
): Promise<{ sessions: number; logs: number }> {
  const { data: routine, error: routineError } = await client
    .from("routines")
    .insert({
      patient_id: patientId,
      kind: "training",
      name: ROUTINE_NAME,
      status: "active",
      assigned_by: BETO,
      starts_on: isoDay(-42),
      notes: "Datos de demostración. Rutina de dos días con carga progresiva.",
    })
    .select("id")
    .single();
  fail(`No se pudo crear la rutina de ${patient.email}`, routineError);
  const routineId = routine!.id;

  const itemIdByDayAndPosition = new Map<string, string>();
  const dayIdByNumber = new Map<number, string>();
  for (const day of DAY_PLANS) {
    const { data: dayRow, error: dayError } = await client
      .from("routine_days")
      .insert({ routine_id: routineId, day_number: day.dayNumber, title: day.title })
      .select("id")
      .single();
    fail(`No se pudo crear el día ${day.dayNumber}`, dayError);
    dayIdByNumber.set(day.dayNumber, dayRow!.id);

    const { data: itemRows, error: itemsError } = await client
      .from("routine_items")
      .insert(
        day.items.map((item, position) => ({
          routine_day_id: dayRow!.id,
          exercise_id: exerciseId.get(item.exercise)!,
          position: position + 1,
          sets: item.sets,
          reps: item.reps,
          target_weight: item.baseWeight,
          rest_seconds: 90,
        })),
      )
      .select("id, position");
    fail(`No se pudieron crear los ítems del día ${day.dayNumber}`, itemsError);
    for (const row of itemRows ?? []) {
      itemIdByDayAndPosition.set(`${day.dayNumber}:${row.position}`, row.id);
    }
  }

  const sessionOffsets = [-35, -32, -28, -25, -21, -18, -14, -11, -7, -4];
  let sessions = 0;
  let logs = 0;

  for (const [index, offset] of sessionOffsets.entries()) {
    const day = DAY_PLANS[index % 2];
    const performedOn = isoDay(offset);
    const cycle = Math.floor(index / 2); // 0..4: veces que se repitió este día

    const { data: sessionRow, error: sessionError } = await client
      .from("sessions")
      .insert({
        routine_id: routineId,
        routine_day_id: dayIdByNumber.get(day.dayNumber)!,
        patient_id: patientId,
        performed_on: performedOn,
        status: "completed",
        completed_at: morningOf(performedOn),
      })
      .select("id")
      .single();
    fail(`No se pudo crear la sesión del ${performedOn}`, sessionError);
    sessions += 1;

    const sessionLogs = day.items.map((item, position) => {
      const routineItemId = itemIdByDayAndPosition.get(`${day.dayNumber}:${position + 1}`)!;
      const isSquat = day.dayNumber === 2 && position === 0;
      if (patient.kneeStory && isSquat && cycle >= 3) {
        return {
          session_id: sessionRow!.id,
          routine_item_id: routineItemId,
          patient_id: patientId,
          status: "skipped" as const,
          pain_level: 7,
          pain_location: "knee",
          notes: "Molestia en la rodilla derecha al bajar; lo dejé para revisión.",
        };
      }
      const weight = item.baseWeight ? round1(item.baseWeight + item.growth * cycle) : null;
      return {
        session_id: sessionRow!.id,
        routine_item_id: routineItemId,
        patient_id: patientId,
        status: "done" as const,
        actual_sets: item.sets,
        actual_reps: item.reps,
        actual_weight: weight,
        perceived_effort: 6 + (cycle % 3),
      };
    });

    fail(
      `No se pudieron registrar los logs de la sesión del ${performedOn}`,
      (await client.from("session_logs").insert(sessionLogs)).error,
    );
    logs += sessionLogs.length;
  }

  return { sessions, logs };
}

// --- Membresías -------------------------------------------------------------------

async function seedMemberships(
  client: Client,
  patient: DemoPatient,
  patientId: string,
  planId: (name: string) => string,
): Promise<void> {
  const inserted = await client
    .from("memberships")
    .insert(
      patient.memberships.map((membership) => ({
        patient_id: patientId,
        plan_id: planId(membership.plan),
        started_on: isoDay(membership.startedOffset),
        expires_on: isoDay(membership.expiresOffset),
        status: membership.status,
        amount: membership.amount,
        notes: `Datos de demostración: ${membership.note}.`,
      })),
    )
    .select("id, expires_on, status");
  fail(`No se pudieron crear las membresías de ${patient.email}`, inserted.error);

  // Para las que van marcadas como ya avisadas, su fila en `membership_notices`.
  const notices = (inserted.data ?? [])
    .map((row, index) => ({ row, shape: patient.memberships[index] }))
    .filter(({ shape }) => shape.preNoticed)
    .map(({ row }) => ({
      membership_id: row.id,
      patient_id: patientId,
      kind: row.status,
      expires_on: row.expires_on,
      notified_at: new Date().toISOString(),
    }));
  if (notices.length > 0) {
    fail(
      `No se pudieron crear los avisos de ${patient.email}`,
      (await client.from("membership_notices").insert(notices)).error,
    );
  }
}

// --- Orquestación ---------------------------------------------------------------

async function main() {
  const { url, clave } = entornoLocal();
  const client = createClient<Database>(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Vitrina");
  await seedPlans(client);
  await seedServices(client);
  const planId = await resolvePlanIds(client);

  const exerciseId = await resolveExercises(client);

  for (const patient of DEMO_PATIENTS) {
    console.log(`\n${patient.fullName}`);
    const patientId = await resolveDemoUser(client, patient);
    await wipePatientData(client, patientId);
    await syncAssignments(client, patientId, patient);

    const screenings = screeningRows(patient, patientId, BETO);
    fail(
      `No se pudieron crear los tamizajes de ${patient.email}`,
      (await client.from("screenings").insert(screenings)).error,
    );
    console.log(`✓ screenings: ${screenings.length} tamizajes a lo largo del trimestre`);

    const routine = await seedRoutine(client, patient, patientId, exerciseId);
    console.log(
      `✓ routines: "${ROUTINE_NAME}" con ${routine.sessions} sesiones y ${routine.logs} registros`,
    );

    await seedMemberships(client, patient, patientId, planId);
    console.log(`✓ memberships: ${patient.memberships.length} membresías en distintos estados`);
  }

  console.log("\nListo. Vuelve a ejecutarlo el día de la demostración para refrescar las fechas.");
}

await main();
