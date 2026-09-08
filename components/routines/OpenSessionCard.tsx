import Link from "next/link";
import { PlayCircle } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatDate } from "@/lib/progress/vocabulary";

/**
 * La sesión que el paciente dejó a medias, con el acceso para reanudarla.
 *
 * Va arriba del todo en las dos pantallas donde puede aparecer —la portada y
 * `/routine`— porque es lo único que hay que hacer antes que cualquier otra
 * cosa: una sesión abierta bloquea empezar otra, y hasta ahora había que
 * descubrirlo bajando hasta el día correspondiente.
 */
export function OpenSessionCard({
  session,
}: {
  session: {
    id: string;
    performedOn: string;
    routineName: string;
    dayTitle: string;
  };
}) {
  return (
    <Card interactive padding="lg">
      <CardTitle className="flex items-center gap-3 text-lg">
        <PlayCircle aria-hidden="true" className="size-5 shrink-0 text-brand" />
        {/*
          El enlace se estira sobre toda la tarjeta con `after:inset-0`, así que
          el objetivo táctil es la tarjeta entera y no solo el texto del título.
        */}
        <Link
          href={`/routine/sessions/${session.id}`}
          className="rounded-lg after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Continuar la sesión de {session.dayTitle}
        </Link>
      </CardTitle>
      <CardDescription>
        {session.routineName} · empezada el {formatDate(session.performedOn)}.
        Quedó sin terminar.
      </CardDescription>
    </Card>
  );
}
