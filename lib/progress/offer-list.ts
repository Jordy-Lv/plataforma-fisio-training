import { z } from "zod";
import { createListParams, optionalEnum, pageParam, searchParam } from "@/lib/shared/list-params";
export const offerList = createListParams({ path: "/plans", pageSize: 24, schema: z.object({
  q: searchParam(), status: optionalEnum(["active", "inactive"] as const), page: pageParam,
}) });
export type OfferFilters = z.infer<typeof offerList.schema>;
