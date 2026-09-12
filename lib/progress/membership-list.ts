import { z } from "zod";
import { createListParams, optionalEnum, optionalId, orderParam, pageParam, searchParam } from "@/lib/shared/list-params";
import { membershipStatuses } from "@/lib/progress/membership-vocabulary";

/**
 * `vencimiento` (por defecto) es el orden de siempre. Ninguno de los dos
 * mueve una membresía de sección: solo cambia el orden **dentro** de
 * «Próximas a vencer», «Vencidas» y «Resto», que siguen siendo contrato.
 */
export const membershipOrders = ["vencimiento", "nombre"] as const;
export type MembershipOrder = (typeof membershipOrders)[number];
export const membershipOrderLabels: Record<MembershipOrder, string> = {
  vencimiento: "Vencimiento",
  nombre: "Nombre del paciente (A-Z)",
};

/**
 * El estado del listado de membresías. Sin filtros la pantalla conserva sus
 * tres secciones —«Próximas a vencer», «Vencidas» y el resto—, que son
 * contrato de `test:memberships`.
 */
export const membershipList = createListParams({
  path: "/memberships", pageSize: 24, schema: z.object({
    q: searchParam(),
    status: optionalEnum(membershipStatuses),
    plan: optionalId,
    orden: orderParam(membershipOrders, "vencimiento"),
    page: pageParam,
  }),
  notFilters: ["orden"],
});
export type MembershipFilters = z.infer<typeof membershipList.schema>;
