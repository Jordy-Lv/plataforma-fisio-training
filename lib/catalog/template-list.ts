import { z } from "zod";
import { createListParams, optionalEnum, pageParam, searchParam } from "@/lib/shared/list-params";
import { environments, goals, templateKinds } from "@/lib/catalog/vocabulary";

export const templateList = createListParams({
  path: "/templates", pageSize: 24,
  schema: z.object({
    q: searchParam(), kind: optionalEnum(templateKinds), goal: optionalEnum(goals),
    level: optionalEnum(["beginner", "intermediate", "advanced"] as const),
    environment: optionalEnum(environments), status: optionalEnum(["active", "draft"] as const),
    incomplete: z.literal("1").optional().catch(undefined).transform((v) => v === "1" ? true : undefined),
    page: pageParam,
  }),
});
export type TemplateFilters = z.infer<typeof templateList.schema>;
