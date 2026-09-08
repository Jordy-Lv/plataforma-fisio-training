import { z } from "zod";
import { createListParams, optionalEnum, pageParam, searchParam } from "@/lib/shared/list-params";

/** El estado del listado de seguimiento físico. */
export const screeningList = createListParams({
  path: "/screenings", pageSize: 24, schema: z.object({
    q: searchParam(),
    taken: optionalEnum(["some", "none"] as const),
    page: pageParam,
  }),
});
export type ScreeningFilters = z.infer<typeof screeningList.schema>;
