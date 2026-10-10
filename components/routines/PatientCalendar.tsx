import Link from "next/link";
import { ChevronLeft, ChevronRight, Dumbbell, Flame, HeartPulse, Target } from "lucide-react";
import { cn } from "cn";

import { calendarStatuses } from "@/components/routines/calendar-status";
import {
  calendarDateLabel,
  calendarHref,
  calendarRange,
  moveCalendar,
  weeklyGoal,
  type CalendarEvent,
  type CalendarView,
} from "@/lib/routines/calendar";

const BASE = "/routine/calendar";
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

/** «Octubre, 2026»: el mes en el que cae la fecha, con mayúscula inicial. */
function monthTitle(date: string) {
  const month = calendarDateLabel(date, { month: "long" });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}, ${date.slice(0, 4)}`;
}

/**
 * El estado que se enseña: una sesión a medias de un día anterior ya no está
 * «en curso», se quedó sin terminar (la rutina se hace el día que toca).
 */
function shownStatus(event: CalendarEvent, today: string) {
  return event.status === "in_progress" && event.date < today
    ? { label: "Sin terminar", className: "bg-muted text-muted-foreground" }
    : calendarStatuses[event.status];
}

/** El color del punto de un evento en la cuadrícula del mes. */
function dotClass(event: CalendarEvent) {
  if (event.status === "completed") return "bg-brand-bright";
  if (event.status === "in_progress") return "bg-brand-bright ring-2 ring-brand-bright/40";
  if (event.status === "scheduled") return "border-[1.5px] border-brand-bright";
  if (event.status === "pending") return "border-[1.5px] border-warning";
  return "bg-muted-foreground/40";
}

/*
  Calendario del paciente, al estilo de la app de Smart Fit (2026-10-04).

  - Arriba, tres cifras: semanas seguidas entrenando, sesiones terminadas en el
    mes que se mira y la meta de la semana (`data-calendar-goal`, «N de M completadas»,
    contrato de `test:calendar`).
  - El mes con sus flechas, o la semana, y el cambio entre las dos vistas. En el
    mes cada día es un enlace que lo selecciona; hoy va en dorado, el elegido
    con contorno, y cada sesión es un punto (dorado lleno si la terminó, con
    contorno si está programada, ámbar si se quedó pendiente).
  - En la semana, cada día lista sus sesiones como enlaces con `title` a su día
    de rutina: es contrato (`[data-calendar-date="hoy"] a[title]`).
  - A la derecha en escritorio, debajo en el teléfono: lo que hay el día elegido.

  Sin formularios ni `data-calendar-schedule`/`data-calendar-create`: el
  paciente consulta, no programa.
*/
export function PatientCalendar({
  events,
  date,
  today,
  view,
  streakWeeks,
  monthSessions,
}: {
  events: CalendarEvent[];
  date: string;
  today: string;
  view: CalendarView;
  streakWeeks: number;
  /** Sesiones terminadas en el mes que se está mirando. */
  monthSessions: number;
}) {
  const { dates } = calendarRange(date, view);
  const month = date.slice(0, 7);
  const goal = weeklyGoal(events, date);
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) byDate.set(event.date, [...(byDate.get(event.date) ?? []), event]);
  const selected = byDate.get(date) ?? [];
  const dayHref = (event: CalendarEvent) =>
    `/routine/calendar/days/${event.dayId}?${new URLSearchParams({ date: event.date, view })}`;

  const stats = [
    {
      icon: Flame,
      value: String(streakWeeks),
      label: streakWeeks === 1 ? "Semana seguida" : "Semanas seguidas",
      lit: streakWeeks > 0,
    },
    {
      icon: Dumbbell,
      value: String(monthSessions),
      label: `Sesiones en ${calendarDateLabel(date, { month: "long" })}`,
      lit: monthSessions > 0,
    },
  ];

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8" data-routine-calendar>
      <div className="grid min-w-0 content-start gap-5">
        <ul className="grid grid-cols-3 gap-2.5">
          {stats.map((stat) => (
            <li
              key={stat.label}
              className="grid justify-items-center gap-0.5 rounded-2xl bg-foreground/6 px-2 py-3 text-center"
            >
              <span className="flex items-center gap-1.5">
                <stat.icon
                  aria-hidden="true"
                  className={cn(
                    "size-5",
                    stat.lit ? "fill-brand-bright/30 text-brand-bright" : "text-muted-foreground",
                  )}
                />
                <b className="text-2xl font-extrabold tabular-nums">{stat.value}</b>
              </span>
              <span className="text-xs text-muted-foreground sm:text-sm">{stat.label}</span>
            </li>
          ))}
          <li
            data-calendar-goal
            className="grid justify-items-center gap-0.5 rounded-2xl bg-foreground/6 px-2 py-3 text-center"
          >
            <span className="flex items-center gap-1.5">
              <Target aria-hidden="true" className="size-5 text-brand-bright" />
              <b className="text-2xl font-extrabold tabular-nums">
                {goal.total ? `${goal.completed}/${goal.total}` : "—"}
              </b>
            </span>
            <span className="text-xs text-muted-foreground sm:text-sm">
              {goal.total ? "Meta de la semana" : "Sin programación"}
            </span>
            {goal.total > 0 && (
              <span className="sr-only">
                {goal.completed} de {goal.total} completadas
              </span>
            )}
          </li>
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link
              href={calendarHref(BASE, moveCalendar(date, -1, view), view)}
              prefetch={false}
              aria-label={view === "week" ? "Semana anterior" : "Mes anterior"}
              className="grid size-11 place-items-center rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
            <h2 className="min-w-40 text-center text-xl font-extrabold">
              {view === "week"
                ? `${calendarDateLabel(dates[0], { day: "numeric", month: "short" })} – ${calendarDateLabel(dates[6], { day: "numeric", month: "short" })}`
                : monthTitle(date)}
            </h2>
            <Link
              href={calendarHref(BASE, moveCalendar(date, 1, view), view)}
              prefetch={false}
              aria-label={view === "week" ? "Semana siguiente" : "Mes siguiente"}
              className="grid size-11 place-items-center rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {date !== today && (
              <Link
                href={calendarHref(BASE, today, view)}
                prefetch={false}
                className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-bold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Hoy
              </Link>
            )}
            <div role="group" aria-label="Vista" className="inline-flex rounded-full bg-foreground/6 p-1">
              {(["month", "week"] as const).map((option) => (
                <Link
                  key={option}
                  href={calendarHref(BASE, date, option)}
                  prefetch={false}
                  aria-current={view === option ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-full px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    view === option
                      ? "bg-brand-bright text-brand-bright-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option === "month" ? "Mes" : "Semana"}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {view === "month" ? (
          <div>
            <ol aria-hidden="true" className="mb-1 grid grid-cols-7 text-center text-sm font-bold">
              {WEEKDAYS.map((day) => (
                <li key={day} className="py-2">
                  {day}
                </li>
              ))}
            </ol>
            <ol className="grid grid-cols-7 gap-y-1">
              {dates.map((day) => {
                const dayEvents = byDate.get(day) ?? [];
                const isToday = day === today;
                const isSelected = day === date;
                const isOtherMonth = !day.startsWith(month);
                return (
                  <li key={day} data-calendar-date={day} className="grid place-items-center">
                    <Link
                      href={calendarHref(BASE, day, "month")}
                      prefetch={false}
                      aria-current={isSelected ? "date" : undefined}
                      aria-label={`${calendarDateLabel(day)}${dayEvents.length ? `, ${dayEvents.length === 1 ? "1 sesión" : `${dayEvents.length} sesiones`}` : ""}`}
                      className={cn(
                        "grid h-14 w-full max-w-16 place-items-center content-center gap-1 rounded-2xl text-base font-bold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-16",
                        isToday
                          ? "bg-brand-bright text-brand-bright-foreground"
                          : isSelected
                            ? "ring-2 ring-inset ring-brand-bright"
                            : "hover:bg-muted",
                        !isToday && (isOtherMonth ? "text-muted-foreground/40" : day < today ? "text-muted-foreground" : "text-foreground"),
                      )}
                    >
                      <span>{isToday ? "Hoy" : Number(day.slice(8, 10))}</span>
                      <span className="flex h-1.5 gap-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <span
                            key={event.id}
                            className={cn(
                              "size-1.5 rounded-full",
                              isToday ? "bg-brand-bright-foreground" : dotClass(event),
                            )}
                          />
                        ))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full bg-brand-bright" />
                Completada
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full border-[1.5px] border-brand-bright" />
                Programada
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full border-[1.5px] border-warning" />
                Pendiente
              </li>
            </ul>
          </div>
        ) : (
          <ol className="grid gap-2 lg:grid-cols-7">
            {dates.map((day, index) => {
              const dayEvents = byDate.get(day) ?? [];
              const isToday = day === today;
              return (
                <li
                  key={day}
                  data-calendar-date={day}
                  className={cn(
                    "grid min-h-16 grid-cols-[3.5rem_1fr] items-start gap-3 rounded-2xl p-2.5 lg:grid-cols-1 lg:content-start lg:gap-2",
                    isToday ? "bg-brand-bright/12 ring-1 ring-brand-bright" : "bg-foreground/4",
                  )}
                >
                  <Link
                    href={calendarHref(BASE, day, "week")}
                    prefetch={false}
                    aria-current={day === date ? "date" : undefined}
                    className="grid justify-items-center rounded-xl py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className={cn("text-xs font-bold", isToday ? "text-brand" : "text-muted-foreground")}>
                      {isToday ? "Hoy" : WEEKDAYS[index]}
                    </span>
                    <span className="text-lg font-extrabold tabular-nums">{Number(day.slice(8, 10))}</span>
                  </Link>
                  <div className="grid min-w-0 gap-1.5">
                    {dayEvents.length === 0 ? (
                      <span className="py-2 text-xs text-muted-foreground">Descanso</span>
                    ) : (
                      dayEvents.map((event) => (
                        <Link
                          key={event.id}
                          href={dayHref(event)}
                          prefetch={false}
                          title={event.title}
                          className="grid gap-0.5 rounded-xl border border-border bg-surface px-2.5 py-2 text-xs hover:border-brand-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <b className="truncate text-[13px]">{event.title}</b>
                          <span className={cn("w-fit rounded-full px-1.5 py-0.5 text-[11px] font-bold", shownStatus(event, today).className)}>
                            {shownStatus(event, today).label}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <section aria-label="Detalle del día seleccionado" data-calendar-detail className="grid content-start gap-3 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <h2 className="text-2xl font-extrabold first-letter:uppercase">
          {date === today ? "Hoy" : calendarDateLabel(date)}
        </h2>
        {selected.length === 0 ? (
          <p className="text-muted-foreground">
            Ningún entrenamiento programado en esta fecha.
          </p>
        ) : (
          selected.map((event) => {
            const Icon = event.kind === "physio" ? HeartPulse : Dumbbell;
            const status = shownStatus(event, today);
            return (
              <article key={event.id} className="grid gap-3 rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-start gap-2 text-lg font-bold">
                      <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-bright" />
                      <span className="break-words">{event.title}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {event.routineName} · {event.kind === "physio" ? "Fisioterapia" : "Entrenamiento"}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", status.className)}>
                    {status.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={dayHref(event)}
                    prefetch={false}
                    className="inline-flex min-h-10 items-center rounded-full bg-brand-bright px-4 text-sm font-bold text-brand-bright-foreground hover:bg-brand-bright/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Ver rutina
                  </Link>
                  {event.sessions.map((session, index) => (
                    <Link
                      key={session.id}
                      href={`/routine/sessions/${session.id}`}
                      prefetch={false}
                      className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-bold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {session.status === "in_progress" && event.date === today ? "Continuar sesión" : "Ver registro"}
                      {event.sessions.length > 1 ? ` ${index + 1}` : ""}
                    </Link>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
