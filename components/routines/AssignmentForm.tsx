"use client";

import { useActionState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/Card";
import { FormMessage } from "@/components/auth/FormParts";
import { assignRoutine } from "@/lib/routines/assignment-actions";
import { assignmentSchema } from "@/lib/routines/assignment";

/**
 * Es un `<form>` con aspecto de tarjeta, así que toma las clases de
 * `cardVariants` en vez de envolverse en `<Card>`. No puede mudarse a un
 * diálogo: `scripts/verify-routine-assignment.test.mjs` lo busca por
 * `name="patientId"` en el HTML del servidor (ADR-0008).
 */
export function AssignmentForm({ patientId }: { patientId: string }) {
  const [state, action, pending] = useActionState(assignRoutine, {});

  return (
    <form
      action={action}
      className={cn(cardVariants({ padding: "lg" }), "my-6 grid gap-3")}
      onSubmit={(event) => {
        if (!assignmentSchema.safeParse({ patientId }).success)
          event.preventDefault();
      }}
    >
      <input type="hidden" name="patientId" value={patientId} />
      <h2 className="text-xl font-semibold">Asignar según el perfil</h2>
      <p className="max-w-2xl leading-7 text-muted-foreground">
        Se aplican las reglas actuales y se retiran los ejercicios
        contraindicados. Una rutina completa reemplaza la activa del mismo tipo
        y conserva su historial. Si necesita ajustes, queda pendiente de
        revisión por el equipo.
      </p>
      <FormMessage state={state} />
      <Button type="submit" className="justify-self-start" disabled={pending}>
        {pending ? "Evaluando y asignando…" : "Evaluar y asignar rutina"}
      </Button>
    </form>
  );
}
