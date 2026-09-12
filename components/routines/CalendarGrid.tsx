import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "cn";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { calendarStatuses } from "@/components/routines/calendar-status";
import {
  calendarDateLabel,
  calendarHref,
  calendarRange,
  moveCalendar,
  type CalendarEvent,
  type CalendarView,
} from "@/lib/routines/calendar";

function DayNumber({
  day,
  today,
  isSelected,
}: {
  day: string;
  today: string;
  isSelected: boolean;
}) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-full text-sm",
        isSelected && "bg-brand text-brand-foreground",
        day === today && !isSelected && "ring-1 ring-brand",
      )}
    >
      {Number(day.slice(8))}
    </span>
  );
}

/**
 * Todos los enlaces de esta rejilla van sin precarga (KAN-19): comparte
 * pantalla con el formulario de «Programar una sesión», y con decenas de
 * enlaces precargados a la vez, cualquiera de ellos podía correr en carrera
 * con el envío del formulario y abortarlo a medio guardar — la acción sí
 * llegaba a la base, pero el botón se quedaba en «Programando…» para
 * siempre. Mismo criterio que SidebarNav, MobileNav, TabBar y el logo de
 * AppShell.
 */
export function CalendarGrid({
  events,
  date,
  today,
  view,
  base,
  emptyDayAction,
  routineHref,
  emptyDayHref,
}: {
  events: CalendarEvent[];
  date: string;
  today: string;
  view: CalendarView;
  base: string;
  emptyDayAction?: "schedule" | "assign";
  routineHref: (event: CalendarEvent) => string;
  emptyDayHref: (date: string) => string | null;
}) {
  const { dates } = calendarRange(date, view);
  const previous = moveCalendar(date, -1, view);
  const next = moveCalendar(date, 1, view);
  const emptyDayLabel =
    emptyDayAction === "assign" ? "Crear rutina" : "Programar rutina";
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const items = byDate.get(event.date) ?? [];
    items.push(event);
    byDate.set(event.date, items);
  }
  return (
    <section className="grid min-w-0 gap-4" aria-label="Calendario de rutinas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold first-letter:uppercase">
          {calendarDateLabel(date, { month: "long", year: "numeric" })}
        </h2>
        <nav aria-label="Vista del calendario" className="flex gap-1">
          {(["week", "month"] as const).map((mode) => (
            <ButtonLink
              key={mode}
              href={calendarHref(base, date, mode)}
              prefetch={false}
              variant={view === mode ? "default" : "outline"}
              aria-current={view === mode ? "page" : undefined}
            >
              {mode === "week" ? "Semana" : "Mes"}
            </ButtonLink>
          ))}
        </nav>
      </div>
      <nav
        aria-label="Cambiar fechas del calendario"
        className="flex items-center gap-2"
      >
        {previous >= "1900-01-01" && (
          <ButtonLink
            href={calendarHref(base, previous, view)}
            prefetch={false}
            variant="outline"
            aria-label={view === "month" ? "Mes anterior" : "Semana anterior"}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </ButtonLink>
        )}
        <ButtonLink
          href={calendarHref(base, today, view)}
          prefetch={false}
          variant="outline"
        >
          Hoy
        </ButtonLink>
        {next <= "2200-12-31" && (
          <ButtonLink
            href={calendarHref(base, next, view)}
            prefetch={false}
            variant="outline"
            aria-label={view === "month" ? "Mes siguiente" : "Semana siguiente"}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        )}
      </nav>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div
          className="grid grid-cols-7 border-b border-border"
          aria-hidden="true"
        >
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
            <span
              key={day}
              className="py-3 text-center text-xs font-medium sm:text-sm"
            >
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dates.map((day) => {
            const items = byDate.get(day) ?? [];
            const isSelected = day === date;
            const isOutsideMonth = day.slice(0, 7) !== date.slice(0, 7);
            const creationHref = items.length === 0 ? emptyDayHref(day) : null;
            if (creationHref)
              return (
                <Link
                  key={day}
                  href={creationHref}
                  prefetch={false}
                  data-calendar-date={day}
                  data-calendar-create
                  aria-current={isSelected ? "date" : undefined}
                  aria-label={`${emptyDayLabel} para ${calendarDateLabel(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
                  className={cn(
                    "grid min-h-20 min-w-0 content-start gap-1 border-b border-r border-border pb-1 hover:bg-brand-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:min-h-28 sm:p-2 [&:nth-child(7n)]:border-r-0",
                    isSelected && "bg-brand-soft",
                    isOutsideMonth &&
                      !isSelected &&
                      "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <span className="flex min-h-11 items-center justify-center sm:justify-start">
                    <DayNumber
                      day={day}
                      today={today}
                      isSelected={isSelected}
                    />
                  </span>
                  <span className="flex min-h-8 items-center justify-center gap-1 text-brand sm:justify-start">
                    <Plus className="size-4 shrink-0" aria-hidden="true" />
                    <span className="hidden truncate text-xs sm:inline">
                      {emptyDayAction === "assign" ? "Crear" : "Programar"}
                    </span>
                  </span>
                </Link>
              );
            return (
              <div
                key={day}
                className={cn(
                  "grid min-h-20 min-w-0 content-start gap-1 border-b border-r border-border pb-1 last:border-r-0 sm:min-h-28 sm:p-2 [&:nth-child(7n)]:border-r-0",
                  isSelected && "bg-brand-soft",
                  isOutsideMonth &&
                    !isSelected &&
                    "bg-muted/30 text-muted-foreground",
                )}
                data-calendar-date={day}
              >
                <Link
                  href={calendarHref(base, day, view)}
                  prefetch={false}
                  aria-current={isSelected ? "date" : undefined}
                  aria-label={`${calendarDateLabel(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${day === today ? ", hoy" : ""}${items.length ? `: ${items.length} ${items.length === 1 ? "rutina" : "rutinas"}` : ": sin sesiones"}`}
                  className="flex min-h-11 min-w-0 items-center justify-center rounded hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:justify-start"
                >
                  <DayNumber day={day} today={today} isSelected={isSelected} />
                </Link>
                <div className="grid min-w-0 gap-1">
                  {items.slice(0, 2).map((event) => {
                    const Icon = calendarStatuses[event.status].Icon;
                    return (
                      <Link
                        key={event.id}
                        href={routineHref(event)}
                        prefetch={false}
                        aria-label={`Ver rutina: ${event.title}, ${calendarDateLabel(day)}, ${calendarStatuses[event.status].label}`}
                        title={`${event.title} · ${calendarStatuses[event.status].label}`}
                        className={cn(
                          "flex min-h-11 min-w-0 items-center justify-center gap-1 rounded px-0.5 hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:justify-start sm:px-1",
                          calendarStatuses[event.status].className,
                        )}
                      >
                        <Icon
                          className="size-4 shrink-0 sm:size-3"
                          aria-hidden="true"
                        />
                        <span className="hidden truncate text-xs sm:inline">
                          {event.title}
                        </span>
                      </Link>
                    );
                  })}
                  {items.length > 2 && (
                    <Link
                      href={calendarHref(base, day, view)}
                      prefetch={false}
                      aria-label={`Ver las ${items.length} rutinas del ${calendarDateLabel(day)}`}
                      className="flex min-h-11 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    >
                      +{items.length - 2}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"
        aria-label="Estados del calendario"
      >
        {(
          [
            "completed",
            "pending",
            "scheduled",
            "in_progress",
            "abandoned",
          ] as const
        ).map((status) => {
          const Icon = calendarStatuses[status].Icon;
          return (
            <span key={status} className="inline-flex items-center gap-1.5">
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-4 rounded",
                  calendarStatuses[status].className,
                )}
              />
              {calendarStatuses[status].label}
            </span>
          );
        })}
      </div>
    </section>
  );
}
