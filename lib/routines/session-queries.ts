import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sessionList, type SessionListFilters } from "@/lib/routines/session-list";
import { readPage } from "@/lib/shared/read-pages";

/** La sesión con todo lo que registró el paciente: es lo que pinta `SessionReport`. */
const detailColumns = `id, patient_id, routine_id, routine_day_id,
    performed_on, status, completed_at, routines(name), routine_days(title, day_number),
    session_logs(id, routine_item_id, status, actual_sets, actual_reps, actual_weight, prescribed_sets,
      prescribed_reps, prescribed_weight, perceived_effort, pain_level, pain_location, notes,
      replaced_by_exercise_id, exercises!session_logs_exercise_id_fkey(name, description, media_url),
      replacement:exercises!session_logs_replaced_by_exercise_id_fkey(name))`;

export async function sessionDetails(sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").select(detailColumns).eq("id", sessionId).maybeSingle();
  if (error) throw new Error(`No se pudo consultar la sesión: ${error.message}`);
  return data;
}
export type SessionDetails = NonNullable<Awaited<ReturnType<typeof sessionDetails>>>;
export type SessionLog = SessionDetails["session_logs"][number];

/**
 * Los informes de varias sesiones de una vez, para leerlos en un diálogo sin
 * cambiar de pantalla (15.4). Una sola consulta con `in`, nunca una por fila:
 * quien la llama ya tiene los identificadores de **su página**, así que el
 * tamaño está acotado por la paginación del listado.
 *
 * Devuelve un `Map` porque quien la llama recorre su propia lista y busca por
 * identificador. Una sesión que RLS no deje ver simplemente no está en el mapa.
 */
export async function sessionReports(sessionIds: string[]) {
  const ids = [...new Set(sessionIds)];
  if (ids.length === 0) return new Map<string, SessionDetails>();
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").select(detailColumns).in("id", ids);
  if (error) throw new Error(`No se pudieron consultar las sesiones: ${error.message}`);
  return new Map((data ?? []).map((session) => [session.id, session]));
}

/**
 * El historial de sesiones de un paciente, de la más reciente a la más
 * antigua. Antes se recortaba con un `.limit(50)` fijo que no avisaba de nada:
 * ahora la página y el rango de fechas viajan en la URL y el total sale de la
 * base, así que se sabe cuántas hay.
 */
export async function patientSessions(patientId: string, filters: SessionListFilters = sessionList.empty) {
  const supabase = await createClient();
  const { from, to } = sessionList.range(filters);
  const query = () => {
    let request = supabase.from("sessions")
      .select("id, routine_day_id, performed_on, status, routines(name), routine_days(day_number, title)", { count: "exact" })
      .eq("patient_id", patientId).order("performed_on", { ascending: false }).order("created_at", { ascending: false });
    if (filters.status) request = request.eq("status", filters.status);
    if (filters.from) request = request.gte("performed_on", filters.from);
    if (filters.to) request = request.lte("performed_on", filters.to);
    return request;
  };
  const { rows, total } = await readPage((start, end) => query().range(start, end),
    { from, to }, "No se pudo consultar el historial");
  return { sessions: rows, total, pages: sessionList.pages(total) };
}
export type PatientSession = Awaited<ReturnType<typeof patientSessions>>["sessions"][number];
export async function executionExercises(dayId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("routine_items")
    .select("id, exercise_id, sets, reps, target_weight, rest_seconds, exercises(name, description, media_url, muscle_groups)")
    .eq("routine_day_id", dayId).order("position");
  if (error) throw new Error(`No se pudieron consultar los ejercicios: ${error.message}`);
  return data ?? [];
}
export type ExecutionItem = Awaited<ReturnType<typeof executionExercises>>[number];

/**
 * Los ejercicios que pueden sustituir a los de una sesión.
 *
 * Se llama **una vez por sesión**, con los grupos musculares de todos sus
 * ejercicios, no una vez por ejercicio. Antes traía el catálogo entero: 868
 * filas que en el teléfono se convertían en 1.486 `<option>` y 758 KB de
 * descarga a mitad de entrenamiento. Con `overlaps` la base devuelve solo los
 * afines, y el tope de 200 acota el caso de un día que toca medio cuerpo.
 *
 * Sin grupos —un día cuyos ejercicios no están etiquetados, típico de un
 * ejercicio personalizado— cae en el catálogo ordenado por nombre, también
 * acotado: es preferible una lista corta a una pantalla que no carga.
 *
 * Ese tope alfabético, sin embargo, no puede esconder los ejercicios que ya
 * están prescritos ese día: son la sustitución más obvia entre sí y antes
 * quedaban fuera si su nombre caía después del corte. `alwaysInclude` los
 * trae aparte cuando el tope los dejó fuera, sin ampliar el límite general.
 *
 * `muscle_groups` viaja con cada fila para que el formulario pueda acotar
 * todavía más, al grupo del ejercicio concreto que se está registrando.
 */
export async function replacementExercises(
  muscleGroups?: string[],
  alwaysInclude: string[] = [],
  limit = 200,
) {
  const supabase = await createClient();
  const groups = [...new Set(muscleGroups ?? [])];
  let query = supabase.from("exercises").select("id, name, muscle_groups").order("name").limit(limit);
  if (groups.length > 0) query = query.overlaps("muscle_groups", groups);
  const { data, error } = await query;
  if (error) throw new Error(`No se pudo consultar el catálogo: ${error.message}`);
  const result = data ?? [];
  const missing = [...new Set(alwaysInclude)].filter(
    (id) => !result.some((exercise) => exercise.id === id),
  );
  if (missing.length === 0) return result;
  const extra = await supabase.from("exercises").select("id, name, muscle_groups").in("id", missing);
  if (extra.error) throw new Error(`No se pudo consultar el catálogo: ${extra.error.message}`);
  return [...result, ...extra.data].sort((a, b) => a.name.localeCompare(b.name, "es"));
}
export type ReplacementExercise = Awaited<ReturnType<typeof replacementExercises>>[number];
