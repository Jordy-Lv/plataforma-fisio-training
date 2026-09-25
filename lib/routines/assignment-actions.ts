"use server";

import { revalidatePath } from "next/cache";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  chooseTemplateSchema,
  routineDraftSchema,
  type RoutineActionState,
} from "@/lib/routines/schemas";

/**
 * Los mensajes que escribe la base ya están en español y dicen qué hacer, así
 * que se muestran tal cual. Cualquier otro error es técnico y se enmarca.
 */
const propios = new Set(["22023", "42501"]);
const mensaje = (error: { code?: string; message: string }, marco: string) =>
  error.code && propios.has(error.code) ? error.message : `${marco}: ${error.message}`;

/** Lo que cambia al crear, descartar o confirmar un borrador. */
function revalidar(patientId: string) {
  revalidatePath(`/pro/routines/${patientId}`);
  revalidatePath(`/pro/routines/${patientId}/calendar`);
  revalidatePath("/pro/routines");
  revalidatePath("/routine");
  revalidatePath("/routine/calendar");
}

/**
 * Elegir una plantilla crea el borrador (ADR-0009). El `patientId` llega ligado
 * con `.bind` desde la página, no como campo del formulario: así el primer
 * `<form>` con `name="patientId"` sigue siendo el de confirmar (`docs/11`).
 */
export async function createRoutineDraft(
  patientId: string,
  _previous: RoutineActionState,
  form: FormData,
): Promise<RoutineActionState> {
  const parsed = chooseTemplateSchema.safeParse({ patientId, templateId: form.get("templateId") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, at: Date.now() };
  const actor = await getActiveProfile();
  if (!actor || actor.role === "patient") return { error: "No tienes permiso para preparar rutinas.", at: Date.now() };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_routine_draft", {
    target_patient: parsed.data.patientId,
    template_id: parsed.data.templateId,
  });
  if (error) return { error: mensaje(error, "No se pudo crear el borrador"), at: Date.now() };
  revalidar(parsed.data.patientId);
  return { success: "Borrador creado. El paciente no lo verá hasta que lo confirmes.", at: Date.now() };
}

/** Descartar archiva el borrador; la rutina activa, si la hay, no cambia. */
export async function discardRoutineDraft(
  patientId: string,
  _previous: RoutineActionState,
  form: FormData,
): Promise<RoutineActionState> {
  const parsed = routineDraftSchema.safeParse({ patientId, routineId: form.get("routineId") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, at: Date.now() };
  const actor = await getActiveProfile();
  if (!actor || actor.role === "patient") return { error: "No tienes permiso para descartar rutinas.", at: Date.now() };
  const supabase = await createClient();
  const { error } = await supabase.rpc("discard_routine_draft", {
    target_routine: parsed.data.routineId,
  });
  if (error) return { error: mensaje(error, "No se pudo descartar el borrador"), at: Date.now() };
  revalidar(parsed.data.patientId);
  return { success: "Borrador descartado. Elige otra plantilla cuando quieras.", at: Date.now() };
}

/** Confirmar publica el borrador: desde aquí el paciente ya ve su rutina. */
export async function confirmRoutineDraft(
  _previous: RoutineActionState,
  form: FormData,
): Promise<RoutineActionState> {
  const parsed = routineDraftSchema.safeParse({
    patientId: form.get("patientId"),
    routineId: form.get("routineId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, at: Date.now() };
  const actor = await getActiveProfile();
  if (!actor || actor.role === "patient") return { error: "No tienes permiso para asignar rutinas.", at: Date.now() };
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_routine_draft", {
    target_routine: parsed.data.routineId,
  });
  if (error) return { error: mensaje(error, "No se pudo asignar la rutina"), at: Date.now() };
  revalidar(parsed.data.patientId);
  return { success: "Rutina asignada. El paciente ya puede consultarla.", at: Date.now() };
}
