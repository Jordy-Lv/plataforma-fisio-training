"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { inputClass } from "@/components/auth/FormParts";
import type { Series } from "@/lib/progress/evolution";
import { formatNumber, formatShortDate } from "@/lib/progress/vocabulary";

/** Cómo se escribe un valor con su unidad, que a veces no hay (el IMC). */
const conUnidad = (value: number, unit: string) =>
  unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);

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
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="mx-auto max-w-md leading-7 text-muted-foreground">
          {empty}
        </p>
      </div>
    );

  const último = active.points[active.points.length - 1];

  return (
    <div className="grid gap-4">
      {series.length > 1 && (
        <label className="grid gap-2 text-sm font-medium sm:max-w-xs">
          Qué se dibuja
          <select
            className={inputClass}
            value={active.key}
            onChange={(event) => setSelected(event.target.value)}
          >
            {series.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {active.points.length < 2 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-2xl font-semibold">
            {conUnidad(último.value, active.unit)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.label} · {formatShortDate(último.on)}
          </p>
          <p className="mx-auto mt-3 max-w-md leading-7 text-muted-foreground">
            {single}
          </p>
        </div>
      ) : (
        // `ResponsiveContainer` mide el ancho que le den: el contenedor no
        // puede tener ancho propio o la gráfica desborda en el teléfono.
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface p-4 pl-0">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={active.points}
              margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
            >
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="on"
                tickFormatter={formatShortDate}
                tickMargin={8}
                minTickGap={16}
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <YAxis
                width={48}
                domain={["dataMin - 2", "dataMax + 2"]}
                tickFormatter={(value: number) => formatNumber(value)}
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <Tooltip
                labelFormatter={(label) => formatShortDate(String(label))}
                formatter={(value) => [
                  conUnidad(Number(value), active.unit),
                  active.label,
                ]}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  color: "var(--foreground)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={active.label}
                stroke="var(--brand)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--brand)" }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
