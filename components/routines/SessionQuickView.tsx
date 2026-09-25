"use client";

import Link from "next/link";
import { useState } from "react";

import { SessionReport } from "@/components/routines/SessionReport";
import { Badge, sessionBadgeVariant } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardTitle } from "@/components/ui/Card";
import { DetailPanel } from "@/components/ui/DetailDialog";
import { formatDate } from "@/lib/progress/vocabulary";
import { statusLabels } from "@/lib/routines/session-labels";
import type {
  PatientSession,
  SessionDetails,
} from "@/lib/routines/session-queries";

/**
 * Una sesión del historial. Con `report` —el informe de esa sesión, traído con
 * el resto de la página en una sola consulta— el clic abre lo que se registró
 * sin cambiar de pantalla (15.4); sin él, el enlace navega como siempre.
 *
 * La ruta `/pro/sessions/[sessionId]` sigue siendo la de verdad: es a donde
 * lleva el enlace sin JavaScript, con `Cmd`/`Ctrl` y desde el propio diálogo.
 *
 * Recibe los datos, no la tarjeta ya pintada: las props de un componente de
 * cliente viajan serializadas en el documento y un árbol de React pesa mucho
 * más que el dato con el que se construye.
 */
export function SessionQuickView({
  session,
  report,
  staff = false,
}: {
  session: PatientSession;
  report?: SessionDetails;
  staff?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const href = `${staff ? "/pro" : "/routine"}/sessions/${session.id}`;
  const name = session.routines?.name ?? "Sesión";

  return (
    <li
      onClickCapture={(event) => {
        if (
          !report ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        const link = (event.target as HTMLElement).closest("a[href]");
        if (link?.getAttribute("href") !== href) return;
        /*
          `stopPropagation` además de `preventDefault`: `next/link` navega
          desde su propio `onClick` y no mira si alguien ya frenó el evento,
          así que hay que cortarle el paso antes de que le llegue.
        */
        event.preventDefault();
        event.stopPropagation();
        setOpen(true);
      }}
    >
      <Card interactive padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <CardTitle className="min-w-0 break-words">
            <Link
              href={href}
              className="rounded-lg after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {name}
            </Link>
          </CardTitle>
          <Badge variant={sessionBadgeVariant(session.status)}>
            {statusLabels[session.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(session.performed_on)} · Día {session.routine_days?.day_number}
        </p>
      </Card>

      {report && (
        <DetailPanel
          title={name}
          description={`Sesión del ${formatDate(session.performed_on)}`}
          open={open}
          onClose={() => setOpen(false)}
          keepMounted={false}
        >
          <SessionReport session={report} />
          <ButtonLink variant="outline" className="justify-self-start" href={href}>
            Abrir la sesión completa
          </ButtonLink>
        </DetailPanel>
      )}
    </li>
  );
}
