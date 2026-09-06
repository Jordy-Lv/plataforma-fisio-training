"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startSessionSchema, closeSessionSchema, sessionLogSchema, type RoutineActionState } from "@/lib/routines/schemas";

export async function startSession(_previous: RoutineActionState, form: FormData): Promise<RoutineActionState> {
  const parsed = startSessionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_routine_session", { target_day: parsed.data.dayId });
  if (error) return { error: `No se pudo iniciar: ${error.message}` };
  revalidatePath("/routine");
  redirect(`/routine/sessions/${data}`);
}

export async function logSessionItem(_previous: RoutineActionState, form: FormData): Promise<RoutineActionState> {
  const parsed = sessionLogSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { error: "Vuelve a iniciar sesión para guardar." };
  const value = parsed.data;
  const item = await supabase.from("routine_items").select("exercise_id").eq("id", value.itemId).maybeSingle();
  if (item.error || !item.data) return { error: "No se pudo consultar el ejercicio de tu rutina." };
  const { error } = await supabase.from("session_logs").upsert({
    session_id: value.sessionId, routine_item_id: value.itemId, patient_id: auth.user.id,
    status: value.status, actual_sets: value.actualSets, actual_reps: value.actualReps,
    actual_weight: value.actualWeight, perceived_effort: value.perceivedEffort,
    pain_level: value.painLevel, pain_location: value.painLocation, notes: value.notes || null,
    replaced_by_exercise_id: value.replacedByExerciseId,
    exercise_id: item.data.exercise_id,
  }, { onConflict: "session_id,routine_item_id" });
  if (error) return { error: `No se pudo guardar el ejercicio: ${error.message}` };
  revalidatePath(`/routine/sessions/${value.sessionId}`);
  revalidatePath("/pro/routines", "layout");
  return { success: "Registro guardado. Puedes continuar o cerrar la aplicación." };
}

export async function closeSession(_previous: RoutineActionState, form: FormData): Promise<RoutineActionState> {
  const parsed = closeSessionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").update({ status: "completed" })
    .eq("id", parsed.data.sessionId).eq("status", "in_progress").select("id").maybeSingle();
  if (error) return { error: `No se pudo cerrar la sesión: ${error.message}` };
  if (!data) return { error: "La sesión ya está cerrada o no tienes acceso." };
  revalidatePath("/routine");
  revalidatePath(`/routine/sessions/${parsed.data.sessionId}`);
  revalidatePath("/pro/routines", "layout");
  revalidatePath("/pro/alerts");
  return { success: "Sesión completada. Tu profesional ya puede consultarla." };
}
