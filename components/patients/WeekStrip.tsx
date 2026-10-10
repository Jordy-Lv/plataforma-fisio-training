import { cn } from "cn";

import type { WeekDay } from "@/lib/progress/patient-overview";

/*
  La semana en una fila, con hoy marcado.

  Es lo primero que ve el paciente al entrar, antes que cualquier menú: en qué
  día está y en cuáles ya entrenó (`docs/13-referencia-smart-fit.md`, 1.5). La
  portada anterior repetía los cuatro destinos de la barra inferior, que ya
  están a un dedo de distancia en cualquier pantalla.

  Sin `<form>` ni estado: es un Server Component. `/patient` es donde
  `verify-auth-screens` envía el único formulario de la pantalla —el de cerrar
  sesión del shell— y un segundo formulario aquí lo desplazaría.

  Siete celdas de 40 px caben en 375 px con holgura, así que la tira no necesita
  desplazamiento horizontal.

  Cada día se pinta según lo que pasó o va a pasar: relleno dorado si terminó
  una sesión, borde punteado si tiene una programada y aún no la hizo, apagado
  si todavía no llega. Hoy lleva además un anillo. La visita registrada por el
  equipo es otro dato y va como un punto debajo.
*/

/** Cómo se nombra cada día para quien usa lector de pantalla. */
const nombres = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

function describir(day: WeekDay, indice: number, isPlanned: boolean) {
  const cuando = day.isToday ? "Hoy" : nombres[indice];
  if (day.hasSession) return `${cuando} ${day.dayOfMonth}, sesión terminada`;
  if (isPlanned) return `${cuando} ${day.dayOfMonth}, sesión programada`;
  if (day.isFuture) return `${cuando} ${day.dayOfMonth}, aún no ha llegado`;
  if (day.hasAttendance)
    return `${cuando} ${day.dayOfMonth}, visita registrada`;
  return `${cuando} ${day.dayOfMonth}, sin sesión`;
}

export function WeekStrip({
  week,
  plannedDates = [],
}: {
  week: WeekDay[];
  /** Días con una sesión programada en el calendario (`YYYY-MM-DD`). */
  plannedDates?: string[];
}) {
  const planned = new Set(plannedDates);
  return (
    <ol aria-label="Tu semana" className="grid grid-cols-7 gap-1">
      {week.map((day, i) => {
        const isPlanned = planned.has(day.date) && !day.hasSession;
        return (
          <li key={day.date} className="grid justify-items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn(
                "text-xs font-medium",
                day.isToday
                  ? "font-semibold text-brand"
                  : "text-muted-foreground",
              )}
            >
              {day.isToday ? "Hoy" : day.initial}
            </span>
            <span
              aria-label={describir(day, i, isPlanned)}
              className={cn(
                "grid size-10 place-items-center rounded-xl text-sm font-bold tabular-nums",
                day.isToday &&
                  "shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--brand-bright)]",
                day.hasSession
                  ? "bg-brand-bright text-brand-bright-foreground"
                  : isPlanned
                    ? "border-[1.5px] border-dashed border-brand-bright"
                    : day.isFuture
                      ? "text-muted-foreground"
                      : "bg-muted text-foreground",
              )}
            >
              {day.dayOfMonth}
            </span>
            {/*
            La visita registrada por el equipo es un dato distinto de la sesión
            que el paciente completó, así que se marca aparte y no repinta la
            celda: un punto bajo el número, y nada cuando no la hay, para que la
            fila conserve la misma altura.
          */}
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                day.hasAttendance ? "bg-brand" : "bg-transparent",
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}
