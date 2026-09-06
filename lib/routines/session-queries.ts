import "server-only";
import { createClient } from "@/lib/supabase/server";

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

export async function patientSessions(patientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions")
    .select("id, routine_day_id, performed_on, status, routines(name), routine_days(day_number, title)")
    .eq("patient_id", patientId).order("performed_on", { ascending: false }).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(`No se pudo consultar el historial: ${error.message}`);
  return data ?? [];
}
export async function executionExercises(dayId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("routine_items")
    .select("id, exercise_id, sets, reps, target_weight, rest_seconds, exercises(name, description, media_url)")
    .eq("routine_day_id", dayId).order("position");
  if (error) throw new Error(`No se pudieron consultar los ejercicios: ${error.message}`);
  return data ?? [];
}
export type ExecutionItem = Awaited<ReturnType<typeof executionExercises>>[number];

export async function replacementExercises() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercises").select("id, name").order("name").limit(1000);
  if (error) throw new Error(`No se pudo consultar el catálogo: ${error.message}`);
  return data ?? [];
}
