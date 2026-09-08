import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listPatientsWithMonthAttendance } from "@/lib/progress/attendance-queries";
import { monthStart, today } from "@/lib/progress/vocabulary";

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

/**
 * Cumplimiento: de los ejercicios que el paciente registró en las sesiones del
 * mes, cuántos hizo. Cuentan como cumplidos los marcados `done` y los
 * `modified` —el paciente hizo el trabajo, con una sustitución acordada— y no
 * cuentan los `skipped`, que son los que dejó sin hacer.
 *
 * No se mide sobre las sesiones cerradas ni sobre los ejercicios prescritos:
 * lo primero premia al que abandona una sesión a la mitad, porque la sesión
 * abierta no resta; lo segundo castiga al paciente que todavía la tiene en
 * curso, porque lo que aún no ha registrado contaría como incumplido.
 */
const cumplidos = new Set(["done", "modified"]);

/**
 * El panorama del negocio. RLS decide el alcance: esta consulta la hace el
 * administrador, que lee todas las filas.
 *
 * Son tres consultas fijas, no una por paciente: las sesiones del mes viajan
 * con sus registros embebidos y la asistencia sale del helper que ya la acota
 * al mes en una sola consulta.
 */
export async function getBusinessOverview(): Promise<BusinessOverview> {
  const supabase = await createClient();
  const month = monthStart();

  const [patients, sessions, attendance] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "patient")
      .eq("is_active", true),
    supabase
      .from("sessions")
      .select("id, session_logs (status)")
      .gte("performed_on", month),
    listPatientsWithMonthAttendance(undefined, { paginate: false }),
  ]);

  if (patients.error)
    throw new Error(
      `No se pudieron contar los clientes activos: ${patients.error.message}`,
    );
  if (sessions.error)
    throw new Error(
      `No se pudo consultar el cumplimiento: ${sessions.error.message}`,
    );

  const logs = (sessions.data ?? []).flatMap((session) => session.session_logs);
  const done = logs.filter((log) => cumplidos.has(log.status)).length;

  return {
    activePatients: patients.count ?? 0,
    compliance: {
      rate: logs.length === 0 ? null : done / logs.length,
      done,
      logged: logs.length,
      sessions: sessions.data?.length ?? 0,
    },
    attendance: {
      visits: attendance.patients.reduce((total, patient) => total + patient.days, 0),
      attended: attendance.patients.filter((patient) => patient.days > 0).length,
    },
  };
}

/**
 * Lo que el panel del personal tiene que atender ahora mismo, no el resumen
 * del mes: alertas clínicas sin leer, sesiones con fecha de hoy, membresías en
 * su ventana de vencimiento y pacientes activos que aún no tienen tamizaje.
 *
 * Es la contraparte de trabajo de `getBusinessOverview` y sigue la misma
 * forma que la agregación de la ficha del paciente (`patientOverview`): un
 * solo `Promise.all`, conteos con `head: true` y ninguna consulta por fila.
 * RLS decide el alcance —el administrador ve todo el negocio; el profesional,
 * solo a quien acompaña—.
 */
export type StaffWorkboard = {
  /** Alertas clínicas sin marcar como leídas. */
  unreadAlerts: number;
  /** Sesiones con `performed_on` de hoy, en curso o cerradas. */
  todaySessions: number;
  /** Membresías en estado «próxima a vencer». */
  expiringMemberships: number;
  /** Pacientes activos sin ningún tamizaje registrado. */
  pendingScreenings: number;
};

export async function getStaffWorkboard(): Promise<StaffWorkboard> {
  const supabase = await createClient();
  const day = today();

  const [alerts, sessions, memberships, patients] = await Promise.all([
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("performed_on", day),
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "expiring_soon"),
    // «Pendiente» es quien no tiene ninguna fila embebida: la misma forma que
    // usa `listPatientsWithLastScreening`, con el tamizaje limitado a uno y sin
    // traer columnas que no se cuentan.
    supabase
      .from("profiles")
      .select("id, screenings!screenings_patient_id_fkey (id)")
      .eq("role", "patient")
      .eq("is_active", true)
      .limit(1, { referencedTable: "screenings" }),
  ]);

  if (alerts.error)
    throw new Error(
      `No se pudieron contar las alertas sin leer: ${alerts.error.message}`,
    );
  if (sessions.error)
    throw new Error(
      `No se pudieron contar las sesiones de hoy: ${sessions.error.message}`,
    );
  if (memberships.error)
    throw new Error(
      `No se pudieron contar las membresías por vencer: ${memberships.error.message}`,
    );
  if (patients.error)
    throw new Error(
      `No se pudieron consultar los tamizajes pendientes: ${patients.error.message}`,
    );

  return {
    unreadAlerts: alerts.count ?? 0,
    todaySessions: sessions.count ?? 0,
    expiringMemberships: memberships.count ?? 0,
    pendingScreenings: (patients.data ?? []).filter(
      (patient) => patient.screenings.length === 0,
    ).length,
  };
}
