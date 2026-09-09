import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import { measurements, type Measurement } from "@/lib/progress/vocabulary";
import { screeningList, type ScreeningFilters } from "@/lib/progress/screening-list";
import { sanitizeSearch } from "@/lib/shared/search";

type ScreeningRow = Database["public"]["Tables"]["screenings"]["Row"];

export type Screening = Pick<
  ScreeningRow,
  "id" | "taken_on" | "weight_kg" | "height_cm" | "bmi" | "body_fat_pct" | "notes"
> & { measurements: Partial<Record<Measurement, number>> };

export type PatientWithLastScreening = {
  id: string;
  full_name: string | null;
  last: Pick<Screening, "taken_on" | "weight_kg" | "bmi"> | null;
};

export type PatientScreenings = {
  patient: { id: string; full_name: string | null };
  screenings: Screening[];
};

/**
 * `measurements` es `jsonb`: llega sin tipo. Solo se conservan las claves del
 * vocabulario con un número dentro, para que una medida escrita a mano en la
 * base de datos no rompa la pantalla.
 */
function readMeasurements(value: unknown): Partial<Record<Measurement, number>> {
  if (typeof value !== "object" || value === null) return {};
  const source = value as Record<string, unknown>;
  const result: Partial<Record<Measurement, number>> = {};
  for (const key of measurements) {
    if (typeof source[key] === "number") result[key] = source[key];
  }
  return result;
}

const columns =
  "id, taken_on, weight_kg, height_cm, bmi, body_fat_pct, measurements, notes";

/**
 * `screenings` apunta dos veces a `profiles` —el paciente y quien lo midió—,
 * así que la relación se nombra: sin esto PostgREST no sabe por cuál embeber.
 */
const porPaciente = "screenings!screenings_patient_id_fkey";

/**
 * Los pacientes que el actor puede seguir, con su último tamizaje. RLS decide
 * el alcance: el administrador los ve todos y el profesional solo los suyos.
 *
 * El último tamizaje viaja embebido y limitado a uno por paciente: es lo que
 * distingue a quien ya tiene seguimiento de quien nunca fue medido, y pedirlo
 * aparte sería una consulta por fila.
 */
export async function listPatientsWithLastScreening(
  filters: ScreeningFilters = screeningList.empty,
): Promise<{
  patients: PatientWithLastScreening[];
  total: number;
  pages: number;
}> {
  const supabase = await createClient();
  const term = sanitizeSearch(filters.q ?? "");
  let query = supabase
    .from("profiles")
    .select(`id, full_name, ${porPaciente} (taken_on, weight_kg, bmi)`)
    .eq("role", "patient")
    .eq("is_active", true)
    .order("full_name")
    .order("taken_on", { referencedTable: "screenings", ascending: false })
    .limit(1, { referencedTable: "screenings" });
  if (term) query = query.ilike("full_name", `%${term}%`);
  const { data, error } = await query;
  if (error)
    throw new Error(`No se pudieron consultar los pacientes: ${error.message}`);

  // «Con tamizaje» y «sin tamizaje» dependen de la fila embebida, no de una
  // columna: el recorte va aquí. La lista es la de pacientes activos.
  const all = (data ?? [])
    .map(({ screenings, ...patient }) => ({
      ...patient,
      last: screenings[0] ?? null,
    }))
    .filter((patient) =>
      filters.taken === "some"
        ? patient.last !== null
        : filters.taken === "none"
          ? patient.last === null
          : true,
    );
  const { from, to } = screeningList.range(filters);
  return {
    patients: all.slice(from, to + 1),
    total: all.length,
    pages: screeningList.pages(all.length),
  };
}

/**
 * El historial completo de un paciente, del tamizaje más reciente al más
 * antiguo. Devuelve `null` si no existe o si RLS no deja verlo, que es lo que
 * ocurre cuando el profesional no tiene asignación vigente.
 */
export async function getPatientScreenings(
  patientId: string,
): Promise<PatientScreenings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(`id, full_name, ${porPaciente} (${columns})`)
    .eq("id", patientId)
    .eq("role", "patient")
    .order("taken_on", { referencedTable: "screenings", ascending: false })
    .maybeSingle();
  if (error)
    throw new Error(`No se pudo consultar el seguimiento: ${error.message}`);
  if (!data) return null;

  const { screenings, ...patient } = data;
  return {
    patient,
    screenings: screenings.map(({ measurements: raw, ...screening }) => ({
      ...screening,
      measurements: readMeasurements(raw),
    })),
  };
}
