"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import {
  setMembershipNoticeDays,
  type ReviewActionState,
} from "@/lib/progress/membership-review-actions";

/**
 * Ajusta con cuántos días de antelación se avisa un vencimiento próximo. El
 * valor lo comparte todo el negocio: es el umbral `membership_expiring_days`.
 */
export function MembershipNoticeDaysForm({ current }: { current: number }) {
  const [state, action, pending] = useActionState<ReviewActionState, FormData>(
    setMembershipNoticeDays,
    {},
  );
  const hintId = useId();

  return (
    <form action={action} className="grid gap-2">
      <p id={hintId} className="max-w-2xl text-xs leading-5 text-muted-foreground">
        El proceso diario marca las próximas a vencer y las vencidas, avisa al
        equipo y envía el correo al paciente.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Plazo de aviso (días)">
          <input
            className={`${inputClass} max-w-32`}
            aria-describedby={hintId}
            name="noticeDays"
            type="number"
            inputMode="numeric"
            min={1}
            max={90}
            step={1}
            defaultValue={current}
            required
          />
        </Field>
        <Button
          type="submit"
          variant="outline"
          className="min-h-12"
          disabled={pending}
        >
          {pending ? "Guardando…" : "Guardar plazo"}
        </Button>
      </div>
      <FormMessage state={{ error: state.error, success: state.summary }} />
    </form>
  );
}
