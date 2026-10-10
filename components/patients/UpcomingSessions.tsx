import Link from "next/link";
import { cn } from "cn";

import type { AgendaDay } from "@/lib/progress/patient-agenda";

const weekdayFormat = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  timeZone: "UTC",
});

/** «lun», «mié»: la abreviatura del día, sin el punto que añade `Intl`. */
function weekday(date: string) {
  return weekdayFormat.format(new Date(`${date}T00:00:00Z`)).replace(".", "");
}

/*
  Las próximas sesiones programadas, debajo de la semana en la portada del
  paciente: qué día, qué toca y si es entreno o fisio. Cada una lleva a su día
  de rutina, el mismo destino que el calendario. Solo lectura, sin formularios
  (`docs/11`).
*/
export function UpcomingSessions({ sessions }: { sessions: AgendaDay[] }) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tienes más sesiones programadas en las próximas dos semanas.
      </p>
    );
  }

  return (
    <ol className="grid">
      {sessions.map((session) => (
        <li
          key={`${session.date}-${session.dayId}`}
          className="border-t border-border first:border-t-0"
        >
          <Link
            href={`/routine/calendar/days/${session.dayId}?${new URLSearchParams({ date: session.date, view: "week" })}`}
            prefetch={false}
            className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 rounded-lg py-1.5 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="grid justify-items-center rounded-[10px] bg-muted py-1 leading-none">
              <small className="text-[11px] font-bold uppercase text-muted-foreground">
                {weekday(session.date)}
              </small>
              <b className="mt-0.5 text-base">{Number(session.date.slice(8, 10))}</b>
            </span>
            <span className="min-w-0">
              <b className="block truncate text-[14.5px]">{session.title}</b>
              <span className="block truncate text-[12.5px] text-muted-foreground">
                {session.routineName}
              </span>
            </span>
            <span
              className={cn(
                // Sin relleno: texto en el color del texto (blanco en oscuro) y el
                // contorno en el color de la especialidad.
                "rounded-full border-[1.5px] px-2 py-0.5 text-[11.5px] font-bold text-foreground",
                session.kind === "physio" ? "border-info" : "border-brand-bright",
              )}
            >
              {session.kind === "physio" ? "Fisio" : "Entreno"}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
