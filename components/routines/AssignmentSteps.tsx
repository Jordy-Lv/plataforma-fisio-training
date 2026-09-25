import { cn } from "cn";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import {
  difficultyLabels,
  environmentLabels,
  goalLabels,
  labelFor,
} from "@/lib/catalog/vocabulary";

const steps = ["Elegir plantilla", "Ajustar y confirmar", "Rutina activa"] as const;

/**
 * Dónde está la rutina de este paciente: elegir, ajustar el borrador o la
 * rutina ya activa (ADR-0009). Es un indicador, no navegación: el paso lo
 * decide el servidor según el estado de la rutina.
 */
export function AssignmentSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Pasos de la asignación" className="flex flex-wrap gap-2 text-sm">
      {steps.map((label, index) => {
        const current = index + 1 === step;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1",
              current
                ? "border-brand bg-brand-soft font-semibold text-brand-soft-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            <span aria-hidden="true">{index + 1}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Lo que el profesional mira al elegir: objetivo, nivel, entorno y condiciones
 * activas. Sin ranking ni «recomendada»: la decisión es suya.
 */
export function PatientBrief({
  goal,
  level,
  environment,
  conditions,
}: {
  goal: string | null;
  level: string | null;
  environment: string | null;
  conditions: string[];
}) {
  const rows = [
    ["Objetivo", goal ? labelFor(goalLabels, goal) : "Sin registrar"],
    ["Nivel", level ? labelFor(difficultyLabels, level) : "Sin registrar"],
    ["Entorno", environment ? labelFor(environmentLabels, environment) : "Sin registrar"],
    [
      "Condiciones activas",
      conditions.length
        ? conditions.map((part) => labelFor(bodyPartLabels, part)).join(", ")
        : "Ninguna",
    ],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      {rows.map(([term, value]) => (
        <div key={term} className="grid gap-0.5">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="break-words font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
