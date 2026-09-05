"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import {
  createMembership,
  updateMembership,
} from "@/lib/progress/membership-actions";
import {
  createMembershipSchema,
  membershipFormValues,
  updateMembershipSchema,
} from "@/lib/progress/membership-schemas";
import type { MembershipWithPatient } from "@/lib/progress/membership-queries";
import {
  membershipStatusLabels,
  membershipStatuses,
} from "@/lib/progress/membership-vocabulary";

type Option = { id: string; label: string };

/**
 * Alta y edición de una membresía. Es un registro administrativo: fechas,
 * monto y estado. No procesa ningún pago. Con `membership` edita esa fila; sin
 * ella crea una nueva, y entonces `defaultPatientId` la deja preseleccionada.
 */
export function MembershipForm({
  patients,
  plans,
  membership,
  defaultPatientId,
}: {
  patients: Option[];
  plans: Option[];
  membership?: MembershipWithPatient;
  defaultPatientId?: string;
}) {
  const editing = Boolean(membership);
  const [state, action, pending] = useActionState(
    editing ? updateMembership : createMembership,
    {},
  );
  const validation = useFormValidation(
    editing ? updateMembershipSchema : createMembershipSchema,
    membershipFormValues,
  );

  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-6">
      {membership && <input type="hidden" name="id" value={membership.id} />}

      <Field label="Paciente">
        <select
          className={inputClass}
          name="patientId"
          defaultValue={membership?.patient_id ?? defaultPatientId ?? ""}
          required
        >
          <option value="" disabled>
            Elige un paciente
          </option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Plan">
        <select
          className={inputClass}
          name="planId"
          defaultValue={membership ? undefined : ""}
          required
        >
          <option value="" disabled>
            Elige un plan
          </option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Fecha de ingreso">
          <input
            className={inputClass}
            name="startedOn"
            type="date"
            defaultValue={membership?.started_on ?? ""}
            required
          />
        </Field>

        <Field label="Fecha de vencimiento">
          <input
            className={inputClass}
            name="expiresOn"
            type="date"
            defaultValue={membership?.expires_on ?? ""}
            required
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Monto (COP)">
          <input
            className={inputClass}
            name="amount"
            type="number"
            inputMode="numeric"
            step={1000}
            min={0}
            defaultValue={membership?.amount ?? ""}
            required
          />
        </Field>

        <Field label="Estado">
          <select
            className={inputClass}
            name="status"
            defaultValue={membership?.status ?? "active"}
            required
          >
            {membershipStatuses.map((value) => (
              <option key={value} value={value}>
                {membershipStatusLabels[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Observación · opcional">
        <textarea
          className={`${inputClass} min-h-20`}
          name="notes"
          maxLength={500}
          defaultValue={membership?.notes ?? ""}
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
            : "Registrar membresía"}
      </Button>
    </form>
  );
}
