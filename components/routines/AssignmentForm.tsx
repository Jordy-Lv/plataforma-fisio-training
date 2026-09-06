"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { assignRoutine } from "@/lib/routines/assignment-actions";
import { assignmentSchema } from "@/lib/routines/assignment";

export function AssignmentForm({ patientId }: { patientId: string }) {
  const [state, action, pending] = useActionState(assignRoutine, {});
  return (
    <form action={action} className="my-6 rounded-2xl border border-border bg-surface p-5"
      onSubmit={(event) => { if (!assignmentSchema.safeParse({ patientId }).success) event.preventDefault(); }}>
      <input type="hidden" name="patientId" value={patientId} />
      <h2 className="text-xl font-semibold">Asignar según el perfil</h2>
      <p className="my-3 max-w-2xl leading-7 text-muted-foreground">
        Se aplican las reglas actuales y se retiran los ejercicios contraindicados.
        Una rutina completa reemplaza la activa del mismo tipo y conserva su historial.
        Si necesita ajustes, queda pendiente de revisión por el equipo.
      </p>
      {state.error && <p role="alert" className="my-3 text-destructive">{state.error}</p>}
      {state.success && <p role="status" className="my-3">{state.success}</p>}
      <Button type="submit" disabled={pending} className="min-h-11">
        {pending ? "Evaluando y asignando…" : "Evaluar y asignar rutina"}
      </Button>
    </form>
  );
}
