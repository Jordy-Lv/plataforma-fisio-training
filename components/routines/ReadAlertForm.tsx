"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { readAlert } from "@/lib/routines/alert-actions";
import type { RoutineActionState } from "@/lib/routines/schemas";
export function ReadAlertForm({ alertId }: { alertId: string }) {
  const [state, action, pending] = useActionState<RoutineActionState, FormData>(readAlert, {});
  return <form action={action} className="mt-3">
    <input type="hidden" name="alertId" value={alertId} />
    <Button className="min-h-11" variant="outline" disabled={pending}>{pending ? "Guardando…" : "Marcar como leída para mí"}</Button>
    {state.error && <p role="alert" className="mt-2 text-destructive">{state.error}</p>}
  </form>;
}
