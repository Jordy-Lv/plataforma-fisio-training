import type { ExerciseFilters } from "@/lib/catalog/schemas";
import {
  equipmentLabels,
  environmentLabels,
  muscleGroupLabels,
} from "@/lib/catalog/vocabulary";

/**
 * El buscador de catálogo embebido en `/templates/[id]` y en
 * `/pro/routines/[patientId]`. No usa `createListParams` porque su ruta cambia
 * por pantalla —lleva el id de la plantilla o del paciente— y porque comparte
 * la URL con `dia`/`item`, que son estado de la pantalla, no del buscador: hay
 * que arrastrarlos en cada enlace.
 *
 * `dia` y `item` son contrato: `scripts/verify-routine-items.test.mjs` abre
 * literalmente `?dia=<dayId>&q=<texto>` y `?item=<itemId>&q=<texto>` y espera
 * ahí el formulario de añadir o de sustituir (ver `docs/11`).
 */

/** Cuántos ejercicios por página: los que caben sin sepultar el resto de la pantalla. */
export const embeddedCatalogPageSize = 6;

type Extra = Record<string, string | undefined>;

/**
 * La URL del buscador conservando los parámetros de la pantalla (`dia`, `item`)
 * y omitiendo lo que está en su valor de partida (`page=1`, filtros vacíos).
 */
export function catalogHref(
  base: string,
  extra: Extra,
  filters: Partial<ExerciseFilters>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  if (filters.q) params.set("q", filters.q);
  if (filters.muscle) params.set("muscle", filters.muscle);
  if (filters.equipment) params.set("equipment", filters.equipment);
  if (filters.environment) params.set("environment", filters.environment);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/** ¿Hay algún filtro puesto? La página no cuenta. */
export const catalogFiltered = (filters: ExerciseFilters): boolean =>
  Boolean(
    filters.q || filters.muscle || filters.equipment || filters.environment,
  );

/** Las píldoras de filtro activo, cada una enlazada al buscador sin ese filtro. */
export function catalogChips(
  base: string,
  extra: Extra,
  filters: ExerciseFilters,
): { label: string; href: string; removeLabel: string }[] {
  const chips: { label: string; href: string; removeLabel: string }[] = [];
  if (filters.q)
    chips.push({
      label: filters.q,
      href: catalogHref(base, extra, { ...filters, q: undefined, page: 1 }),
      removeLabel: "Quitar búsqueda",
    });
  if (filters.muscle)
    chips.push({
      label: muscleGroupLabels[filters.muscle],
      href: catalogHref(base, extra, { ...filters, muscle: undefined, page: 1 }),
      removeLabel: "Quitar grupo muscular",
    });
  if (filters.equipment)
    chips.push({
      label: equipmentLabels[filters.equipment],
      href: catalogHref(base, extra, {
        ...filters,
        equipment: undefined,
        page: 1,
      }),
      removeLabel: "Quitar equipamiento",
    });
  if (filters.environment)
    chips.push({
      label: environmentLabels[filters.environment],
      href: catalogHref(base, extra, {
        ...filters,
        environment: undefined,
        page: 1,
      }),
      removeLabel: "Quitar entorno",
    });
  return chips;
}
