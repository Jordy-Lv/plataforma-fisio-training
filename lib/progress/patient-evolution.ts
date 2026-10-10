import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Cuántos tamizajes recientes dibuja la tendencia de la portada. */
const TREND_LIMIT = 6;

export type EvolutionPoint = {
  takenOn: string;
  weightKg: number | null;
  bmi: number | null;
};

/**
 * Los últimos tamizajes del paciente, del más antiguo al más reciente, para la
 * tarjeta «Tu evolución» de su portada: el peso y el IMC de hoy, cuánto cambió
 * desde el anterior y una línea con la tendencia.
 *
 * Solo las tres columnas que se pintan; el historial completo sigue en la
 * pantalla de evolución del equipo. RLS deja al paciente leer sus tamizajes,
 * no registrarlos.
 */
export async function patientEvolution(patientId: string): Promise<EvolutionPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("screenings")
    .select("taken_on, weight_kg, bmi")
    .eq("patient_id", patientId)
    .order("taken_on", { ascending: false })
    .limit(TREND_LIMIT);
  if (error)
    throw new Error(`No se pudo consultar tu evolución: ${error.message}`);

  return data
    .map((row) => ({
      takenOn: row.taken_on,
      weightKg: row.weight_kg,
      bmi: row.bmi,
    }))
    .reverse();
}
