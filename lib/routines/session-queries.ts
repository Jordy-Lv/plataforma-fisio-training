import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sessionList, type SessionListFilters } from "@/lib/routines/session-list";

export async function sessionDetails(sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").select(`id, patient_id, routine_id, routine_day_id,
    performed_on, status, completed_at, routines(name), routine_days(title, day_number),
    session_logs(id, routine_item_id, status, actual_sets, actual_reps, actual_weight, prescribed_sets,
      prescribed_reps, prescribed_weight, perceived_effort, pain_level, pain_location, notes,
      replaced_by_exercise_id, exercises!session_logs_exercise_id_fkey(name, description, media_url),
      replacement:exercises!session_logs_replaced_by_exercise_id_fkey(name))`).eq("id", sessionId).maybeSingle();
  if (error) throw new Error(`No se pudo consultar la sesión: ${error.message}`);
  return data;
}
export type SessionDetails = NonNullable<Awaited<ReturnType<typeof sessionDetails>>>;
export type SessionLog = SessionDetails["session_logs"][number];

/**
 * El historial de sesiones de un paciente, de la más reciente a la más
 * antigua. Antes se recortaba con un `.limit(50)` fijo que no avisaba de nada:
 * ahora la página y el rango de fechas viajan en la URL y el total sale de la
 * base, así que se sabe cuántas hay.
 */
export async function patientSessions(patientId: string, filters: SessionListFilters = sessionList.empty) {
  const supabase = await createClient();
  const { from, to } = sessionList.range(filters);
  let query = supabase.from("sessions")
    .select("id, routine_day_id, performed_on, status, routines(name), routine_days(day_number, title)", { count: "exact" })
    .eq("patient_id", patientId).order("performed_on", { ascending: false }).order("created_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("performed_on", filters.from);
  if (filters.to) query = query.lte("performed_on", filters.to);
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(`No se pudo consultar el historial: ${error.message}`);
  return { sessions: data ?? [], total: count ?? 0, pages: sessionList.pages(count ?? 0) };
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

export async function replacementExercises() {
  const supabase = await createClient();
  // `muscle_groups` viaja para acotar en el cliente el selector de sustitución
  // a ejercicios afines: en móvil, a mitad de sesión, una lista de ~868
  // opciones sin filtrar es inusable.
  const { data, error } = await supabase.from("exercises").select("id, name, muscle_groups").order("name").limit(1000);
  if (error) throw new Error(`No se pudo consultar el catálogo: ${error.message}`);
  return data ?? [];
}
export type ReplacementExercise = Awaited<ReturnType<typeof replacementExercises>>[number];
