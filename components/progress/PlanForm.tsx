"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import { createPlan, updatePlan } from "@/lib/progress/plan-actions";
import {
  createPlanSchema,
  planFormValues,
  updatePlanSchema,
} from "@/lib/progress/plan-schemas";
import type { Plan } from "@/lib/progress/plan-queries";
import {
  billingPeriodLabels,
  billingPeriods,
} from "@/lib/progress/plan-vocabulary";

/**
 * Alta y edición de un plan. El mismo formulario sirve para los dos casos: con
 * `plan` edita esa fila, sin él crea una nueva. Lo que incluye el plan se
 * escribe una prestación por línea; la server action la parte en un `text[]`.
 */
export function PlanForm({ plan }: { plan?: Plan }) {
  const editing = Boolean(plan);
  const [state, action, pending] = useActionState(
    editing ? updatePlan : createPlan,
    {},
  );
  const validation = useFormValidation(
    editing ? updatePlanSchema : createPlanSchema,
    planFormValues,
  );

  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-6">
      {plan && <input type="hidden" name="id" value={plan.id} />}

      <Field label="Nombre del plan">
        <input
          className={inputClass}
          name="name"
          type="text"
          maxLength={120}
          defaultValue={plan?.name ?? ""}
          required
        />
      </Field>

      <Field label="Descripción · opcional">
        <textarea
          className={`${inputClass} min-h-20`}
          name="description"
          maxLength={1000}
          defaultValue={plan?.description ?? ""}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Precio (COP)">
          <input
            className={inputClass}
            name="price"
            type="number"
            inputMode="numeric"
            step={1000}
            min={0}
            defaultValue={plan?.price ?? ""}
            required
          />
        </Field>

        <Field label="Periodicidad de cobro">
          <select
            className={inputClass}
            name="billingPeriod"
            defaultValue={plan?.billing_period ?? "monthly"}
            required
          >
            {billingPeriods.map((period) => (
              <option key={period} value={period}>
                {billingPeriodLabels[period]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Qué incluye · una prestación por línea">
        <textarea
          className={`${inputClass} min-h-28`}
          name="features"
          maxLength={2000}
          defaultValue={(plan?.features ?? []).join("\n")}
          placeholder={"Acceso libre a la sala\nUna valoración física al mes\nRutina personalizada"}
        />
      </Field>

      <FormMessage
        state={validation.error ? { error: validation.error } : state}
      />

      <Button
        type="submit"
        className="min-h-12 justify-self-start text-base"
        disabled={pending}
      >
        {pending
          ? "Guardando…"
          : editing
            ? "Guardar cambios"
            : "Crear plan"}
      </Button>
    </form>
  );
}
