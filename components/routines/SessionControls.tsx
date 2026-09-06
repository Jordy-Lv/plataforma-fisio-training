"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/auth/FormParts";
import { Button } from "@/components/ui/button";
import { closeSession, startSession } from "@/lib/routines/session-actions";
import { type RoutineActionState } from "@/lib/routines/schemas";

/**
 * Iniciar un día o cerrar la sesión en curso. Sigue siendo un `<form>` con
 * server action y su campo oculto: `scripts/verify-routine-sessions.test.mjs`
 * lo envía sin JavaScript buscando `value="<dayId>"` y el rótulo «Terminar
 * sesión» en el HTML del servidor.
 */
export function SessionControls({
  dayId,
  sessionId,
  label,
}: {
  dayId?: string;
  sessionId?: string;
  label?: string;
}) {
  const [state, action, pending] = useActionState<RoutineActionState, FormData>(
    sessionId ? closeSession : startSession,
    {},
  );

  return (
    <form action={action} className="my-4 grid gap-3">
      <input
        type="hidden"
        name={sessionId ? "sessionId" : "dayId"}
        value={sessionId ?? dayId}
      />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending
          ? "Guardando…"
          : (label ?? (sessionId ? "Terminar sesión" : "Iniciar o reanudar este día"))}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
