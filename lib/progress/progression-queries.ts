import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Series, SeriesPoint } from "@/lib/progress/evolution";

/**
 * La carga levantada en cada ejercicio, sesión a sesión.
 *
 * Solo cuentan los registros ejecutados con peso: un ejercicio saltado o uno
 * de peso corporal no dice nada sobre la progresión de carga. La fecha sale de
 * la sesión, no de `created_at`, porque una sesión se puede cerrar al día
 * siguiente y la gráfica es del día en que se entrenó.
 */
export async function getLoadProgression(patientId: string): Promise<Series[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_logs")
    .select(
      `actual_weight,
       sessions!inner (performed_on),
       routine_items!inner (exercise_id, exercises!inner (name))`,
    )
    .eq("patient_id", patientId)
    .eq("status", "done")
    .not("actual_weight", "is", null);
  if (error)
    throw new Error(`No se pudo consultar la progresión: ${error.message}`);

  // Una fila por ejercicio y sesión: se agrupa aquí, en el servidor, para que
  // al navegador le llegue ya una serie por ejercicio y no el registro crudo.
  const porEjercicio = new Map<string, { label: string; points: SeriesPoint[] }>();
  for (const log of data ?? []) {
    const key = log.routine_items.exercise_id;
    const serie = porEjercicio.get(key) ?? {
      label: log.routine_items.exercises.name,
      points: [],
    };
    serie.points.push({
      on: log.sessions.performed_on,
      value: Number(log.actual_weight),
    });
    porEjercicio.set(key, serie);
  }

  return [...porEjercicio]
    .map(([key, { label, points }]) => ({
      key,
      label,
      unit: "kg",
      points: points.sort((a, b) => a.on.localeCompare(b.on)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}
