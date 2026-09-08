import type { Metadata } from "next";

import { Workspace } from "@/components/auth/Workspace";
import { RoutineSummary } from "@/components/routines/RoutineSummary";
import { SessionHistory } from "@/components/routines/SessionHistory";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { patientRoutines } from "@/lib/routines/queries";
import { patientSessions } from "@/lib/routines/session-queries";

export const metadata: Metadata = {
  title: "Mis rutinas",
};

export default async function Page() {
  const actor = await requireRole("patient");
  const [routines, { sessions }] = await Promise.all([
    patientRoutines(actor.id, true),
    // Sin filtros: la primera página, que son las veinte sesiones más
    // recientes. El historial completo vive en la ficha del paciente.
    patientSessions(actor.id),
  ]);

  return (
    <Workspace
      title="Mis rutinas"
      name={actor.fullName}
      role="patient"
      description="Abre el día que vas a entrenar y registra cada ejercicio al terminarlo."
    >
      {routines.length === 0 ? (
        <EmptyState title="Tu profesional está preparando tu rutina">
          Cuando esté lista podrás consultar aquí los ejercicios y sus
          indicaciones.
        </EmptyState>
      ) : (
        <div className="grid gap-6">
          {routines.map((routine) => (
            <RoutineSummary key={routine.id} routine={routine} />
          ))}
        </div>
      )}
      <SessionHistory sessions={sessions} />
    </Workspace>
  );
}
