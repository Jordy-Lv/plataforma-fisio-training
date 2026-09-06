"use client";

import { useActionState } from "react";
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

  return (
    <form action={action} className="grid gap-3">
      <Field label="Plazo de aviso (días)">
        <input
          className={`${inputClass} max-w-32`}
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
      <FormMessage state={{ error: state.error, success: state.summary }} />
      <Button
        type="submit"
        variant="outline"
        className="min-h-11 justify-self-start"
        disabled={pending}
      >
        {pending ? "Guardando…" : "Guardar plazo"}
      </Button>
    </form>
  );
}
