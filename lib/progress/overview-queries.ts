import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listPatientsWithMonthAttendance } from "@/lib/progress/attendance-queries";
import { monthStart } from "@/lib/progress/vocabulary";

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
    listPatientsWithMonthAttendance(),
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
      visits: attendance.reduce((total, patient) => total + patient.days, 0),
      attended: attendance.filter((patient) => patient.days > 0).length,
    },
  };
}
