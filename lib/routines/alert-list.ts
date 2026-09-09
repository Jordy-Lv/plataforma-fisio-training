import { z } from "zod";
import {
  createListParams,
  optionalEnum,
  optionalId,
  pageParam,
} from "@/lib/shared/list-params";
import { Constants } from "@/lib/db/types";

/**
 * El estado del listado de alertas. Todos los filtros nacen en «todas»: la
 * suite `test:routines:sessions` abre `/pro/alerts` sin parámetros y espera
 * encontrar ahí la alerta recién creada (`docs/11`, §3).
 */
export const alertList = createListParams({
  path: "/pro/alerts",
  pageSize: 20,
  schema: z.object({
    read: optionalEnum(["unread", "read"] as const),
    type: optionalEnum(Constants.public.Enums.alert_type),
    severity: optionalEnum(Constants.public.Enums.alert_severity),
    patient: optionalId,
    page: pageParam,
  }),
});

export type AlertFilters = z.infer<typeof alertList.schema>;
