import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import { cn } from "cn";

import type { WeekDay } from "@/lib/progress/patient-overview";

const nombres = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/*
  Cabecera de la portada del paciente, al estilo de la app de Smart Fit: sin
  tarjeta, sobre el brillo dorado que pinta la portada desde la barra superior.
  A la izquierda la racha (el fueguito se enciende con al menos una semana) y a
  la derecha los días; debajo, la meta semanal y el acceso al calendario.

  En el teléfono, la semana en curso (7 días). En escritorio, además, la
  siguiente (14 días), separada por una línea: así se ve lo que ya tiene
  programado.

  Cada número dice lo que pasó ese día: en dorado y en negrita si terminó una
  sesión (sin rellenar el círculo), borde punteado si la tiene programada,
  apagado si aún no llega; hoy va en negrita con anillo y la visita registrada
  es un punto debajo.
*/
export function WeekHeader({
  week,
  nextWeek,
  plannedDates,
  streakWeeks,
  goal,
}: {
  week: WeekDay[];
  /** La semana siguiente, solo para escritorio. */
  nextWeek: WeekDay[];
  plannedDates: string[];
  streakWeeks: number;
  goal: { total: number; completed: number; percent: number };
}) {
  const planned = new Set(plannedDates);
  const isLit = streakWeeks > 0;
  const days = [...week, ...nextWeek];

  return (
    <section aria-label="Tu semana" className="py-1 lg:py-2">
      <div className="grid grid-cols-[auto_1fr] items-center gap-3 lg:gap-8">
        <Link
          href="/routine/evolution"
          prefetch={false}
          aria-label={`Racha: ${streakWeeks} ${streakWeeks === 1 ? "semana seguida" : "semanas seguidas"}`}
          className="grid min-h-11 justify-items-center rounded-lg pr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span aria-hidden="true" className="flex items-center gap-1">
            <Flame
              className={cn(
                "size-7 lg:size-9",
                isLit ? "fill-brand-bright text-brand-bright" : "fill-muted text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "text-2xl font-extrabold tabular-nums lg:text-[32px]",
                isLit ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {streakWeeks}
            </span>
          </span>
          <span aria-hidden="true" className="mt-0.5 text-[13px] font-bold lg:text-sm">
            {streakWeeks === 1 ? "Semana" : "Semanas"}
          </span>
        </Link>

        <ol className="grid grid-cols-7 lg:grid-cols-14">
          {days.map((day, index) => {
            const isNextWeek = index >= 7;
            const isPlanned = planned.has(day.date) && !day.hasSession;
            const cuando = day.isToday ? "Hoy" : nombres[index % 7];
            const estado = day.hasSession
              ? "sesión terminada"
              : isPlanned
                ? "sesión programada"
                : day.isFuture
                  ? "aún no ha llegado"
                  : "sin sesión";
            return (
              <li
                key={day.date}
                className={cn(
                  "grid justify-items-center gap-1",
                  isNextWeek && "hidden lg:grid",
                  index === 7 && "lg:border-l lg:border-border",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-[13px] lg:text-sm",
                    day.isToday ? "font-extrabold text-foreground" : "font-semibold text-muted-foreground",
                  )}
                >
                  {day.isToday ? "Hoy" : day.initial}
                </span>
                <span
                  aria-label={`${cuando} ${day.dayOfMonth}, ${estado}`}
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-[15px] font-bold tabular-nums max-[359px]:size-7 max-[359px]:text-sm lg:size-10 lg:text-base",
                    day.isToday && "shadow-[0_0_0_2px_var(--background),0_0_0_3.5px_var(--brand-bright)]",
                    day.hasSession
                      ? "font-extrabold text-brand-bright"
                      : isPlanned
                        ? "border-[1.5px] border-dashed border-brand-bright text-foreground"
                        : day.isToday
                          ? "text-foreground"
                          : "text-muted-foreground",
                  )}
                >
                  {day.dayOfMonth}
                </span>
                <span
                  aria-hidden="true"
                  className={cn("size-1 rounded-full", day.hasAttendance ? "bg-brand" : "bg-transparent")}
                />
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-2 flex items-center gap-3 lg:mt-3">
        {goal.total > 0 ? (
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground lg:text-sm">
              <b className="text-foreground">
                {goal.completed} de {goal.total}
              </b>{" "}
              {goal.total === 1 ? "sesión" : "sesiones"} esta semana
            </p>
            <div
              role="progressbar"
              aria-label="Meta de la semana"
              aria-valuemin={0}
              aria-valuemax={goal.total}
              aria-valuenow={goal.completed}
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-brand-bright" style={{ width: `${goal.percent}%` }} />
            </div>
          </div>
        ) : (
          <p className="flex-1 text-xs text-muted-foreground lg:text-sm">
            Esta semana no tienes sesiones programadas.
          </p>
        )}
        <Link
          href="/routine/calendar"
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-0.5 whitespace-nowrap rounded-lg text-[13px] font-bold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:ml-auto lg:text-sm"
        >
          Calendario
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
