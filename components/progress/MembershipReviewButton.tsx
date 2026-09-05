"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/FormParts";
import {
  triggerMembershipReview,
  type ReviewActionState,
} from "@/lib/progress/membership-review-actions";

/**
 * Dispara a mano la revisión de vencimientos. El job de pg_cron la ejecuta a
 * diario; este botón existe para la demostración y para forzarla tras registrar
 * una membresía que vence pronto.
 */
export function MembershipReviewButton() {
  const [state, action, pending] = useActionState<ReviewActionState>(
    triggerMembershipReview,
    {},
  );

  return (
    <form action={action} className="grid gap-3">
      <Button
        type="submit"
        variant="outline"
        className="min-h-11 justify-self-start"
        disabled={pending}
      >
        {pending ? "Revisando…" : "Revisar vencimientos ahora"}
      </Button>
      <FormMessage
        state={{ error: state.error, success: state.summary }}
      />
    </form>
  );
}
