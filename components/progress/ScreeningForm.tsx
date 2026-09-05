"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import { createScreening } from "@/lib/progress/screening-actions";
import {
  createScreeningSchema,
  screeningFormValues,
} from "@/lib/progress/screening-schemas";
import {
  measurementLabels,
  measurements,
  today,
} from "@/lib/progress/vocabulary";

/** Un decimal basta: la cinta métrica y la báscula del negocio no dan más. */
const step = "0.1";

/**
 * Registro de un tamizaje. El IMC no se pide: lo calcula la base de datos a
 * partir del peso y la talla.
 */
export function ScreeningForm({ patientId }: { patientId: string }) {
  const [state, action, pending] = useActionState(createScreening, {});
  const validation = useFormValidation(
    createScreeningSchema,
    screeningFormValues,
  );

  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-6">
      <input type="hidden" name="patientId" value={patientId} />

      <Field label="Fecha del tamizaje">
        <input
          className={inputClass}
          name="takenOn"
          type="date"
          max={today()}
          defaultValue={today()}
          required
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Peso (kg)">
          <input
            className={inputClass}
            name="weightKg"
            type="number"
            inputMode="decimal"
            step={step}
            min={20}
            max={300}
            required
          />
        </Field>

        <Field label="Talla (cm)">
          <input
            className={inputClass}
            name="heightCm"
            type="number"
            inputMode="decimal"
            step={step}
            min={100}
            max={250}
            required
          />
        </Field>
      </div>

      <Field label="Grasa corporal (%) · opcional">
        <input
          className={inputClass}
          name="bodyFatPct"
          type="number"
          inputMode="decimal"
          step={step}
          min={1}
          max={70}
        />
      </Field>

      <fieldset className="grid gap-4">
        <legend className="font-semibold">Medidas corporales · opcionales</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {measurements.map((key) => (
            <Field key={key} label={`${measurementLabels[key]} (cm)`}>
              <input
                className={inputClass}
                name={key}
                type="number"
                inputMode="decimal"
                step={step}
                min={10}
                max={250}
              />
            </Field>
          ))}
        </div>
      </fieldset>

      <Field label="Observaciones · opcional">
        <textarea
          className={`${inputClass} min-h-24`}
          name="notes"
          maxLength={1000}
          placeholder="Cómo llegó el paciente, qué se acordó para la próxima medición…"
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
        {pending ? "Guardando…" : "Registrar tamizaje"}
      </Button>
    </form>
  );
}
