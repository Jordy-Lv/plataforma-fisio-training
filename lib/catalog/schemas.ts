import { z } from "zod";
import {
  equipment,
  environments,
  muscleGroups,
} from "@/lib/catalog/vocabulary";

/**
 * Filtros del listado del catálogo, tal como llegan en la URL.
 *
 * Cada campo usa `catch`: la URL la escribe cualquiera —un enlace viejo, un
 * filtro que dejó de existir— y un valor inválido no debe tumbar la pantalla.
 * Se ignora ese filtro y se muestra el catálogo sin él. Esto vale solo para
 * lectura; al escribir el catálogo un valor inválido sí se rechaza.
 */
export const exerciseFiltersSchema = z.object({
  q: z
    .string()
    .max(80)
    .catch("")
    .transform((value) => value.trim() || undefined),
  muscle: z.enum(muscleGroups).optional().catch(undefined),
  equipment: z.enum(equipment).optional().catch(undefined),
  environment: z.enum(environments).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});

export type ExerciseFilters = z.infer<typeof exerciseFiltersSchema>;

/** Construye la URL del listado conservando los filtros vigentes. */
export function exercisesHref(
  filters: ExerciseFilters,
  overrides: Partial<ExerciseFilters> = {},
) {
  const { q, muscle, equipment, environment, page } = {
    ...filters,
    ...overrides,
  };
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (muscle) params.set("muscle", muscle);
  if (equipment) params.set("equipment", equipment);
  if (environment) params.set("environment", environment);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/exercises?${query}` : "/exercises";
}

/** Hay al menos un filtro activo (la página no cuenta). */
export function hasActiveFilters(filters: ExerciseFilters) {
  return Boolean(
    filters.q || filters.muscle || filters.equipment || filters.environment,
  );
}
