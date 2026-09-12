"use client";

import { useState } from "react";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Select } from "@/components/ui/Field";
import type { Series } from "@/lib/progress/evolution";

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
];

const CHART = {
  width: 640,
  height: 260,
  top: 24,
  right: 28,
  bottom: 44,
  left: 54,
};

function formatChartNumber(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const formatted = Number.isInteger(rounded)
    ? rounded.toFixed(0)
    : rounded.toFixed(1);

  return formatted.replace(".", ",");
}

function formatChartDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return `${day} ${MONTHS[month - 1] ?? ""}`.trim();
}

/** Cómo se escribe un valor con su unidad, que a veces no hay (el IMC). */
const conUnidad = (value: number, unit: string) => {
  const formatted = formatChartNumber(value);

  return unit ? `${formatted} ${unit}` : formatted;
};

function tickIndexes(length: number) {
  return Array.from(new Set([0, Math.floor((length - 1) / 2), length - 1])).filter(
    (index) => index >= 0,
  );
}

function chartGeometry(points: Series["points"]) {
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const values = points.map((point) => point.value);
  const minRaw = Math.min(...values);
  const maxRaw = Math.max(...values);
  const span = maxRaw - minRaw;
  const padding =
    span === 0 ? Math.max(Math.abs(maxRaw) * 0.08, 1) : span * 0.12;
  const min = minRaw - padding;
  const max = maxRaw + padding;
  const range = max - min || 1;

  const plotted = points.map((point, index) => {
    const x = CHART.left + (plotWidth * index) / Math.max(points.length - 1, 1);
    const y = CHART.top + ((max - point.value) / range) * plotHeight;

    return { ...point, x, y };
  });

  const yTicks = [max, (max + min) / 2, min].map((value) => ({
    value,
    y: CHART.top + ((max - value) / range) * plotHeight,
  }));
  const xTicks = tickIndexes(points.length)
    .map((index) => plotted[index])
    .filter((point): point is (typeof plotted)[number] => Boolean(point));
  const linePoints = plotted.map((point) => `${point.x},${point.y}`).join(" ");

  return { plotted, yTicks, xTicks, linePoints };
}

/**
 * Una gráfica de evolución con selector de métrica. Las series llegan ya
 * agregadas desde el servidor; aquí solo se eligen y se dibujan.
 *
 * Con menos de dos puntos no se dibuja nada: una línea de un solo punto no es
 * una evolución, y una gráfica vacía hace pensar que algo falló. En su lugar
 * se muestra el valor que sí hay y qué falta para ver la línea.
 */
export function EvolutionChart({
  series,
  empty,
  single,
}: {
  series: Series[];
  /** Qué decir cuando no hay ni un dato del que partir. */
  empty: string;
  /** Qué decir cuando solo hay uno, además del propio valor. */
  single: string;
}) {
  const [selected, setSelected] = useState(series[0]?.key);
  const active = series.find((item) => item.key === selected) ?? series[0];

  if (!active)
    return (
      <EmptyState title="Todavía no hay nada que dibujar">{empty}</EmptyState>
    );

  const ultimo = active.points.at(-1);

  if (!ultimo)
    return (
      <EmptyState title="Todavía no hay nada que dibujar">{empty}</EmptyState>
    );

  if (active.points.length < 2)
    return (
      <div className="grid gap-4">
        {series.length > 1 && (
          <Field label="Qué se dibuja" className="sm:max-w-xs">
            <Select
              value={active.key}
              onChange={(event) => setSelected(event.target.value)}
            >
              {series.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <EmptyState
          title={
            <span className="text-2xl">
              {conUnidad(ultimo.value, active.unit)}
            </span>
          }
        >
          <p className="text-sm text-muted-foreground">
            {active.label} · {formatChartDate(ultimo.on)}
          </p>
          <p className="mt-3">{single}</p>
        </EmptyState>
      </div>
    );

  const first = active.points[0]!;
  const { plotted, yTicks, xTicks, linePoints } = chartGeometry(active.points);

  return (
    <div className="grid gap-4">
      {series.length > 1 && (
        <Field label="Qué se dibuja" className="sm:max-w-xs">
          <Select
            value={active.key}
            onChange={(event) => setSelected(event.target.value)}
          >
            {series.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div
        className={cn(cardVariants({ padding: "none" }), "w-full overflow-hidden")}
      >
        <div className="p-4">
          <svg
            role="img"
            aria-label={`${active.label}: de ${conUnidad(first.value, active.unit)} a ${conUnidad(
              ultimo.value,
              active.unit,
            )}`}
            className="h-[260px] w-full"
            viewBox={`0 0 ${CHART.width} ${CHART.height}`}
            preserveAspectRatio="none"
          >
            <line
              x1={CHART.left}
              x2={CHART.width - CHART.right}
              y1={CHART.height - CHART.bottom}
              y2={CHART.height - CHART.bottom}
              stroke="var(--border)"
              strokeWidth="1"
            />

            {yTicks.map((tick) => (
              <g key={`${active.key}-${tick.value}`}>
                <line
                  x1={CHART.left}
                  x2={CHART.width - CHART.right}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="var(--border)"
                  strokeDasharray="4 5"
                  strokeWidth="1"
                />
                <text
                  x={CHART.left - 10}
                  y={tick.y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="var(--muted-foreground)"
                >
                  {conUnidad(tick.value, active.unit)}
                </text>
              </g>
            ))}

            {xTicks.map((tick) => (
              <text
                key={`${active.key}-${tick.on}`}
                x={tick.x}
                y={CHART.height - 12}
                textAnchor="middle"
                fontSize="12"
                fill="var(--muted-foreground)"
              >
                {formatChartDate(tick.on)}
              </text>
            ))}

            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--brand)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />

            {plotted.map((point) => (
              <circle
                key={`${active.key}-${point.on}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="var(--surface)"
                stroke="var(--brand)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>

        <div
          className="grid gap-3 border-t border-border px-4 py-3 text-sm sm:grid-cols-3"
        >
          <p className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Inicio</span>
            <span className="font-semibold text-foreground">
              {conUnidad(first.value, active.unit)} · {formatChartDate(first.on)}
            </span>
          </p>
          <p className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Último</span>
            <span className="font-semibold text-foreground">
              {conUnidad(ultimo.value, active.unit)} · {formatChartDate(ultimo.on)}
            </span>
          </p>
          <p className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Registros</span>
            <span className="font-semibold text-foreground">
              {active.points.length}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
