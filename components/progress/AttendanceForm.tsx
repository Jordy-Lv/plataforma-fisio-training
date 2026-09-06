"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import { registerAttendance } from "@/lib/progress/attendance-actions";
import {
  attendanceFormValues,
  registerAttendanceSchema,
} from "@/lib/progress/attendance-schemas";
import { today } from "@/lib/progress/vocabulary";

/**
 * Registro de asistencia. Se rellena en el mostrador con el paciente delante,
 * así que trae la fecha de hoy puesta y no pide nada más que confirmarla.
 */
export function AttendanceForm({ patientId }: { patientId: string }) {
  const [state, action, pending] = useActionState(registerAttendance, {});
  const validation = useFormValidation(
    registerAttendanceSchema,
    attendanceFormValues,
  );

  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-6">
      <input type="hidden" name="patientId" value={patientId} />

      <Field label="Fecha de la asistencia">
        <input
          className={inputClass}
          name="attendedOn"
          type="date"
          max={today()}
          defaultValue={today()}
          required
        />
      </Field>

      <Field label="Observación · opcional">
        <textarea
          className={`${inputClass} min-h-24`}
          name="notes"
          maxLength={500}
          placeholder="Llegó tarde, hizo media sesión, vino solo a fisioterapia…"
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
        {pending ? "Guardando…" : "Registrar asistencia"}
      </Button>
    </form>
  );
}
