import type { ReactNode } from "react";
import { PeriodFilter } from "@/components/ui/PeriodFilter";

/**
 * El historial de tamizajes, acotado por año. Arranca en el más reciente: al
 * entrar se ve el año en curso y desde el `<select>` se llega al resto.
 *
 * La mecánica —y por qué no puede ser un `<form>`— está en
 * `components/ui/PeriodFilter.tsx`.
 */
export function ScreeningHistory({
  years,
  children,
}: {
  /** Los años presentes, de más reciente a más antiguo. */
  years: number[];
  children: ReactNode;
}) {
  return (
    <PeriodFilter
      label="Año"
      attribute="year"
      allLabel="Todos los años"
      options={years.map((year) => ({
        value: String(year),
        label: String(year),
      }))}
    >
      {children}
    </PeriodFilter>
  );
}
