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
  className,
  size = "lg",
}: {
  dayId?: string;
  sessionId?: string;
  label?: string;
  className?: string;
  size?: "sm" | "lg";
}) {
  const [state, action, pending] = useActionState<RoutineActionState, FormData>(
    sessionId ? closeSession : startSession,
    {},
  );

  return (
    <form action={action} className={className ?? "my-4 grid gap-3"}>
      <input
        type="hidden"
        name={sessionId ? "sessionId" : "dayId"}
        value={sessionId ?? dayId}
      />
      {/* Compacto solo en la banda de la sesión, donde comparte fila con el
          conteo; en su sitio de siempre sigue ocupando el ancho. */}
      <Button
        type="submit"
        size={size}
        disabled={pending}
        className={size === "sm" ? "w-auto" : "w-full sm:w-auto"}
      >
        {pending
          ? "Guardando…"
          : (label ?? (sessionId ? "Terminar sesión" : "Iniciar o reanudar este día"))}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
