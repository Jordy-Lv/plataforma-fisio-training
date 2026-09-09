import { z } from "zod";
import { createListParams, optionalEnum, optionalId, pageParam, searchParam } from "@/lib/shared/list-params";

/** La prioridad es el orden del motor; no se admite una ordenación alternativa. */
export const ruleList = createListParams({ path: "/rules", pageSize: 24, schema: z.object({
  q: searchParam(), status: optionalEnum(["active", "inactive"] as const),
  state: optionalEnum(["broken"] as const), template: optionalId, page: pageParam,
}) });
export type RuleFilters = z.infer<typeof ruleList.schema>;
