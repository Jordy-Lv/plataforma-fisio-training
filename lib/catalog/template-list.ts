import { z } from "zod";
import { createListParams, optionalEnum, orderParam, pageParam, searchParam } from "@/lib/shared/list-params";
import { environments, goals, templateKinds } from "@/lib/catalog/vocabulary";

/** `tipo` (por defecto) agrupa por especialidad, como hacía el listado antes de tener orden. */
export const templateOrders = ["tipo", "nombre", "recientes"] as const;
export type TemplateOrder = (typeof templateOrders)[number];
export const templateOrderLabels: Record<TemplateOrder, string> = {
  tipo: "Tipo y nombre",
  nombre: "Nombre (A-Z)",
  recientes: "Más recientes",
};

export const templateList = createListParams({
  path: "/templates", pageSize: 24,
  schema: z.object({
    q: searchParam(), kind: optionalEnum(templateKinds), goal: optionalEnum(goals),
    level: optionalEnum(["beginner", "intermediate", "advanced"] as const),
    environment: optionalEnum(environments), status: optionalEnum(["active", "draft"] as const),
    incomplete: z.literal("1").optional().catch(undefined).transform((v) => v === "1" ? true : undefined),
    orden: orderParam(templateOrders, "tipo"),
    page: pageParam,
  }),
  notFilters: ["orden"],
});
export type TemplateFilters = z.infer<typeof templateList.schema>;
