import { z } from "zod";
import { createListParams, optionalEnum, orderParam, pageParam, searchParam } from "@/lib/shared/list-params";

/** Por nombre (por defecto, el orden de siempre) o por el tamizaje más reciente. */
export const screeningOrders = ["nombre", "reciente"] as const;
export type ScreeningOrder = (typeof screeningOrders)[number];
export const screeningOrderLabels: Record<ScreeningOrder, string> = {
  nombre: "Nombre (A-Z)",
  reciente: "Tamizaje más reciente",
};

/** El estado del listado de seguimiento físico. */
export const screeningList = createListParams({
  path: "/screenings", pageSize: 24, schema: z.object({
    q: searchParam(),
    taken: optionalEnum(["some", "none"] as const),
    orden: orderParam(screeningOrders, "nombre"),
    page: pageParam,
  }),
  notFilters: ["orden"],
});
export type ScreeningFilters = z.infer<typeof screeningList.schema>;
