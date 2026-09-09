import { z } from "zod";
import { createListParams, optionalEnum, pageParam, searchParam } from "@/lib/shared/list-params";
import { serviceCategories } from "@/lib/progress/plan-vocabulary";

/**
 * El estado de la vitrina `/offer`. No pagina: la agrupación por categoría es
 * lo que la ordena, y una vitrina partida en páginas se lee peor.
 */
export const showcaseList = createListParams({
  path: "/offer", pageSize: 200, schema: z.object({
    q: searchParam(),
    category: optionalEnum(serviceCategories),
    page: pageParam,
  }),
});
export type ShowcaseFilters = z.infer<typeof showcaseList.schema>;
