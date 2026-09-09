"use client";

import { useActionState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { FormMessage } from "@/components/auth/FormParts";
import { assignRoutine } from "@/lib/routines/assignment-actions";
import { assignmentSchema } from "@/lib/routines/assignment";
import { calendarDateLabel } from "@/lib/routines/calendar";

/**
 * Es un `<form>` con aspecto de tarjeta, así que toma las clases de
 * `cardVariants` en vez de envolverse en `<Card>`. No puede mudarse a un
 * diálogo: `scripts/verify-routine-assignment.test.mjs` lo busca por
 * `name="patientId"` en el HTML del servidor (ADR-0008).
 */
export function AssignmentForm({
  patientId,
  calendarContext,
}: {
  patientId: string;
  calendarContext?: { date: string; returnHref: string };
}) {
  const [state, action, pending] = useActionState(assignRoutine, {});

  return (
    <form
      action={action}
      id="assign-routine"
      className={cn(
        cardVariants({ padding: "lg" }),
        "my-6 grid scroll-mt-24 gap-3",
      )}
      onSubmit={(event) => {
        if (!assignmentSchema.safeParse({ patientId }).success)
          event.preventDefault();
      }}
    >
      <input type="hidden" name="patientId" value={patientId} />
      <h2 className="text-xl font-semibold">Asignar según el perfil</h2>
      {calendarContext && (
        <p className="text-sm font-medium text-brand">
          Seleccionaste el{" "}
          {calendarDateLabel(calendarContext.date, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . Después de asignar la rutina, vuelve al calendario para programar
          sus ejercicios en esa fecha.
        </p>
      )}
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
      {calendarContext && (
        <ButtonLink
          variant="outline"
          className="justify-self-start"
          href={calendarContext.returnHref}
        >
          Volver al calendario para programar
        </ButtonLink>
      )}
    </form>
  );
}
