import { z } from "zod";
import { createListParams, optionalEnum, pageParam, searchParam } from "@/lib/shared/list-params";

/** El estado del listado de pacientes de `/pro/routines`. */
export const routineList = createListParams({
  path: "/pro/routines", pageSize: 24, schema: z.object({
    q: searchParam(),
    state: optionalEnum(["active", "inactive"] as const),
    routine: optionalEnum(["with", "without"] as const),
    page: pageParam,
  }),
});
export type RoutineListFilters = z.infer<typeof routineList.schema>;
