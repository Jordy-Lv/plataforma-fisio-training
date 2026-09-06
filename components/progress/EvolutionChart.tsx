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
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Select } from "@/components/ui/Field";
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
      <EmptyState title="Todavía no hay nada que dibujar">{empty}</EmptyState>
    );

  const último = active.points[active.points.length - 1];

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

      {active.points.length < 2 ? (
        <EmptyState
          title={
            <span className="text-2xl">
              {conUnidad(último.value, active.unit)}
            </span>
          }
        >
          <p className="text-sm text-muted-foreground">
            {active.label} · {formatShortDate(último.on)}
          </p>
          <p className="mt-3">{single}</p>
        </EmptyState>
      ) : (
        // `ResponsiveContainer` mide el ancho que le den: el contenedor no
        // puede tener ancho propio o la gráfica desborda en el teléfono.
        <div
          className={cn(
            cardVariants({ padding: "none" }),
            "w-full overflow-hidden p-4 pl-0",
          )}
        >
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
