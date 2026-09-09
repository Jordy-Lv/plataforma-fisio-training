"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/auth/FormParts";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { readAlert } from "@/lib/routines/alert-actions";
import type { RoutineActionState } from "@/lib/routines/schemas";

/**
 * Marca la alerta como leída. Sigue siendo un `<form>` en el HTML del
 * servidor: `scripts/verify-routine-sessions.test.mjs` lo localiza por el
 * `value` de su alerta (ADR-0008).
 *
 * Estado optimista: en cuanto se envía, la bandeja muestra la alerta como
 * leída sin esperar a que el servidor revalide (spec «Marcar una alerta como
 * leída se refleja de inmediato»). Al terminar bien, `readAlert` revalida
 * `/pro/alerts` y este formulario desaparece; si falla, vuelve con el motivo.
 *
 * No se usa `useOptimistic`: exigiría envolver la server action en una función
 * de cliente, y eso deja el `<form>` sin `$ACTION_ID` —sin funcionar sin
 * JavaScript, que es justo lo que la suite ejercita—. El envío en curso
 * (`pending`) basta como señal optimista aquí, y el patrón no se generaliza.
 */
export function ReadAlertForm({ alertId }: { alertId: string }) {
  const [state, action, pending] = useActionState<RoutineActionState, FormData>(
    readAlert,
    {},
  );

  if (pending && !state.error) {
    return (
      <div className="mt-4">
        <Notice tone="success">Alerta marcada como leída para ti.</Notice>
      </div>
    );
  }

  return (
    <form action={action} className="mt-4 grid gap-2">
      <input type="hidden" name="alertId" value={alertId} />
      <SubmitButton
        variant="outline"
        className="justify-self-start"
        pendingLabel="Guardando…"
      >
        Marcar como leída para mí
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
