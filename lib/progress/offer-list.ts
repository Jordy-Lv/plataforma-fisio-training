import { z } from "zod";
import { createListParams, optionalEnum, pageParam, searchParam } from "@/lib/shared/list-params";

/**
 * `/plans` es la única pantalla del personal con **dos** colecciones que crecen
 * sin relación entre sí: los planes de suscripción y los servicios sueltos.
 * Por eso pagina con dos claves —`page` para los planes, `spage` para los
 * servicios—: pasar de página en una no puede mover a la otra de sitio.
 *
 * Doce por lista y no veinticuatro: las dos se ven en la misma pantalla, y con
 * la edición de cada tarjeta plegada caben seis filas de dos columnas.
 */
export const offerList = createListParams({ path: "/plans", pageSize: 12, notFilters: ["spage"], schema: z.object({
  q: searchParam(), status: optionalEnum(["active", "inactive"] as const), page: pageParam, spage: pageParam,
}) });
export type OfferFilters = z.infer<typeof offerList.schema>;
