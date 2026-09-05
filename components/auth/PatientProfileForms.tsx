"use client";

import { useActionState } from "react";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import { Button } from "@/components/ui/button";
import {
  Choices,
  Field,
  FormMessage,
  inputClass,
} from "@/components/auth/FormParts";
import {
  updatePatientProfile,
  saveCondition,
} from "@/lib/auth/onboarding-actions";
import {
  patientProfileSchema,
  conditionSchema,
  goalLabels,
  levelLabels,
  environmentLabels,
  severityLabels,
} from "@/lib/auth/onboarding-schemas";
import { equipmentLabels } from "@/lib/catalog/equipment";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import type { Database } from "@/lib/db/types";

type Details = Database["public"]["Tables"]["patient_details"]["Row"];
type Condition = Database["public"]["Tables"]["patient_conditions"]["Row"];
export function PatientProfileForm({ details }: { details: Details }) {
  const [state, action, pending] = useActionState(updatePatientProfile, {});
  const validation = useFormValidation(patientProfileSchema, (form) => ({
    ...Object.fromEntries(form),
    equipment: form.getAll("equipment"),
  }));
  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-6">
      <input type="hidden" name="patientId" value={details.profile_id} />
      <Choices
        name="goal"
        title="Objetivo"
        labels={goalLabels}
        selected={details.goal}
      />
      <Choices
        name="level"
        title="Nivel"
        labels={levelLabels}
        selected={details.level}
      />
      <Choices
        name="environment"
        title="Entorno"
        labels={environmentLabels}
        selected={details.environment}
      />
      <Choices
        name="equipment"
        title="Equipamiento disponible"
        labels={equipmentLabels}
        selected={details.equipment}
        multiple
      />
      <FormMessage
        state={{ ...state, error: validation.error ?? state.error }}
      />
      <Button type="submit" className="min-h-12" disabled={pending}>
        {pending ? "Guardando…" : "Guardar perfil"}
      </Button>
    </form>
  );
}
export function ConditionForm({
  patientId,
  condition,
}: {
  patientId: string;
  condition?: Condition;
}) {
  const [state, action, pending] = useActionState(saveCondition, {});
  const validation = useFormValidation(conditionSchema);
  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-4">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="conditionId" value={condition?.id ?? ""} />
      <Field label="Parte del cuerpo">
        <select
          className={inputClass}
          name="body_part"
          required
          defaultValue={condition?.body_part ?? ""}
        >
          <option value="" disabled>
            Selecciona una zona
          </option>
          {Object.entries(bodyPartLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Severidad">
        <select
          className={inputClass}
          name="severity"
          defaultValue={condition?.severity ?? "mild"}
        >
          {Object.entries(severityLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notas">
        <textarea
          className={inputClass}
          name="notes"
          defaultValue={condition?.notes ?? ""}
          rows={3}
          maxLength={1000}
        />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          className="size-5 accent-brand"
          name="is_active"
          type="checkbox"
          defaultChecked={condition?.is_active ?? true}
        />
        Condición activa
      </label>
      <FormMessage
        state={{ ...state, error: validation.error ?? state.error }}
      />
      <Button
        className="min-h-12"
        variant="outline"
        type="submit"
        disabled={pending}
      >
        {pending
          ? "Guardando…"
          : condition
            ? "Guardar condición"
            : "Registrar condición"}
      </Button>
    </form>
  );
}
