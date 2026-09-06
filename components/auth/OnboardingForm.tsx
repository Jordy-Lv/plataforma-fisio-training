"use client";

import { useActionState, useState } from "react";
import { usePreservedForm } from "@/lib/auth/use-preserved-form";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Choices, FormMessage } from "@/components/auth/FormParts";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { saveOnboardingStep } from "@/lib/auth/onboarding-actions";
import {
  goalSchema,
  environmentSchema,
  conditionsSchema,
  goalLabels,
  levelLabels,
  environmentLabels,
  severityLabels,
} from "@/lib/auth/onboarding-schemas";
import { equipmentLabels } from "@/lib/catalog/equipment";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import type { Database } from "@/lib/db/types";

type Details = Database["public"]["Tables"]["patient_details"]["Row"];
type Condition = { body_part: string; severity: string; notes: string };
export function OnboardingForm({
  step,
  details,
}: {
  step: number;
  details: Details | null;
}) {
  const formRef = usePreservedForm();
  const [state, action, pending] = useActionState(saveOnboardingStep, {});
  const [conditions, setConditions] = useState<Condition[]>([]);
  const validation = useFormValidation(
    step === 1 ? goalSchema : step === 2 ? environmentSchema : conditionsSchema,
    (form) =>
      step === 3
        ? conditions
        : { ...Object.fromEntries(form), equipment: form.getAll("equipment") },
  );
  function changeCondition(index: number, key: keyof Condition, value: string) {
    setConditions(
      conditions.map((condition, i) =>
        i === index ? { ...condition, [key]: value } : condition,
      ),
    );
  }
  return (
    <form
      ref={formRef}
      onSubmit={validation.onSubmit}
      action={action}
      className="grid gap-7"
    >
      <input type="hidden" name="step" value={step} />
      {step === 1 && (
        <>
          <Choices
            name="goal"
            title="¿Qué quieres conseguir?"
            labels={goalLabels}
            selected={details?.goal}
          />
          <Choices
            name="level"
            title="¿Cuál es tu nivel actual?"
            labels={levelLabels}
            selected={details?.level}
          />
        </>
      )}
      {step === 2 && (
        <>
          <Choices
            name="environment"
            title="¿Dónde vas a entrenar?"
            labels={environmentLabels}
            selected={details?.environment}
          />
          <Choices
            name="equipment"
            title="¿Con qué cuentas?"
            labels={equipmentLabels}
            selected={details?.equipment ?? []}
            multiple
          />
          <p className="text-sm leading-6 text-muted-foreground">
            Marca lo que tienes disponible. Si no tienes equipo, selecciona peso
            corporal.
          </p>
        </>
      )}
      {step === 3 && (
        <>
          <p className="leading-7 text-muted-foreground">
            Registra las molestias o limitaciones que debe conocer tu
            profesional. Si no tienes ninguna, puedes finalizar sin añadir
            condiciones.
          </p>
          <input
            type="hidden"
            name="conditions"
            value={JSON.stringify(conditions)}
          />
          {conditions.map((condition, index) => (
            <fieldset
              className="grid gap-4 rounded-xl border border-border bg-surface p-4"
              key={index}
            >
              <legend className="px-2 font-semibold">
                Condición {index + 1}
              </legend>
              <Field label="Parte del cuerpo">
                <Select
                  value={condition.body_part}
                  onChange={(e) =>
                    changeCondition(index, "body_part", e.target.value)
                  }
                  required
                >
                  <option value="" disabled>
                    Selecciona una zona
                  </option>
                  {Object.entries(bodyPartLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Severidad">
                <Select
                  value={condition.severity}
                  onChange={(e) =>
                    changeCondition(index, "severity", e.target.value)
                  }
                >
                  {Object.entries(severityLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Notas (opcional)">
                <Textarea
                  rows={3}
                  maxLength={1000}
                  value={condition.notes}
                  onChange={(e) =>
                    changeCondition(index, "notes", e.target.value)
                  }
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                className="justify-self-start"
                onClick={() =>
                  setConditions(conditions.filter((_, i) => i !== index))
                }
              >
                Quitar condición {index + 1}
              </Button>
            </fieldset>
          ))}
          <Button
            variant="outline"
            type="button"
            size="lg"
            disabled={conditions.length >= 20 || pending}
            onClick={() =>
              setConditions([
                ...conditions,
                { body_part: "", severity: "mild", notes: "" },
              ])
            }
          >
            Añadir condición
          </Button>
        </>
      )}
      <FormMessage
        state={{ ...state, error: validation.error ?? state.error }}
      />
      {/*
        La barra de avance se queda pegada abajo para no perseguir el botón en
        una lista larga de opciones. Va sobre `surface` y con márgenes
        negativos porque desde la fase 4 el formulario vive dentro de una
        tarjeta: con el fondo de la página se veía una banda gris flotando
        dentro de la tarjeta blanca.
      */}
      <div className="sticky bottom-0 -mx-5 grid gap-2 border-t border-border bg-surface px-5 py-4 sm:-mx-6 sm:px-6">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? "Guardando…"
            : step === 3
              ? "Finalizar mi perfil"
              : "Guardar y continuar"}
        </Button>
        {step > 1 && (
          <ButtonLink
            href={`/patient/onboarding?step=${step - 1}`}
            variant="ghost"
            className="w-full"
          >
            Volver al paso anterior
          </ButtonLink>
        )}
      </div>
    </form>
  );
}
