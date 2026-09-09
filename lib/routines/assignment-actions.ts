"use server";

import { revalidatePath } from "next/cache";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { assignmentSchema, prepareAssignment, type AssignmentState } from "@/lib/routines/assignment";

/**
 * Los mensajes que escribe la base ya están en español y dicen qué hacer, así
 * que se muestran tal cual. Cualquier otro error es técnico y se enmarca.
 */
const propios = new Set(["22023", "42501"]);
const mensaje = (error: { code?: string; message: string }, marco: string) =>
  error.code && propios.has(error.code) ? error.message : `${marco}: ${error.message}`;

export async function assignRoutine(_previous: AssignmentState, form: FormData): Promise<AssignmentState> {
  const parsed = assignmentSchema.safeParse({ patientId: form.get("patientId") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const actor = await getActiveProfile();
  if (!actor || actor.role === "patient") return { error: "No tienes permiso para asignar rutinas." };
  const supabase = await createClient();
  const { patientId } = parsed.data;
  const context = await supabase.rpc("routine_assignment_context", { target_patient: patientId });
  if (context.error) return { error: mensaje(context.error, "No se pudo evaluar la asignación") };
  let decision;
  try { decision = prepareAssignment(context.data); }
  catch (error) { return { error: error instanceof Error ? error.message : "No se pudo evaluar la asignación." }; }
  const result = await supabase.rpc("commit_routine_assignment", {
    target_patient: patientId,
    expected_context: context.data,
    ...(decision.selectedRule ? { selected_rule: decision.selectedRule } : {}),
    excluded_exercises: decision.excludedExercises,
    assignment_notes: decision.notes,
  });
  if (result.error) return { error: mensaje(result.error, "No se pudo asignar la rutina") };
  revalidatePath(`/pro/routines/${patientId}`);
  revalidatePath(`/pro/routines/${patientId}/calendar`);
  revalidatePath("/routine");
  revalidatePath("/routine/calendar");
  const outcome = (result.data as { outcome: string }).outcome;
  return { success: outcome === "assigned" ? "Rutina asignada. El paciente ya puede consultarla."
    : outcome === "pending_review" ? "Propuesta guardada para revisión: hay días con menos de tres ejercicios. Se avisó al equipo y se conservó la rutina anterior."
    : "No hay una regla compatible. Se avisó al equipo para preparar la rutina del paciente." };
}
