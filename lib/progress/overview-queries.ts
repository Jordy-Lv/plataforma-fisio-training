import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  monthStart,
  previousMonthStart,
  today,
} from "@/lib/progress/vocabulary";

/** Las tres cifras que el panel de administración resume del mes en curso. */
export type BusinessOverview = {
  /** Cuántos pacientes están activos hoy, sin acotar al mes. */
  activePatients: number;
  compliance: Compliance;
  attendance: AttendanceOverview;
};

export type Compliance = {
  /** Ejercicios cumplidos sobre los registrados, entre 0 y 1, o `null`. */
  rate: number | null;
  done: number;
  logged: number;
  /** Sesiones del mes de las que salen esos registros. */
  sessions: number;
};

export type AttendanceOverview = {
  /** Días de asistencia sumados de todos los pacientes activos. */
  visits: number;
  /** Cuántos de esos pacientes vinieron al menos una vez. */
  attended: number;
};

/*
  Cumplimiento: de los ejercicios que el paciente registró en las sesiones del
  mes, cuántos hizo. Cuentan como cumplidos los marcados `done` y los
  `modified` —el paciente hizo el trabajo, con una sustitución acordada— y no
  cuentan los `skipped`, que son los que dejó sin hacer. La regla vive ahora en
  `public.business_overview`, en la misma migración que la crea.

  No se mide sobre las sesiones cerradas ni sobre los ejercicios prescritos:
  lo primero premia al que abandona una sesión a la mitad, porque la sesión
  abierta no resta; lo segundo castiga al paciente que todavía la tiene en
  curso, porque lo que aún no ha registrado contaría como incumplido.
*/

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Las cifras de `business_overview` desde `since`, ya convertidas. RLS decide
 * el alcance: el administrador lo ve de todo el negocio.
 *
 * **Las cinco cifras se agregan en la base**, en una sola consulta. Antes se
 * traían las sesiones del mes con sus registros embebidos y se contaba aquí,
 * y PostgREST corta la respuesta en `max_rows`: pasada esa marca el porcentaje
 * se calculaba sobre un subconjunto truncado y salía mal **sin ningún aviso**.
 * Es el número que responde el primer punto ciego del negocio y uno de los tres
 * KPI de la portada, así que un número inventado ahí es peor que no tenerlo.
 */
async function overviewSince(
  supabase: Client,
  since: string,
): Promise<BusinessOverview> {
  const { data, error } = await supabase
    .rpc("business_overview", { since })
    .single();

  if (error)
    throw new Error(
      `No se pudo consultar el panorama del negocio: ${error.message}`,
    );

  const logged = Number(data.logged);
  const done = Number(data.done);

  return {
    activePatients: Number(data.active_patients),
    compliance: {
      // Sin un solo registro no hay porcentaje que dar: `null` es «todavía no
      // se sabe», que la pantalla explica, y no un 0 % que acusa a nadie.
      rate: logged === 0 ? null : done / logged,
      done,
      logged,
      sessions: Number(data.sessions),
    },
    attendance: {
      visits: Number(data.visits),
      attended: Number(data.attended),
    },
  };
}

/** El mes anterior, para decir si el negocio va a más o a menos. */
export type PreviousMonth = {
  /** Primer día del mes anterior, `YYYY-MM-DD`. */
  since: string;
  /** Cumplimiento del mes anterior, entre 0 y 1, o `null` sin registros. */
  complianceRate: number | null;
  /** Días de asistencia del mes anterior. */
  visits: number;
};

/** Lo que pide la mano del administrador hoy. Cada cifra tiene su pantalla. */
export type AdminAttention = {
  /** Membresías marcadas como vencidas por la revisión diaria. */
  expiredMemberships: number;
  /** Membresías marcadas como próximas a vencer. */
  expiringMemberships: number;
  /** Alertas dirigidas a este administrador que aún no abrió. */
  unreadAlerts: number;
  /** Pacientes activos sin ningún profesional con acompañamiento vigente. */
  unassignedPatients: number;
};

/** Un hecho reciente del negocio: una sesión cerrada o un paciente nuevo. */
export type ActivityItem = {
  kind: "session" | "patient";
  id: string;
  /** `timestamptz` del hecho, para ordenar y fechar. */
  at: string;
  patientId: string;
  patientName: string | null;
  /** «Día 2 · Tren superior» en una sesión; `null` en un alta. */
  detail: string | null;
};

export type AdminDashboard = {
  overview: BusinessOverview;
  previous: PreviousMonth;
  /** Pacientes dados de alta este mes. */
  newPatients: number;
  attention: AdminAttention;
  activity: ActivityItem[];
};

/** Cuántos hechos recientes caben en el panel sin convertirlo en un listado. */
const ACTIVITY_LIMIT = 6;

/**
 * Todo lo que enseña el panel del administrador, en un solo `Promise.all`:
 * conteos con `head: true`, dos agregados en la base y dos listas cortas con
 * `limit`. Ninguna consulta por fila.
 *
 * **El mes anterior sale de restar.** `business_overview(since)` acota la
 * asistencia al mes que empieza en `since`, pero el cumplimiento lo cuenta
 * desde `since` hasta hoy. Así que el cumplimiento del mes anterior es lo
 * contado desde el mes anterior menos lo contado desde este: una sesión cae en
 * un solo mes. Evita una migración solo para el panel.
 */
export async function getAdminDashboard(
  adminId: string,
): Promise<AdminDashboard> {
  const supabase = await createClient();
  const since = monthStart();
  const previousSince = previousMonthStart();

  const [
    overview,
    fromPrevious,
    newPatients,
    expired,
    expiring,
    alerts,
    unassigned,
    sessions,
    patients,
  ] = await Promise.all([
    overviewSince(supabase, since),
    overviewSince(supabase, previousSince),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "patient")
      // `created_at` es `timestamptz`: el mes empieza a medianoche de Bogotá,
      // que no cambia de horario, no a medianoche UTC.
      .gte("created_at", `${since}T00:00:00-05:00`),
    // Mismo criterio que las secciones de `/memberships`: el estado que marca
    // la revisión diaria, no una cuenta de días hecha aquí.
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "expired"),
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "expiring_soon"),
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .eq("recipient_id", adminId),
    // Antirreunión en PostgREST: el embebido se filtra a los acompañamientos
    // vigentes y `is(..., null)` se queda con quien no tiene ninguno.
    supabase
      .from("profiles")
      .select("id, assignments:care_assignments!care_assignments_patient_id_fkey(id)", {
        count: "exact",
        head: true,
      })
      .eq("role", "patient")
      .eq("is_active", true)
      .is("assignments.ended_at", null)
      .is("assignments", null),
    supabase
      .from("sessions")
      .select(
        "id, completed_at, patient_id, patient:profiles!sessions_patient_id_fkey(full_name), routine_days(title, day_number)",
      )
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(ACTIVITY_LIMIT),
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "patient")
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LIMIT),
  ]);

  for (const [result, what] of [
    [newPatients, "los pacientes nuevos del mes"],
    [expired, "las membresías vencidas"],
    [expiring, "las membresías por vencer"],
    [alerts, "las alertas sin leer"],
    [unassigned, "los pacientes sin acompañamiento"],
    [sessions, "las últimas sesiones"],
    [patients, "las últimas altas"],
  ] as const)
    if (result.error)
      throw new Error(`No se pudieron consultar ${what}: ${result.error.message}`);

  const previousLogged =
    fromPrevious.compliance.logged - overview.compliance.logged;
  const previousDone = fromPrevious.compliance.done - overview.compliance.done;

  const activity: ActivityItem[] = [
    ...(sessions.data ?? []).map((session) => {
      const patient = Array.isArray(session.patient)
        ? session.patient[0]
        : session.patient;
      const day = Array.isArray(session.routine_days)
        ? session.routine_days[0]
        : session.routine_days;
      return {
        kind: "session" as const,
        id: session.id,
        at: session.completed_at as string,
        patientId: session.patient_id,
        patientName: patient?.full_name ?? null,
        detail: day
          ? `Día ${day.day_number}${day.title ? ` · ${day.title}` : ""}`
          : null,
      };
    }),
    ...(patients.data ?? []).map((patient) => ({
      kind: "patient" as const,
      id: patient.id,
      at: patient.created_at,
      patientId: patient.id,
      patientName: patient.full_name,
      detail: null,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, ACTIVITY_LIMIT);

  return {
    overview,
    previous: {
      since: previousSince,
      complianceRate:
        previousLogged <= 0 ? null : previousDone / previousLogged,
      visits: fromPrevious.attendance.visits,
    },
    newPatients: newPatients.count ?? 0,
    attention: {
      expiredMemberships: expired.count ?? 0,
      expiringMemberships: expiring.count ?? 0,
      unreadAlerts: alerts.count ?? 0,
      unassignedPatients: unassigned.count ?? 0,
    },
    activity,
  };
}

/**
 * Lo que el profesional tiene que atender **hoy**: alertas clínicas sin leer,
 * sesiones con fecha de hoy y pacientes activos que aún no tienen tamizaje.
 *
 * Es la contraparte de trabajo de `getBusinessOverview`, y desde KAN-5 son de
 * pantallas distintas: `/admin` enseña el mes del negocio y `/pro`, el día. Un
 * solo `Promise.all`, conteos con `head: true` y ninguna consulta por fila.
 * RLS decide el alcance: el profesional cuenta solo sobre quien acompaña.
 *
 * Las membresías por vencer salieron de aquí: son del administrador (la matriz
 * de `docs/04-roles-y-permisos.md`), y viven en `/memberships`.
 */
export type ProWorkboard = {
  /** Alertas clínicas sin marcar como leídas. */
  unreadAlerts: number;
  /** Sesiones con `performed_on` de hoy, en curso o cerradas. */
  todaySessions: number;
  /** Pacientes activos sin ningún tamizaje registrado. */
  pendingScreenings: number;
  /** Cuántos pacientes activos acompaña, para decidir el estado vacío. */
  activePatients: number;
};

export async function getProWorkboard(): Promise<ProWorkboard> {
  const supabase = await createClient();
  const day = today();

  const [alerts, sessions, screenings, patients] = await Promise.all([
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("performed_on", day),
    // «Pendiente» es quien no tiene ningún tamizaje. Se cuenta en la base con
    // un `not exists`: traer todos los perfiles con su tamizaje embebido para
    // contar los que venían vacíos tenía el mismo tope de `max_rows` que
    // falseaba el cumplimiento.
    supabase.rpc("pending_screenings"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "patient")
      .eq("is_active", true),
  ]);

  if (alerts.error)
    throw new Error(
      `No se pudieron contar las alertas sin leer: ${alerts.error.message}`,
    );
  if (sessions.error)
    throw new Error(
      `No se pudieron contar las sesiones de hoy: ${sessions.error.message}`,
    );
  if (screenings.error)
    throw new Error(
      `No se pudieron consultar los tamizajes pendientes: ${screenings.error.message}`,
    );
  if (patients.error)
    throw new Error(
      `No se pudieron contar los pacientes activos: ${patients.error.message}`,
    );

  return {
    unreadAlerts: alerts.count ?? 0,
    todaySessions: sessions.count ?? 0,
    pendingScreenings: Number(screenings.data ?? 0),
    activePatients: patients.count ?? 0,
  };
}
