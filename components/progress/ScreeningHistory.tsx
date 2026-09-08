"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { inputClass } from "@/components/auth/FormParts";

/**
 * El historial de tamizajes es una pila de tarjetas que crece con cada
 * medición. Este componente añade un filtro por año que arranca en el más
 * reciente: al entrar se ve el año en curso y desde el `<select>` se llega al
 * resto. Sin JavaScript se ven todas —el filtro solo estrecha—.
 *
 * Las tarjetas las renderiza el servidor; aquí solo se muestran u ocultan por
 * su `data-year`, así que el orden y los `<h3>` con la fecha que lee
 * `verify-progress-screenings` no cambian.
 */
export function ScreeningHistory({
  years,
  children,
}: {
  /** Los años presentes, de más reciente a más antiguo. */
  years: number[];
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [year, setYear] = useState<string>(
    years.length > 0 ? String(years[0]) : "all",
  );
  const options = useMemo(
    () => [
      { value: "all", label: "Todos los años" },
      ...years.map((y) => ({ value: String(y), label: String(y) })),
    ],
    [years],
  );

  useEffect(() => {
    const cards = listRef.current?.querySelectorAll<HTMLElement>("[data-year]");
    if (!cards) return;
    for (const card of cards) {
      card.hidden = year !== "all" && card.dataset.year !== year;
    }
  }, [year]);

  return (
    <div className="grid gap-4">
      {years.length > 1 && (
        <label className="grid max-w-[12rem] gap-1 text-sm">
          <span className="font-medium text-muted-foreground">Año</span>
          <select
            className={inputClass}
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <div ref={listRef} className="contents">
        {children}
      </div>
    </div>
  );
}
