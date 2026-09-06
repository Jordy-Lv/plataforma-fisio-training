"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { startSession, closeSession } from "@/lib/routines/session-actions";
import { type RoutineActionState } from "@/lib/routines/schemas";

export function SessionControls({ dayId, sessionId, label }: { dayId?: string; sessionId?: string; label?: string }) {
  const [state, action, pending] = useActionState<RoutineActionState, FormData>(sessionId ? closeSession : startSession, {});
  return <form action={action} className="my-4 grid gap-3">
    <input type="hidden" name={sessionId ? "sessionId" : "dayId"} value={sessionId ?? dayId} />
    <Button type="submit" className="min-h-11" disabled={pending}>{pending ? "Guardando…" : label ?? (sessionId ? "Terminar sesión" : "Iniciar o reanudar este día")}</Button>
    {state.error && <p role="alert" className="text-destructive">{state.error}</p>}
    {state.success && <p role="status">{state.success}</p>}
  </form>;
}
