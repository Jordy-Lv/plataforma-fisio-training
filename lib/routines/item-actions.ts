"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  addRoutineItemFormValues,
  addRoutineItemSchema,
  replaceRoutineItemFormValues,
  replaceRoutineItemSchema,
  routineItemIdFormValues,
  routineItemIdSchema,
  updateRoutineItemFormValues,
  updateRoutineItemSchema,
  type RoutineItemState,
} from "@/lib/routines/item-schemas";

const sinPermiso =
  "Solo el profesional con asignación vigente sobre este paciente puede ajustar su rutina.";

/**
 * El ajuste lo hacen `admin` y `professional`. RLS es la autorización real
 * —`can_write_routine` sobre la fila—, pero una server action es una URL
 * pública: se comprueba aquí también para responder algo legible en vez de un
 * error de base de datos. El paciente ejecuta la rutina, no la define.
 */
async function isStaff() {
  const profile = await getActiveProfile();
  return profile !== null && profile.role !== "patient";
}

/**
 * Rutas que hay que refrescar tras escribir. El identificador viaja en el
 * formulario porque solo decide qué caché se invalida: la autorización la hace
 * RLS sobre la fila que se toca, no este valor.
 */
function revalidateRoutine(form: FormData) {
  revalidatePath("/routine");
  const patientId = z.string().uuid().safeParse(form.get("patientId"));
  if (patientId.success) revalidatePath(`/pro/routines/${patientId.data}`);
}

export async function updateRoutineItem(
  _previous: RoutineItemState,
  form: FormData,
): Promise<RoutineItemState> {
  const parsed = updateRoutineItemSchema.safeParse(
    updateRoutineItemFormValues(form),
  );
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isStaff())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_items")
    .update({
      sets: values.sets,
      reps: values.reps,
      target_weight: values.targetWeight,
      rest_seconds: values.restSeconds,
      notes: values.notes,
      // La rutina deja de ser la copia literal de la plantilla. Se marca
      // siempre que se guarda: el profesional puede estar reponiendo el valor
      // original y aun así ha revisado ese ejercicio a mano.
      was_modified: true,
    })
    .eq("id", values.id)
    .select("id")
    .maybeSingle();

  if (error)
    return { error: `No se pudo guardar el ejercicio: ${error.message}` };
  // Sin fila devuelta el `update` no encontró nada que le dejaran tocar: RLS
  // no lanza error, simplemente no afecta a ninguna fila.
  if (!data) return { error: sinPermiso };

  revalidateRoutine(form);
  return { success: "Ejercicio ajustado para este paciente." };
}

export async function deleteRoutineItem(
  _previous: RoutineItemState,
  form: FormData,
): Promise<RoutineItemState> {
  const parsed = routineItemIdSchema.safeParse(routineItemIdFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isStaff())) return { error: sinPermiso };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_items")
    .delete()
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  // 23503: el paciente ya lo ejecutó alguna vez y `session_logs` lo referencia.
  // Borrarlo se lleva por delante lo que esa persona registró —series, peso,
  // dolor—, que es justo lo que el negocio necesita conservar, así que la base
  // lo impide. Sustituirlo hace el trabajo sin perder nada.
  if (error?.code === "23503")
    return {
      error:
        "No se puede quitar: el paciente ya ejecutó este ejercicio y se perdería su historial. Sustitúyelo por otro; el registro de lo que ya hizo se conserva.",
    };
  if (error)
    return { error: `No se pudo quitar el ejercicio: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateRoutine(form);
  return {
    success: "Ejercicio quitado de la rutina. La plantilla de origen no cambia.",
  };
}

export async function addRoutineItem(
  _previous: RoutineItemState,
  form: FormData,
): Promise<RoutineItemState> {
  const parsed = addRoutineItemSchema.safeParse(addRoutineItemFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isStaff())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();

  // El nuevo ejercicio se coloca al final del día; la prescripción se rellena
  // después, en su propia fila. Las posiciones solo fijan el orden relativo:
  // al quitar un ejercicio no se renumeran las demás.
  const { data: ultima, error: lecturaError } = await supabase
    .from("routine_items")
    .select("position")
    .eq("routine_day_id", values.dayId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lecturaError)
    return {
      error: `No se pudieron leer los ejercicios del día: ${lecturaError.message}`,
    };

  const { data, error } = await supabase
    .from("routine_items")
    .insert({
      routine_day_id: values.dayId,
      exercise_id: values.exerciseId,
      position: (ultima?.position ?? 0) + 1,
      // No venía de la plantilla: es una decisión del profesional.
      was_modified: true,
    })
    .select("id")
    .maybeSingle();

  // 23505: otra persona añadió un ejercicio en la misma posición mientras
  // tanto. Reintentarlo lo coloca detrás del suyo.
  if (error?.code === "23505")
    return {
      error:
        "Alguien añadió un ejercicio a este día al mismo tiempo. Vuelve a intentarlo.",
    };
  if (error)
    return { error: `No se pudo añadir el ejercicio: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateRoutine(form);
  return {
    success: "Ejercicio añadido al final del día. Indícale ahora sus series.",
  };
}

/**
 * Sustituye el ejercicio conservando su sitio y su prescripción: el paciente
 * hace el mismo trabajo con otro movimiento, no una rutina distinta.
 */
export async function replaceRoutineItem(
  _previous: RoutineItemState,
  form: FormData,
): Promise<RoutineItemState> {
  const parsed = replaceRoutineItemSchema.safeParse(
    replaceRoutineItemFormValues(form),
  );
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isStaff())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_items")
    .update({ exercise_id: values.exerciseId, was_modified: true })
    .eq("id", values.id)
    .select("id")
    .maybeSingle();

  if (error)
    return { error: `No se pudo sustituir el ejercicio: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateRoutine(form);
  return {
    success: "Ejercicio sustituido. Conserva su posición y su prescripción.",
  };
}
