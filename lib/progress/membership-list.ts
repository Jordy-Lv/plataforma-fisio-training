import { z } from "zod";
import { createListParams, optionalEnum, optionalId, pageParam, searchParam } from "@/lib/shared/list-params";
import { membershipStatuses } from "@/lib/progress/membership-vocabulary";

/**
 * El estado del listado de membresías. Sin filtros la pantalla conserva sus
 * tres secciones —«Próximas a vencer», «Vencidas» y el resto—, que son
 * contrato de `test:memberships`.
 */
export const membershipList = createListParams({
  path: "/memberships", pageSize: 60, schema: z.object({
    q: searchParam(),
    status: optionalEnum(membershipStatuses),
    plan: optionalId,
    page: pageParam,
  }),
});
export type MembershipFilters = z.infer<typeof membershipList.schema>;
