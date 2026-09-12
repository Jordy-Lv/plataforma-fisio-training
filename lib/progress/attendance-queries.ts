import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import { monthStart } from "@/lib/progress/vocabulary";
import {
  attendanceList,
  currentMonth,
  shiftMonth,
  type AttendanceFilters,
} from "@/lib/progress/attendance-list";
import { sanitizeSearch } from "@/lib/shared/search";

type AttendanceRow = Database["public"]["Tables"]["attendance"]["Row"];

export type Attendance = Pick<
  AttendanceRow,
  "id" | "attended_on" | "check_in_at" | "notes"
>;

/** Lo que se dice de un paciente en el listado: cómo va este mes. */
export type PatientAttendanceSummary = {
  id: string;
  full_name: string | null;
  days: number;
  last: string | null;
};

export type PatientAttendance = {
  patient: { id: string; full_name: string | null };
  attendance: Attendance[];
};

const columns = "id, attended_on, check_in_at, notes";

/**
 * `attendance` apunta dos veces a `profiles` —el paciente y quien registró—,
 * así que la relación se nombra: sin esto PostgREST no sabe por cuál embeber.
 */
const porPaciente = "attendance!attendance_patient_id_fkey";

/** Cuántos de esos días caen en el mes en curso. */
export function daysThisMonth(records: { attended_on: string }[]) {
  const month = monthStart().slice(0, 7);
  return records.filter((record) => record.attended_on.startsWith(month))
    .length;
}

/**
 * Los pacientes que el actor puede seguir con su asistencia del mes en curso.
 * RLS decide el alcance: el administrador los ve todos y el profesional solo
 * los suyos.
 *
 * La asistencia viaja embebida y acotada al mes: son treinta y una filas como
 * mucho por paciente, y pedir el resumen aparte sería una consulta por fila.
 */
export async function listPatientsWithMonthAttendance(
  filters: AttendanceFilters = attendanceList.empty,
  options: { paginate?: boolean } = {},
): Promise<{
  patients: PatientAttendanceSummary[];
  total: number;
  pages: number;
  month: string;
}> {
  const supabase = await createClient();
  const month = currentMonth(filters);
  const term = sanitizeSearch(filters.q ?? "");
  let query = supabase
    .from("profiles")
    .select(`id, full_name, ${porPaciente} (attended_on)`)
    .eq("role", "patient")
    .eq("is_active", true)
    .gte("attendance.attended_on", `${month}-01`)
    .lt("attendance.attended_on", `${shiftMonth(month, 1)}-01`)
    .order("full_name")
    .order("attended_on", { referencedTable: "attendance", ascending: false });
  if (term) query = query.ilike("full_name", `%${term}%`);
  const { data, error } = await query;
  if (error)
    throw new Error(`No se pudo consultar la asistencia: ${error.message}`);

  // «Vino» y «no vino» dependen de las filas embebidas, no de una columna: el
  // recorte va aquí y no en PostgREST. La lista es la de pacientes activos del
  // negocio, así que cabe en memoria sin problema.
  const filtered = (data ?? [])
    .map(({ attendance, ...patient }) => ({
      ...patient,
      days: attendance.length,
      last: attendance[0]?.attended_on ?? null,
    }))
    .filter((patient) =>
      filters.attended === "some"
        ? patient.days > 0
        : filters.attended === "none"
          ? patient.days === 0
          : true,
    );
  // `nombre` ya sale así de la consulta; los otros dos exigen leer el resumen
  // que se calculó arriba, así que se ordenan aquí y no en PostgREST.
  const all = filters.orden === "dias" ? [...filtered].sort((a, b) => b.days - a.days)
    : filters.orden === "reciente" ? [...filtered].sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""))
    : filtered;
  const { from, to } = attendanceList.range(filters);
  return {
    // El panorama del negocio suma sobre todos los pacientes del mes, no sobre
    // una página: por eso puede pedir la lista entera.
    patients: options.paginate === false ? all : all.slice(from, to + 1),
    total: all.length,
    pages: attendanceList.pages(all.length),
    month,
  };
}

/**
 * El historial completo de un paciente, de la asistencia más reciente a la más
 * antigua. Devuelve `null` si no existe o si RLS no deja verlo, que es lo que
 * ocurre cuando el profesional no tiene asignación vigente.
 */
export async function getPatientAttendance(
  patientId: string,
): Promise<PatientAttendance | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(`id, full_name, ${porPaciente} (${columns})`)
    .eq("id", patientId)
    .eq("role", "patient")
    .order("attended_on", { referencedTable: "attendance", ascending: false })
    .maybeSingle();
  if (error)
    throw new Error(`No se pudo consultar la asistencia: ${error.message}`);
  if (!data) return null;

  const { attendance, ...patient } = data;
  return { patient, attendance };
}

/**
 * La asistencia de un paciente vista por él mismo. El identificador sale de la
 * sesión, nunca de la URL, y se filtra igual aunque RLS ya lo haga: así la
 * consulta no depende de que la política sea la que se cree que es.
 */
export async function listOwnAttendance(
  patientId: string,
): Promise<Attendance[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select(columns)
    .eq("patient_id", patientId)
    .order("attended_on", { ascending: false });
  if (error)
    throw new Error(`No se pudo consultar tu asistencia: ${error.message}`);
  return data ?? [];
}
