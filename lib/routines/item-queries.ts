import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * La rutina del paciente tal como la necesita el profesional para ajustarla.
 *
 * Va aparte de `patientRoutines` porque el editor pide columnas que la vista
 * de consulta no muestra —`was_modified`, `exercise_id` y las
 * contraindicaciones del ejercicio— y no tiene sentido cargarlas cada vez que
 * el paciente abre su rutina en el teléfono.
 */
export async function editableRoutines(patientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select(
      `id, name, kind, status, notes,
        routine_days(id, day_number, title,
          routine_items(id, position, sets, reps, target_weight, rest_seconds,
            notes, was_modified,
            exercises(id, name, contraindications)))`,
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error)
    throw new Error(`No se pudieron consultar las rutinas: ${error.message}`);

  return (data ?? []).map((routine) => ({
    ...routine,
    routine_days: routine.routine_days
      .sort((a, b) => a.day_number - b.day_number)
      .map((day) => ({
        ...day,
        routine_items: day.routine_items.sort(
          (a, b) => a.position - b.position,
        ),
      })),
  }));
}

export type EditableRoutine = Awaited<
  ReturnType<typeof editableRoutines>
>[number];

export type EditableRoutineDay = EditableRoutine["routine_days"][number];

export type EditableRoutineItem =
  EditableRoutineDay["routine_items"][number];

/**
 * Las zonas del cuerpo que el paciente declaró y siguen vigentes. Se usan para
 * advertir al profesional cuando el ejercicio que va a añadir está
 * contraindicado; la decisión sigue siendo suya, no se le bloquea.
 */
export async function activeConditions(patientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_conditions")
    .select("body_part")
    .eq("patient_id", patientId)
    .eq("is_active", true);

  if (error)
    throw new Error(
      `No se pudieron consultar las condiciones del paciente: ${error.message}`,
    );

  return [...new Set((data ?? []).map((condition) => condition.body_part))];
}
