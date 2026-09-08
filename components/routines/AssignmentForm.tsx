"use client";

import { useActionState } from "react";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/auth/FormParts";
import { assignRoutine } from "@/lib/routines/assignment-actions";
import { assignmentSchema } from "@/lib/routines/assignment";

/**
 * Es un `<form>` con aspecto de tarjeta, así que toma las clases de
 * `cardVariants` en vez de envolverse en `<Card>`. No puede mudarse a un
 * diálogo: `scripts/verify-routine-assignment.test.mjs` lo busca por
 * `name="patientId"` en el HTML del servidor (ADR-0008).
 *
 * `replacesActive` lo pasa la página cuando el paciente ya tiene una rutina
 * activa: entonces asignar la reemplaza, así que el envío pide confirmación
 * con `ConfirmSubmit` (sin añadir ningún campo al formulario). Sin rutina
 * activa el botón es el de siempre.
 */
export function AssignmentForm({
  patientId,
  replacesActive = false,
}: {
  patientId: string;
  replacesActive?: boolean;
}) {
  // `useActionState` se conserva: `verify-routine-assignment.test.mjs` lee la
  // respuesta del envío buscando «Rutina asignada. El paciente ya puede
  // consultarla», que sale de `state.success`. La espera del botón la lleva
  // `SubmitButton` con `useFormStatus`.
  const [state, action] = useActionState(assignRoutine, {});

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
      {replacesActive ? (
        <ConfirmSubmit
          className="justify-self-start"
          pendingLabel="Evaluando y asignando…"
          tone="default"
          title="¿Reemplazar la rutina activa?"
          description="Este paciente ya tiene una rutina activa. Al evaluar y asignar, la rutina completa del mismo tipo se reemplaza por la nueva propuesta y su historial de sesiones se conserva."
          confirmLabel="Evaluar y asignar"
        >
          Evaluar y asignar rutina
        </ConfirmSubmit>
      ) : (
        <SubmitButton
          className="justify-self-start"
          pendingLabel="Evaluando y asignando…"
        >
          Evaluar y asignar rutina
        </SubmitButton>
      )}
    </form>
  );
}
