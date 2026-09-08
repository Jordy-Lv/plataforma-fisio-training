import { z } from "zod";
import { createListParams, optionalEnum, optionalId, pageParam } from "@/lib/shared/list-params";
import { Constants } from "@/lib/db/types";

/** Una fecha del calendario, `YYYY-MM-DD`. Cualquier otra cosa se ignora. */
const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined);

/**
 * El estado del historial de sesiones de `/pro/sessions`. `patient` ya viajaba
 * en la URL antes de este listado y conserva su nombre.
 */
export const sessionList = createListParams({
  path: "/pro/sessions", pageSize: 20, schema: z.object({
    patient: optionalId,
    status: optionalEnum(Constants.public.Enums.session_status),
    from: dateParam,
    to: dateParam,
    page: pageParam,
  }),
  // El paciente elegido no es un filtro del listado: es de qué listado se trata.
  notFilters: ["patient"],
});
export type SessionListFilters = z.infer<typeof sessionList.schema>;
