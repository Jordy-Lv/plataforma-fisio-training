import type { Metadata } from "next";
import { CalendarDays, History } from "lucide-react";

import { Workspace } from "@/components/auth/Workspace";
import { TodayRoutineDay } from "@/components/routines/TodayRoutineDay";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { formatWeekdayDate } from "@/lib/progress/vocabulary";
import { addDays, todayInBogota } from "@/lib/routines/calendar";
import { patientCalendar } from "@/lib/routines/calendar-queries";
import { patientRoutines } from "@/lib/routines/queries";

export const metadata: Metadata = {
  title: "Mi rutina",
};

/** Días hacia delante en los que se busca la próxima sesión si hoy no hay. */
const NEXT_HORIZON_DAYS = 14;

const calendarAction = (
  <ButtonLink
    href="/routine/calendar"
    size="lg"
    className="border-foreground/25 bg-transparent px-5 dark:border-foreground/25 dark:bg-transparent"
  >
    <CalendarDays aria-hidden="true" />
    Calendario
  </ButtonLink>
);

/*
  «Mi rutina»: solo lo que toca hoy (2026-10-04).

  Se pintan los días que el calendario programa para hoy, cada uno con sus
  ejercicios, las indicaciones de su profesional y el botón para hacerlo. La
  rutina se hace el día que toca: los demás días no tienen botón aquí, y sin
  nada programado hoy no se entrena (se dice cuál es la próxima sesión).

  El historial de sesiones vive aparte, en `/routine/history`, detrás del botón
  «Ver historial de sesiones».

  Contratos (`docs/11`): el `<form>` de cada día programado hoy lleva
  `value="<dayId>"` (`test:routines:sessions`), y sin rutina se dice «Tu
  profesional está preparando tu rutina» y con rutina, su nombre
  (`test:routines`).
*/
export default async function Page() {
  const actor = await requireRole("patient");
  const today = todayInBogota();
  const [routines, events] = await Promise.all([
    patientRoutines(actor.id, true),
    patientCalendar(actor.id, today, addDays(today, NEXT_HORIZON_DAYS), today),
  ]);

  const days = new Map(
    routines.flatMap((routine) => routine.routine_days.map((day) => [day.id, { day, routine }] as const)),
  );
  const todays = events
    .filter((event) => event.date === today && event.scheduleId && days.has(event.dayId))
    .map((event) => {
      const statuses = event.sessions.map((session) => session.status);
      const status = statuses.includes("in_progress")
        ? ("in_progress" as const)
        : statuses.includes("completed")
          ? ("completed" as const)
          : ("pending" as const);
      return { event, status, ...days.get(event.dayId)! };
    });
  const next = events.find((event) => event.date > today && event.scheduleId);

  return (
    <Workspace title="Rutinas" name={actor.fullName} role="patient" actions={calendarAction}>
      {routines.length === 0 ? (
        <EmptyState title="Tu profesional está preparando tu rutina">
          Cuando esté lista podrás consultar aquí los ejercicios y sus
          indicaciones.
        </EmptyState>
      ) : todays.length === 0 ? (
        <section className="grid gap-1.5 py-2">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">Hoy</p>
          <h2 className="text-2xl font-extrabold tracking-tight">No tienes sesión programada</h2>
          <p className="text-muted-foreground">
            Tu rutina se hace el día que la programa tu profesional.{" "}
            {next
              ? `Tu próxima sesión: ${formatWeekdayDate(next.date)} · ${next.title}.`
              : "Aún no tienes próximas sesiones en tu calendario."}
          </p>
          <p className="text-sm text-muted-foreground">
            {routines.length === 1 ? "Tu rutina: " : "Tus rutinas: "}
            {new Intl.ListFormat("es", { type: "conjunction" }).format(routines.map((routine) => routine.name))}
          </p>
        </section>
      ) : (
        <div className="grid gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
            Tu rutina del día de hoy
          </p>
          {todays.map(({ event, status, day, routine }) => (
            <TodayRoutineDay
              key={event.id}
              day={day}
              routineName={routine.name}
              kind={routine.kind}
              status={status}
            />
          ))}
        </div>
      )}

      <div className="mt-6">
        <ButtonLink href="/routine/history" variant="outline">
          <History aria-hidden="true" />
          Ver historial de sesiones
        </ButtonLink>
      </div>
    </Workspace>
  );
}
