"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/FormParts";
import { readAlert } from "@/lib/routines/alert-actions";
import type { RoutineActionState } from "@/lib/routines/schemas";

/**
 * Marca la alerta como leída. Sigue siendo un `<form>` en el HTML del
 * servidor: `scripts/verify-routine-sessions.test.mjs` lo localiza por el
 * `value` de su alerta (ADR-0008).
 */
export function ReadAlertForm({ alertId }: { alertId: string }) {
  const [state, action, pending] = useActionState<RoutineActionState, FormData>(
    readAlert,
    {},
  );

  return (
    <form action={action} className="mt-4 grid gap-2">
      <input type="hidden" name="alertId" value={alertId} />
      {/*
        `type="submit"` explícito: el `<Button>` de `@base-ui/react` emite
        `type="button"` por defecto, así que sin esto el `<form action>` nunca
        se envía y la alerta no se marca como leída.
      */}
      <Button
        type="submit"
        variant="outline"
        className="justify-self-start"
        disabled={pending}
      >
        {pending ? "Guardando…" : "Marcar como leída para mí"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
