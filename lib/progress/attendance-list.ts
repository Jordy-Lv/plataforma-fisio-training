import { z } from "zod";
import { createListParams, optionalEnum, orderParam, pageParam, searchParam } from "@/lib/shared/list-params";
import { monthStart } from "@/lib/progress/vocabulary";

/** Un mes del calendario, `YYYY-MM`. Cualquier otra cosa se ignora. */
const monthParam = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().catch(undefined);

/** Por nombre (por defecto, el orden de siempre), por la asistencia más reciente o por cuántos días vino este mes. */
export const attendanceOrders = ["nombre", "reciente", "dias"] as const;
export type AttendanceOrder = (typeof attendanceOrders)[number];
export const attendanceOrderLabels: Record<AttendanceOrder, string> = {
  nombre: "Nombre (A-Z)",
  reciente: "Asistencia más reciente",
  dias: "Más días este mes",
};

/**
 * El estado del listado de asistencia. `month` sin valor es el mes en curso:
 * el valor por defecto no se congela en el esquema porque el módulo se carga
 * una vez y el mes cambia.
 */
export const attendanceList = createListParams({
  path: "/attendance", pageSize: 24, schema: z.object({
    q: searchParam(),
    month: monthParam,
    attended: optionalEnum(["some", "none"] as const),
    orden: orderParam(attendanceOrders, "nombre"),
    page: pageParam,
  }),
  notFilters: ["orden"],
});
export type AttendanceFilters = z.infer<typeof attendanceList.schema>;

/** El mes que se está mirando, con el mes en curso como valor de partida. */
export const currentMonth = (filters: AttendanceFilters) =>
  filters.month ?? monthStart().slice(0, 7);

/** El mes anterior o el siguiente, en `YYYY-MM`. */
export function shiftMonth(month: string, months: number) {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
