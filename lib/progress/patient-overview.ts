import "server-only";

import type { Database } from "@/lib/db/types";
import type { MembershipStatus } from "@/lib/progress/membership-vocabulary";
import { monthStart, today } from "@/lib/progress/vocabulary";
import { createClient } from "@/lib/supabase/server";

/**
 * Lo que hay que saber de un paciente de un vistazo, en una sola lectura: en
 * qué día de la semana está y si ya entrenó, su racha, si dejó una sesión a
 * medias, su membresía, sus condiciones activas, su último tamizaje, la
 * asistencia del mes, la rutina en curso y cuántas alertas suyas quedan sin
 * leer.
 *
 * Es la agregación de la sección 5 del change `improve-frontend-ux`. Nació con
 * lo que necesitaba la portada del paciente (17.5 — `week`, `streakWeeks`,
 * `openSession`) y aquí se completa para la ficha del profesional y para el
 * panel de trabajo (16.5). Todo sale de **un solo `Promise.all`**, sin ninguna
 * consulta dentro de un `map`: crecer es añadir una promesa, no rehacerla.
 */

/** Cuánta historia se lee para calcular la racha. Doce semanas cubren un trimestre. */
const HISTORIA_DIAS = 84;

/**
 * Aritmética de fechas sobre `YYYY-MM-DD`. Se ancla al mediodía UTC porque un
 * `date` de Postgres no lleva hora: sumando desde medianoche, un desplazamiento
 * de zona horaria de una hora bastaría para caer en el día anterior.
 */
function sumarDias(iso: string, dias: number) {
  const fecha = new Date(`${iso}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Día de la semana con el lunes en 0, que es como empieza la semana aquí. */
function diaDeLaSemana(iso: string) {
  return (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/** El lunes de la semana a la que pertenece `iso`. */
export function inicioDeSemana(iso: string) {
  return sumarDias(iso, -diaDeLaSemana(iso));
}

export type WeekDay = {
  /** `YYYY-MM-DD`, la misma forma con la que viaja `sessions.performed_on`. */
  date: string;
  /** Inicial del día —«L», «M», «X»…— para la tira estrecha del teléfono. */
  initial: string;
  /** Número del día del mes, que es lo que ubica al paciente en el calendario. */
  dayOfMonth: number;
  isToday: boolean;
  /** Aún no ha llegado: se pinta apagado, no como un día en el que no entrenó. */
  isFuture: boolean;
  /** Terminó al menos una sesión ese día. */
  hasSession: boolean;
  /** El equipo le registró la visita ese día. */
  hasAttendance: boolean;
};

export type OpenSession = {
  id: string;
  performedOn: string;
  routineName: string;
  dayTitle: string;
};

export type OverviewMembership = {
  status: MembershipStatus;
  /** `YYYY-MM-DD` o `null` si la membresía no tiene fecha de vencimiento. */
  expiresOn: string | null;
  planName: string | null;
};

export type OverviewCondition = {
  id: string;
  bodyPart: string;
  severity: Database["public"]["Enums"]["condition_severity"];
};

export type LastScreening = {
  takenOn: string;
  weightKg: number | null;
  bmi: number | null;
};

export type ActiveRoutine = {
  id: string;
  name: string;
};

export type PatientOverview = {
  today: string;
  week: WeekDay[];
  /**
   * Semanas seguidas con al menos una sesión terminada, contando hacia atrás
   * desde la semana en curso.
   *
   * Se cuenta por semanas y no por días a propósito: quien entrena tres veces
   * por semana —que es lo normal— nunca pasaría de una racha de un día, y una
   * cifra que siempre vale 1 no informa de nada. La semana en curso no rompe la
   * racha mientras no termine: si aún no ha entrenado, se empieza a contar
   * desde la anterior.
   */
  streakWeeks: number;
  openSession: OpenSession | null;
  /** La membresía de vencimiento más reciente, o `null` si nunca tuvo una. */
  membership: OverviewMembership | null;
  /** Condiciones marcadas como activas, de la más antigua a la más reciente. */
  conditions: OverviewCondition[];
  /** El último tamizaje registrado, para situar el peso y el IMC de un vistazo. */
  lastScreening: LastScreening | null;
  /** Días con visita registrada en el mes en curso. */
  monthAttendance: number;
  /** La rutina en curso, o `null` si aún no se le ha asignado ninguna. */
  activeRoutine: ActiveRoutine | null;
  /**
   * Alertas de este paciente sin marcar como leídas. Es cero para quien no
   * puede verlas —el propio paciente—, porque RLS no le devuelve ninguna.
   */
  unreadAlerts: number;
};

const iniciales = ["L", "M", "X", "J", "V", "S", "D"];

export async function patientOverview(patientId: string): Promise<PatientOverview> {
  const supabase = await createClient();
  const hoy = today();
  const lunes = inicioDeSemana(hoy);
  const desde = sumarDias(hoy, -HISTORIA_DIAS);
  const mes = monthStart();

  const [
    sessions,
    attendance,
    open,
    membership,
    conditions,
    lastScreening,
    monthAttendance,
    activeRoutine,
    unreadAlerts,
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select("performed_on")
      .eq("patient_id", patientId)
      .eq("status", "completed")
      .gte("performed_on", desde)
      .order("performed_on", { ascending: false }),
    supabase
      .from("attendance")
      .select("attended_on")
      .eq("patient_id", patientId)
      .gte("attended_on", lunes)
      .lte("attended_on", sumarDias(lunes, 6)),
    supabase
      .from("sessions")
      .select("id, performed_on, routines(name), routine_days(title)")
      .eq("patient_id", patientId)
      .eq("status", "in_progress")
      .order("performed_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // La membresía vigente es la de vencimiento más reciente, igual que en
    // `getPatientMembership`. El nombre del plan viaja embebido con el hint
    // explícito porque `memberships` apunta una sola vez a `plans`, pero
    // PostgREST lo pide igual.
    supabase
      .from("memberships")
      .select("status, expires_on, plan:plans!memberships_plan_id_fkey (name)")
      .eq("patient_id", patientId)
      .order("expires_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("patient_conditions")
      .select("id, body_part, severity")
      .eq("patient_id", patientId)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("screenings")
      .select("taken_on, weight_kg, bmi")
      .eq("patient_id", patientId)
      .order("taken_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Solo el conteo: la ficha muestra «N visitas este mes», no las fechas.
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId)
      .gte("attended_on", mes),
    supabase
      .from("routines")
      .select("id, name")
      .eq("patient_id", patientId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId)
      .is("read_at", null),
  ]);

  if (sessions.error)
    throw new Error(`No se pudo consultar tu historial: ${sessions.error.message}`);
  if (attendance.error)
    throw new Error(`No se pudo consultar tu asistencia: ${attendance.error.message}`);
  if (open.error)
    throw new Error(`No se pudo consultar tu sesión en curso: ${open.error.message}`);
  if (membership.error)
    throw new Error(`No se pudo consultar la membresía: ${membership.error.message}`);
  if (conditions.error)
    throw new Error(`No se pudieron consultar las condiciones: ${conditions.error.message}`);
  if (lastScreening.error)
    throw new Error(`No se pudo consultar el último tamizaje: ${lastScreening.error.message}`);
  if (monthAttendance.error)
    throw new Error(
      `No se pudo consultar la asistencia del mes: ${monthAttendance.error.message}`,
    );
  if (activeRoutine.error)
    throw new Error(`No se pudo consultar la rutina activa: ${activeRoutine.error.message}`);
  if (unreadAlerts.error)
    throw new Error(
      `No se pudieron contar las alertas sin leer: ${unreadAlerts.error.message}`,
    );

  const conSesion = new Set((sessions.data ?? []).map((row) => row.performed_on));
  const conVisita = new Set((attendance.data ?? []).map((row) => row.attended_on));

  const week: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = sumarDias(lunes, i);
    return {
      date,
      initial: iniciales[i],
      dayOfMonth: Number(date.slice(8, 10)),
      isToday: date === hoy,
      isFuture: date > hoy,
      hasSession: conSesion.has(date),
      hasAttendance: conVisita.has(date),
    };
  });

  const plan = Array.isArray(membership.data?.plan)
    ? membership.data?.plan[0]
    : membership.data?.plan;

  return {
    today: hoy,
    week,
    streakWeeks: contarSemanas(conSesion, lunes),
    openSession: open.data
      ? {
          id: open.data.id,
          performedOn: open.data.performed_on,
          routineName: open.data.routines?.name ?? "Tu rutina",
          dayTitle: open.data.routine_days?.title ?? "Sesión en curso",
        }
      : null,
    membership: membership.data
      ? {
          status: membership.data.status,
          expiresOn: membership.data.expires_on,
          planName: plan?.name ?? null,
        }
      : null,
    conditions: (conditions.data ?? []).map((row) => ({
      id: row.id,
      bodyPart: row.body_part,
      severity: row.severity,
    })),
    lastScreening: lastScreening.data
      ? {
          takenOn: lastScreening.data.taken_on,
          weightKg: lastScreening.data.weight_kg,
          bmi: lastScreening.data.bmi,
        }
      : null,
    monthAttendance: monthAttendance.count ?? 0,
    activeRoutine: activeRoutine.data
      ? { id: activeRoutine.data.id, name: activeRoutine.data.name }
      : null,
    unreadAlerts: unreadAlerts.count ?? 0,
  };
}

/**
 * Semanas seguidas con al menos una sesión, hacia atrás desde `lunes`. La
 * historia leída acota el resultado: doce semanas es el techo, y para la
 * portada «12 semanas» ya dice lo que hay que decir.
 */
function contarSemanas(fechas: Set<string>, lunes: string) {
  const semanas = new Set([...fechas].map(inicioDeSemana));
  let racha = 0;
  let cursor = lunes;
  // La semana en curso no cuenta como rota mientras no termine: si todavía no
  // hay sesión, se salta y se sigue contando desde la anterior.
  if (!semanas.has(cursor)) cursor = sumarDias(cursor, -7);
  while (semanas.has(cursor)) {
    racha += 1;
    cursor = sumarDias(cursor, -7);
  }
  return racha;
}
