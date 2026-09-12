import { z } from "zod";
import { equipment, environments, muscleGroups } from "@/lib/catalog/vocabulary";
import { createListParams, optionalEnum, orderParam, pageParam, searchParam } from "@/lib/shared/list-params";

/**
 * Cómo se pinta cada resultado. `tarjetas` es la vista de siempre —imagen 4:3 y
 * ficha— y sigue siendo la de partida, entre otras cosas porque
 * `scripts/verify-catalog-list.test.mjs` da por hecho 24 tarjetas en la primera
 * página sin parámetros.
 *
 * `lista` existe porque la de tarjetas se midió: 429 px por ejercicio, de los
 * cuales 254 son la foto, y 24 de ellas son cinco pantallas de portátil
 * (`docs/12-medicion-de-densidad.md`). Cuando se busca un ejercicio por su
 * nombre la foto no ayuda, así que la fila la reduce a una miniatura.
 */
export const exerciseViews = ["tarjetas", "lista"] as const;
export type ExerciseView = (typeof exerciseViews)[number];

/** Nombre alfabético (por defecto, el orden de siempre) o fecha de alta. */
export const exerciseOrders = ["nombre", "recientes"] as const;
export type ExerciseOrder = (typeof exerciseOrders)[number];
export const exerciseOrderLabels: Record<ExerciseOrder, string> = {
  nombre: "Nombre (A-Z)",
  recientes: "Más recientes",
};

export const exerciseFiltersSchema = z.object({
  q: searchParam(),
  muscle: optionalEnum(muscleGroups),
  equipment: optionalEnum(equipment),
  environment: optionalEnum(environments),
  vista: z.enum(exerciseViews).catch("tarjetas").default("tarjetas"),
  orden: orderParam(exerciseOrders, "nombre"),
  page: pageParam,
});
export type ExerciseFilters = z.infer<typeof exerciseFiltersSchema>;

/**
 * `pageSize` es el de la vista de tarjetas. La de lista cabe al triple, así que
 * pide su propio tamaño con `pageSizeFor`: paginar de 24 en 24 una lista que
 * ocupa un tercio obligaría a pasar página tres veces más de la cuenta.
 */
export const exerciseList = createListParams({
  path: "/exercises",
  schema: exerciseFiltersSchema,
  pageSize: 24,
  notFilters: ["vista", "orden"],
});

export const pageSizeFor = (vista: ExerciseView) => (vista === "lista" ? 60 : exerciseList.pageSize);

export const exercisesHref = exerciseList.href;
export const hasActiveFilters = exerciseList.hasActiveFilters;
