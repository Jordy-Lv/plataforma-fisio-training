import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import type { ExerciseFilters } from "@/lib/catalog/schemas";

/** Suficiente para desplazarse en el teléfono sin descargar 868 tarjetas. */
export const pageSize = 24;

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

export type ExerciseListItem = Pick<
  ExerciseRow,
  | "id"
  | "name"
  | "media_url"
  | "muscle_groups"
  | "equipment"
  | "environments"
  | "difficulty"
  | "is_custom"
>;

/** Columnas del listado. Sin `description`: son 868 filas y no se muestra aquí. */
const columns =
  "id, name, media_url, muscle_groups, equipment, environments, difficulty, is_custom";

/**
 * PostgREST no admite `escape` en `ilike` y trata la coma y los paréntesis como
 * separadores del propio filtro, así que los caracteres que cambiarían el
 * significado de la consulta se retiran en lugar de escaparse.
 */
function sanitizeSearch(term: string) {
  return term.replace(/[%_,()."\\*]/g, " ").replace(/\s+/g, " ").trim();
}

export async function listExercises(filters: ExerciseFilters) {
  const supabase = await createClient();
  const from = (filters.page - 1) * pageSize;

  let query = supabase
    .from("exercises")
    .select(columns, { count: "exact" })
    .order("name")
    .range(from, from + pageSize - 1);

  const term = filters.q ? sanitizeSearch(filters.q) : "";
  if (term) query = query.ilike("name", `%${term}%`);
  if (filters.muscle) query = query.contains("muscle_groups", [filters.muscle]);
  if (filters.equipment) query = query.contains("equipment", [filters.equipment]);
  if (filters.environment)
    query = query.contains("environments", [filters.environment]);

  const { data, error, count } = await query;
  if (error)
    throw new Error(`No se pudo consultar el catálogo: ${error.message}`);

  return {
    exercises: data ?? [],
    total: count ?? 0,
    pages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

export type ExerciseDetail = Pick<
  ExerciseRow,
  | "id"
  | "name"
  | "description"
  | "media_url"
  | "muscle_groups"
  | "equipment"
  | "environments"
  | "difficulty"
  | "contraindications"
  | "is_custom"
  | "created_by"
>;

/** La ficha completa. Devuelve `null` si no existe o si RLS no lo deja ver. */
export async function getExercise(id: string): Promise<ExerciseDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select(
      "id, name, description, media_url, muscle_groups, equipment, environments, difficulty, contraindications, is_custom, created_by",
    )
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new Error(`No se pudo consultar el ejercicio: ${error.message}`);
  return data;
}
