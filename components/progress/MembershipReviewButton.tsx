"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/auth/FormParts";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  triggerMembershipReview,
  type ReviewActionState,
} from "@/lib/progress/membership-review-actions";

/**
 * Dispara a mano la revisión de vencimientos. El job de pg_cron la ejecuta a
 * diario; este botón existe para la demostración y para forzarla tras registrar
 * una membresía que vence pronto.
 *
 * `useActionState` se conserva por el `FormMessage` —la acción devuelve el
 * resumen o el motivo del fallo—; la espera del botón la lleva `SubmitButton`.
 */
export function MembershipReviewButton() {
  const [state, action] = useActionState<ReviewActionState>(
    triggerMembershipReview,
    {},
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <SubmitButton
        variant="outline"
        className="min-h-11"
        pendingLabel="Revisando…"
      >
        Revisar vencimientos ahora
      </SubmitButton>
      <FormMessage
        state={{ error: state.error, success: state.summary }}
      />
    </form>
  );
}
