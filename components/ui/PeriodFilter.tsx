"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { inputClass } from "@/components/auth/FormParts";

export type PeriodOption = {
  /** Lo que lleva el `data-*` de cada tarjeta: un año («2026») o un mes («2026-09»). */
  value: string;
  label: string;
};

/**
 * Acota por periodo un historial que ya pintó el servidor.
 *
 * El historial de un paciente —tamizajes, asistencia— es una pila de tarjetas
 * que crece con cada medición y no cabe en una pantalla al cabo de unos meses.
 * Este componente muestra solo las del periodo elegido, que arranca en el más
 * reciente.
 *
 * Tres decisiones que lo hacen compatible con las suites de
 * `docs/11-contratos-de-las-suites-http.md`:
 *
 * - **No es un `<form>`.** Un `<form method="get">` en una pantalla cuyo
 *   marcador es un uuid secuestraría el formulario de la server action.
 * - **Las tarjetas las renderiza el servidor**; aquí solo se ocultan por su
 *   `data-<attribute>`, así que el orden y los `<h3>` que leen las suites no
 *   cambian.
 * - **Sin JavaScript se ve el historial entero**: el filtro solo estrecha.
 */
export function PeriodFilter({
  label,
  attribute,
  options,
  allLabel,
  children,
}: {
  /** Rótulo del selector: «Año», «Mes». */
  label: string;
  /** Nombre del `data-*` de las tarjetas, sin el prefijo: `year`, `month`. */
  attribute: string;
  /** Los periodos presentes, del más reciente al más antiguo. */
  options: PeriodOption[];
  /** La opción que no filtra nada: «Todos los años», «Todos los meses». */
  allLabel: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<string>(
    options.length > 0 ? options[0].value : "all",
  );
  const choices = useMemo(
    () => [{ value: "all", label: allLabel }, ...options],
    [options, allLabel],
  );

  useEffect(() => {
    const cards = listRef.current?.querySelectorAll<HTMLElement>(
      `[data-${attribute}]`,
    );
    if (!cards) return;
    for (const card of cards) {
      card.hidden = period !== "all" && card.dataset[attribute] !== period;
    }
  }, [period, attribute]);

  return (
    <div className="grid gap-4">
      {options.length > 1 && (
        <label className="grid max-w-[16rem] gap-1 text-sm">
          <span className="font-medium text-muted-foreground">{label}</span>
          <select
            className={inputClass}
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
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
