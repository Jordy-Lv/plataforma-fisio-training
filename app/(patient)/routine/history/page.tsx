import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { Workspace } from "@/components/auth/Workspace";
import { SessionHistory } from "@/components/routines/SessionHistory";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { requireRole } from "@/lib/auth/session";
import { patientSessions } from "@/lib/routines/session-queries";

export const metadata: Metadata = {
  title: "Historial de sesiones",
};

/*
  El historial de sesiones del paciente, fuera de «Mi rutina» (2026-10-04): allí
  solo queda lo de hoy y se llega aquí con «Ver historial de sesiones». Vive
  bajo `/routine`, así que la pestaña activa sigue siendo «Mi rutina».

  La primera página: las veinte sesiones más recientes. Sin formularios.
*/
export default async function Page() {
  const actor = await requireRole("patient");
  const { sessions } = await patientSessions(actor.id);

  return (
    <Workspace
      title="Historial"
      name={actor.fullName}
      role="patient"
      actions={
        <ButtonLink
          href="/routine"
          size="lg"
          className="border-foreground/25 bg-transparent px-5 dark:border-foreground/25 dark:bg-transparent"
        >
          <ArrowLeft aria-hidden="true" />
          Mi rutina de hoy
        </ButtonLink>
      }
    >
      <SessionHistory sessions={sessions} className="" />
    </Workspace>
  );
}
