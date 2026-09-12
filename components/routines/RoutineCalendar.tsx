import { Dumbbell, HeartPulse, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarGrid } from "@/components/routines/CalendarGrid";
import { calendarStatuses } from "@/components/routines/calendar-status";
import { CancelCalendarSchedule } from "@/components/routines/CalendarForms";
import {
  calendarAssignmentHref,
  calendarDateLabel,
  calendarHref,
  isSchedulingDate,
  weeklyGoal,
  type CalendarEvent,
  type CalendarView,
} from "@/lib/routines/calendar";

export function RoutineCalendar({
  events,
  date,
  today,
  view,
  base,
  patientId,
  isStaff = false,
  emptyDayAction,
}: {
  events: CalendarEvent[];
  date: string;
  today: string;
  view: CalendarView;
  base: string;
  patientId: string;
  isStaff?: boolean;
  emptyDayAction?: "schedule" | "assign";
}) {
  const goal = weeklyGoal(events, date);
  const selected = events.filter((event) => event.date === date);
  const routineHref = (event: CalendarEvent) =>
    isStaff
      ? `/pro/routines/${patientId}?${new URLSearchParams({ calendarDate: event.date, calendarView: view })}#routine-day-${event.dayId}`
      : `/routine/calendar/days/${event.dayId}?${new URLSearchParams({ date: event.date, view })}`;
  const emptyDayHref = (day: string) => {
    if (!isStaff || !emptyDayAction || !isSchedulingDate(day, today))
      return null;
    return emptyDayAction === "schedule"
      ? `${calendarHref(base, day, view)}#calendar-schedule`
      : calendarAssignmentHref(patientId, day, view);
  };
  const selectedEmptyHref = emptyDayHref(date);
  const emptyDayLabel =
    emptyDayAction === "assign" ? "Crear rutina" : "Programar rutina";
  let emptyMessage =
    "Selecciona otra fecha para consultar tus rutinas. Tu profesional programará aquí tus próximas sesiones.";
  if (isStaff) {
    emptyMessage =
      "Selecciona una fecha desde hoy y hasta un año. El paciente debe estar activo para programar rutinas.";
    if (selectedEmptyHref) {
      emptyMessage =
        emptyDayAction === "assign"
          ? "Primero crea y asigna una rutina al paciente. Después podrás programarla para esta fecha."
          : "Programa un día de su rutina para esta fecha.";
    }
  }

  return (
    <div className="grid min-w-0 gap-6" data-routine-calendar>
      <CalendarGrid
        events={events}
        date={date}
        today={today}
        view={view}
        base={base}
        emptyDayAction={emptyDayAction}
        routineHref={routineHref}
        emptyDayHref={emptyDayHref}
      />

      <Card className="grid gap-3" data-calendar-goal>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Meta semanal</h2>
          <span className="text-sm tabular-nums">
            {goal.total
              ? `${goal.completed} de ${goal.total} completadas`
              : "Sin programación"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {calendarDateLabel(goal.start, { day: "numeric", month: "short" })} –{" "}
          {calendarDateLabel(goal.end, { day: "numeric", month: "short" })}
          {goal.total > 0 &&
            ` · Completar ${goal.total} ${goal.total === 1 ? "sesión programada" : "sesiones programadas"}`}
        </p>
        {goal.total > 0 ? (
          <div
            role="progressbar"
            aria-label="Cumplimiento de las sesiones programadas de la semana"
            aria-valuenow={goal.completed}
            aria-valuemin={0}
            aria-valuemax={goal.total}
            className="h-3 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${goal.percent}%` }}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isStaff
              ? "Programa las sesiones de esta semana para definir la meta."
              : "Tu profesional definirá la meta al programar las sesiones de esta semana."}
          </p>
        )}
      </Card>

      <section
        className="grid gap-3"
        aria-label="Detalle del día seleccionado"
        data-calendar-detail
      >
        <h2 className="text-lg font-semibold first-letter:uppercase">
          {calendarDateLabel(date)}
        </h2>
        {selected.length === 0 ? (
          <EmptyState
            title="No hay sesiones para este día"
            action={
              selectedEmptyHref ? (
                // Sin precarga (KAN-19): comparte pantalla con el formulario
                // de «Programar una sesión» y precargada corría en carrera
                // con el envío en curso, abortándolo a medio guardar.
                <ButtonLink href={selectedEmptyHref} prefetch={false}>
                  <Plus className="size-4" aria-hidden="true" />
                  {emptyDayLabel}
                </ButtonLink>
              ) : undefined
            }
          >
            {emptyMessage}
          </EmptyState>
        ) : (
          selected.map((event) => {
            const Icon = event.kind === "physio" ? HeartPulse : Dumbbell;
            return (
              <Card
                key={event.id}
                className="grid gap-4 border-l-4 border-l-brand"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-start gap-2 text-lg font-semibold">
                      <Icon
                        aria-hidden="true"
                        className="mt-1 size-5 shrink-0 text-brand"
                      />
                      <span className="break-words">{event.title}</span>
                    </h3>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {event.routineName} ·{" "}
                      {event.kind === "physio"
                        ? "Fisioterapia"
                        : "Entrenamiento"}
                    </p>
                  </div>
                  <Badge variant={calendarStatuses[event.status].variant}>
                    {calendarStatuses[event.status].label}
                  </Badge>
                </div>
                {!event.scheduleId && (
                  <p className="text-sm text-muted-foreground">
                    Sesión realizada sin programación previa; no suma a la meta
                    de sesiones programadas.
                  </p>
                )}
                <div className="flex flex-wrap items-start gap-3">
                  <ButtonLink
                    variant="default"
                    href={routineHref(event)}
                    prefetch={false}
                  >
                    Ver rutina
                  </ButtonLink>
                  {event.sessions.map((session, index) => (
                    <ButtonLink
                      key={session.id}
                      variant="outline"
                      href={`${isStaff ? "/pro" : "/routine"}/sessions/${session.id}`}
                      prefetch={false}
                    >
                      {session.status === "in_progress" && !isStaff
                        ? "Continuar sesión"
                        : "Ver registro"}
                      {event.sessions.length > 1 ? ` ${index + 1}` : ""}
                    </ButtonLink>
                  ))}
                  {isStaff &&
                    event.scheduleId &&
                    event.sessions.length === 0 &&
                    date >= today && (
                      <CancelCalendarSchedule
                        patientId={patientId}
                        scheduleId={event.scheduleId}
                      />
                    )}
                </div>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
