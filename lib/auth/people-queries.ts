import "server-only";

import type { Database } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import { readPage } from "@/lib/shared/read-pages";
import { sanitizeSearch } from "@/lib/shared/search";

/** Sin rango se piden todas las filas; es el tope de PostgREST, no un tamaño de página. */
const maxRows = 999;

/**
 * Las consultas del directorio de personas, en un solo sitio. Antes vivían
 * dentro de `PeoplePanel.tsx` y repetidas —con otras columnas— en
 * `/pro/routines` y `/pro/sessions`.
 *
 * RLS decide el alcance: el administrador ve a todo el mundo y el profesional
 * solo a quien tiene asignado. Ninguna de estas funciones lo replica en
 * TypeScript.
 */

/** Columnas del directorio. Nunca `select("*")`. */
const personColumns = "id, full_name, role, specialty, phone, is_active";

export type Person = {
  id: string;
  full_name: string | null;
  role: Database["public"]["Enums"]["user_role"];
  /** El enum real de la columna, no `string`: los desplegables lo estrechan. */
  specialty: Database["public"]["Enums"]["professional_specialty"] | null;
  phone: string | null;
  is_active: boolean;
};

export type PeopleFilters = {
  q?: string;
  /** «Todas» es no pasar nada; nunca hay un estado por defecto que esconda filas. */
  state?: "active" | "inactive";
};

/** A quién incluye el directorio: el profesional solo ve pacientes. */
export type PeopleScope = "patients" | "everyone";

/**
 * El techo del directorio de `/people`. No es un tamaño de página: es el tope
 * duro de PostgREST hecho explícito, para poder **contar** cuántas filas
 * quedaron fuera en vez de truncar en silencio (KAN-14).
 */
export const directoryCeiling = maxRows;

/** El armado de la consulta, compartido por las dos lecturas del directorio. */
function peopleQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scope: PeopleScope,
  filters: PeopleFilters,
  count?: "exact",
) {
  let query = supabase
    .from("profiles")
    .select(personColumns, count ? { count } : undefined)
    .in("role", scope === "everyone" ? ["professional", "patient"] : ["patient"])
    .order("full_name");
  const term = sanitizeSearch(filters.q ?? "");
  if (term) query = query.ilike("full_name", `%${term}%`);
  if (filters.state) query = query.eq("is_active", filters.state === "active");
  return query;
}

export async function listPeople(
  scope: PeopleScope,
  filters: PeopleFilters = {},
): Promise<Person[]> {
  const supabase = await createClient();
  const { data, error } = await peopleQuery(supabase, scope, filters);
  if (error)
    throw new Error(`No se pudieron consultar las personas: ${error.message}`);
  return (data ?? []) as Person[];
}

/**
 * Lo mismo, pero diciendo **cuántas personas hay en total**.
 *
 * `/people` filtra en el cliente sobre una lista ya pintada —la deuda 3.3 de
 * `docs/15` sigue congelada: con las cuatro tarjetas en `SheetModal`, un filtro
 * en la URL navegaría y cerraría el modal en cada tecla—, así que el listado no
 * se pagina: estrecharlo dejaría fuera del buscador a quien no cupiera en la
 * página. Lo que sí se arregla es el defecto real: hasta ahora la consulta se
 * comía el tope de PostgREST sin avisar y la gente sobrante desaparecía sin
 * rastro. Con el total a la vista, la pantalla puede decirlo.
 */
export async function listPeopleDirectory(
  scope: PeopleScope,
  filters: PeopleFilters = {},
): Promise<{ people: Person[]; total: number }> {
  const supabase = await createClient();
  const { data, error, count } = await peopleQuery(
    supabase,
    scope,
    filters,
    "exact",
  ).range(0, directoryCeiling - 1);
  if (error)
    throw new Error(`No se pudieron consultar las personas: ${error.message}`);
  const people = (data ?? []) as Person[];
  return { people, total: count ?? people.length };
}

/** El estado de la rutina de un paciente, tal y como se pinta en la tarjeta. */
export type PatientRoutineState = "active" | "review" | "none";

export type PatientProfile = {
  id: string;
  full_name: string | null;
  is_active: boolean;
  routine: PatientRoutineState;
};

export type PatientProfileFilters = {
  q?: string;
  state?: "active" | "inactive";
  /** `with` = tiene rutina activa; `without` = todavía no tiene ninguna. */
  routine?: "with" | "without";
  /** Rango de la página. Sin él, la consulta trae todas las filas visibles. */
  range?: { from: number; to: number };
};

/**
 * Los pacientes que el actor puede atender, con el estado de su rutina más
 * reciente. La rutina viaja embebida y limitada a una por paciente: pedirla
 * aparte sería una consulta por fila.
 *
 * El filtro por rutina se resuelve con **una** consulta previa que trae los
 * pacientes con rutina activa, no con una consulta por paciente.
 */
export async function listPatientProfiles(
  filters: PatientProfileFilters = {},
): Promise<{ patients: PatientProfile[]; total: number }> {
  const supabase = await createClient();

  let withActiveRoutine: string[] | null = null;
  if (filters.routine) {
    const { data, error } = await supabase
      .from("routines")
      .select("patient_id")
      .eq("status", "active");
    if (error)
      throw new Error(`No se pudieron consultar las rutinas: ${error.message}`);
    withActiveRoutine = [...new Set((data ?? []).map((row) => row.patient_id))];
  }

  const query = () => {
    let request = supabase
      .from("profiles")
      .select("id, full_name, is_active, routines!routines_patient_id_fkey(status, created_at)", {
        count: "exact",
      })
      .eq("role", "patient")
      .order("full_name")
      .order("created_at", { referencedTable: "routines", ascending: false })
      .limit(1, { referencedTable: "routines" });

    const term = sanitizeSearch(filters.q ?? "");
    if (term) request = request.ilike("full_name", `%${term}%`);
    if (filters.state) request = request.eq("is_active", filters.state === "active");
    if (withActiveRoutine !== null && withActiveRoutine.length > 0) {
      if (filters.routine === "with") {
        request = request.in("id", withActiveRoutine);
      } else {
        request = request.not("id", "in", `(${withActiveRoutine.join(",")})`);
      }
    }
    return request;
  };
  // Sin ninguna rutina activa, «con rutina» no puede devolver nada y `in.()`
  // es sintaxis inválida en PostgREST: se fuerza el conjunto vacío aparte.
  if (withActiveRoutine?.length === 0 && filters.routine === "with")
    return { patients: [], total: 0 };

  const { rows: data, total: count } = await readPage(
    (from, to) => query().range(from, to),
    filters.range ?? { from: 0, to: maxRows },
    "No se pudieron consultar los pacientes",
  );

  const patients = (data ?? []).map((patient) => {
    const status = patient.routines[0]?.status;
    return {
      id: patient.id,
      full_name: patient.full_name,
      is_active: patient.is_active,
      routine:
        status === "active" ? "active" : status ? "review" : ("none" as const),
    } as PatientProfile;
  });
  return { patients, total: count };
}
