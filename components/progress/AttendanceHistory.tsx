import type { ReactNode } from "react";
import { PeriodFilter } from "@/components/ui/PeriodFilter";
import { formatMonth } from "@/lib/progress/vocabulary";

/**
 * El historial de asistencia de un paciente, acotado por mes. Quien viene tres
 * veces por semana acumula más de cien tarjetas en un año: sin acotar, la
 * pantalla no termina nunca.
 *
 * La mecánica —y por qué no puede ser un `<form>`— está en
 * `components/ui/PeriodFilter.tsx`.
 */
export function AttendanceHistory({
  months,
  children,
}: {
  /** Los meses presentes como `YYYY-MM`, del más reciente al más antiguo. */
  months: string[];
  children: ReactNode;
}) {
  return (
    <PeriodFilter
      label="Mes"
      attribute="month"
      allLabel="Todos los meses"
      options={months.map((month) => ({
        value: month,
        label: formatMonth(`${month}-01`),
      }))}
    >
      {children}
    </PeriodFilter>
  );
}
