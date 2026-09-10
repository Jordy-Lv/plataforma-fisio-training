"use client";

import { useActionState, useState } from "react";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import {
  createPerson,
  assignProfessional,
  closeAssignment,
  deactivatePerson,
} from "@/lib/auth/people-actions";
import {
  createPersonSchema,
  assignmentSchema,
  closeAssignmentSchema,
  deactivateSchema,
  specialtyLabels,
} from "@/lib/auth/people-schemas";

export function CreatePersonForm({ isAdmin }: { isAdmin: boolean }) {
  const [state, action, pending] = useActionState(createPerson, {});
  const validation = useFormValidation(createPersonSchema, (form) => ({
    ...Object.fromEntries(form),
    specialty: form.get("specialty") || null,
  }));
  const [role, setRole] = useState("patient");
  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-4">
      <h2 className="text-xl font-semibold">
        {isAdmin ? "Registrar una persona" : "Registrar un paciente"}
      </h2>
      {isAdmin ? (
        <Field label="Tipo de persona">
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          >
            <option value="patient">Paciente</option>
            <option value="professional">Profesional</option>
          </select>
        </Field>
      ) : (
        <input type="hidden" name="role" value="patient" />
      )}
      <Field label="Nombre completo">
        <input
          className={inputClass}
          name="fullName"
          autoComplete="name"
          required
          maxLength={120}
        />
      </Field>
      <Field label="Correo electrónico">
        <input
          className={inputClass}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </Field>
      <Field label="Teléfono (opcional)">
        <input
          className={inputClass}
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={30}
        />
      </Field>
      {role === "professional" && (
        <Field label="Especialidad">
          <select name="specialty" className={inputClass} required>
            {Object.entries(specialtyLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Contraseña inicial">
        <input
          className={inputClass}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
        />
      </Field>
      <p className="text-sm leading-6 text-muted-foreground">
        Comparte las credenciales con la persona. Puede cambiar su contraseña
        desde la opción de recuperación.
      </p>
      <FormMessage
        state={{ ...state, error: validation.error ?? state.error }}
      />
      <Button type="submit" className="min-h-12" disabled={pending}>
        {pending
          ? "Registrando…"
          : role === "professional"
            ? "Registrar profesional"
            : "Registrar paciente"}
      </Button>
    </form>
  );
}

type PersonOption = {
  id: string;
  full_name: string | null;
  specialty?: "training" | "physio" | null;
};
export function AssignmentForm({
  patients,
  professionals,
}: {
  patients: PersonOption[];
  professionals: PersonOption[];
}) {
  const [state, action, pending] = useActionState(assignProfessional, {});
  const validation = useFormValidation(assignmentSchema);
  const [kind, setKind] = useState<"training" | "physio">("training");
  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-4">
      <h2 className="text-xl font-semibold">Asignar profesional</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        Cada paciente puede tener un entrenador y un fisioterapeuta.
      </p>
      <Field label="Paciente">
        <select
          className={inputClass}
          name="patientId"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Selecciona un paciente
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name || "Sin nombre"}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tipo de acompañamiento">
        <select
          className={inputClass}
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          {Object.entries(specialtyLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Profesional">
        <select
          key={kind}
          className={inputClass}
          name="professionalId"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Selecciona un profesional
          </option>
          {professionals
            .filter((p) => p.specialty === kind)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || "Sin nombre"}
              </option>
            ))}
        </select>
      </Field>
      <FormMessage
        state={{ ...state, error: validation.error ?? state.error }}
      />
      <Button
        type="submit"
        variant="outline"
        className="min-h-12"
        disabled={pending}
      >
        {pending ? "Asignando…" : "Asignar profesional"}
      </Button>
    </form>
  );
}

/**
 * Cierra un acompañamiento vigente. Va **después** del formulario de asignar y,
 * por tanto, después de las bajas de persona: su `value="<uuid>"` es el del
 * acompañamiento, y en `/people` el primer `<form>` que contiene un uuid es «el
 * formulario» para las suites (`docs/11-contratos-de-las-suites-http.md`).
 *
 * Pide confirmación porque **cambia quién ve al paciente**: a partir de aquí
 * `treats_patient()` deja de dar acceso a ese profesional. La fila no se borra,
 * se cierra.
 */
export function CloseAssignmentForm({
  assignmentId,
  patientName,
  professionalName,
  kindLabel,
}: {
  assignmentId: string;
  patientName: string;
  professionalName: string;
  kindLabel: string;
}) {
  const [state, action, pending] = useActionState(closeAssignment, {});
  const validation = useFormValidation(closeAssignmentSchema);
  return (
    <details className="rounded-lg border border-border p-3">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm">
        <span>
          <strong className="font-semibold">{patientName}</strong>
          {" · "}
          {kindLabel}
          {" · "}
          {professionalName}
        </span>
      </summary>
      <form onSubmit={validation.onSubmit} action={action} className="mt-3 grid gap-3">
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <p className="text-sm leading-6 text-muted-foreground">
          {professionalName} dejará de ver a {patientName} en cuanto se cierre.
          El historial se conserva y podrás asignarle otro profesional de{" "}
          {kindLabel.toLowerCase()}.
        </p>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="confirmation"
            value="yes"
            required
            className="size-5 accent-brand"
          />
          Confirmo el cierre
        </label>
        <FormMessage
          state={{ ...state, error: validation.error ?? state.error }}
        />
        <Button
          variant="destructive"
          type="submit"
          className="min-h-11 w-fit"
          disabled={pending}
        >
          {pending ? "Cerrando…" : "Cerrar acompañamiento"}
        </Button>
      </form>
    </details>
  );
}

export function DeactivateForm({
  personId,
  name,
  assignments,
}: {
  personId: string;
  name: string;
  assignments: number;
}) {
  const [state, action, pending] = useActionState(deactivatePerson, {});
  const validation = useFormValidation(deactivateSchema);
  return (
    <details className="mt-2">
      <summary className="flex min-h-11 w-fit cursor-pointer items-center text-sm text-destructive underline underline-offset-4">
        Dar de baja a {name}
      </summary>
      <form
        action={action}
        className="mt-2 grid max-w-lg gap-3 rounded-lg border border-border p-4"
      >
        <input type="hidden" name="personId" value={personId} />
        <input type="hidden" name="expectedAssignments" value={assignments} />
        <p className="text-sm leading-6">
          Esta persona perderá el acceso. Su historial se conserva.
          {assignments > 0 &&
            ` ${assignments} paciente(s) quedarán sin este profesional; sus asignaciones se cerrarán.`}
        </p>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="confirmation"
            value="yes"
            required
            className="size-5 accent-brand"
          />
          Confirmo la baja de {name}
        </label>
        <FormMessage
          state={{ ...state, error: validation.error ?? state.error }}
        />
        <Button
          variant="destructive"
          type="submit"
          className="min-h-11 w-fit"
          disabled={pending}
        >
          {pending ? "Guardando…" : "Confirmar baja"}
        </Button>
      </form>
    </details>
  );
}
