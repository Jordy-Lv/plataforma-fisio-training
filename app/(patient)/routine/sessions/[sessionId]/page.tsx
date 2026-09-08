import { notFound } from "next/navigation";

import { Workspace } from "@/components/auth/Workspace";
import { SessionProgress } from "@/components/routines/SessionProgress";
import { SessionReport } from "@/components/routines/SessionReport";
import { SessionItemForm } from "@/components/routines/SessionItemForm";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { requireRole } from "@/lib/auth/session";
import { closeSessionSchema } from "@/lib/routines/schemas";
import {
  executionExercises,
  replacementExercises,
  sessionDetails,
} from "@/lib/routines/session-queries";

export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const actor = await requireRole("patient");
  const parsed = closeSessionSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const session = await sessionDetails(parsed.data.sessionId);
  if (!session) notFound();

  const items =
    session.status === "in_progress"
      ? await executionExercises(session.routine_day_id)
      : [];
  // Una sola consulta del catálogo por sesión, acotada a los grupos musculares
  // de los ejercicios del día (8.6). Antes se traían las 868 filas enteras:
  // 1.486 `<option>` y 758 KB viajando al teléfono a mitad de entrenamiento.
  const catalog =
    items.length > 0
      ? await replacementExercises(
          items.flatMap((item) => item.exercises?.muscle_groups ?? []),
        )
      : [];
  const logs = new Map(
    session.session_logs.map((log) => [log.routine_item_id, log]),
  );
  // El primer ejercicio sin registrar abre su bloque: es lo que el paciente
  // viene a hacer (8.3). Se resuelve aquí, en el servidor, para que la pantalla
  // no dé un salto al hidratar.
  const primeroPendiente = items.find((item) => !logs.has(item.id))?.id;

  return (
    <Workspace
      title={session.routines?.name ?? "Mi sesión"}
      name={actor.fullName}
      role="patient"
      description={`Día ${session.routine_days?.day_number} · ${session.routine_days?.title} · ${session.performed_on}`}
      actions={
        <ButtonLink href="/routine">
          Mis rutinas
        </ButtonLink>
      }
    >
      {session.status === "in_progress" ? (
        <>
          {/*
            La banda con el avance, los accesos a cada ejercicio y el cierre.
            Sustituye al párrafo de «N de M registrados» y al botón que estaba
            al final de la pantalla, a metro y medio de desplazamiento (8.2).
          */}
          <SessionProgress
            sessionId={session.id}
            items={items.map((item) => ({
              id: item.id,
              name: item.exercises?.name ?? "Ejercicio",
              done: logs.has(item.id),
            }))}
          />
          <p className="mb-5 leading-7 text-muted-foreground">
            Cada registro se guarda al confirmarlo.
          </p>
          <div className="grid gap-5">
            {items.map((item) => (
              <SessionItemForm
                key={`${item.id}-${JSON.stringify(logs.get(item.id) ?? null)}`}
                sessionId={session.id}
                item={item}
                log={logs.get(item.id)}
                catalog={catalog}
                defaultOpen={item.id === primeroPendiente}
              />
            ))}
          </div>
        </>
      ) : (
        <SessionReport session={session} />
      )}
    </Workspace>
  );
}
