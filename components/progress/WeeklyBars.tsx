import { cn } from "cn";

import type { WeekCount } from "@/lib/progress/patient-progress";

/** «28/9»: el lunes de la semana en el formato más corto que se lee bien. */
function weekLabel(iso: string) {
  return `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
}

/*
  Sesiones terminadas por semana, en barras. Es HTML y no SVG: así las cifras y
  las fechas conservan su tamaño de letra a cualquier ancho, de 320 px a un
  monitor grande, en vez de encogerse con el dibujo.

  La semana en curso va en dorado lleno y las demás en dorado suave. En el
  teléfono solo se rotula una semana de cada dos para que las fechas no se pisen.
*/
export function WeeklyBars({ weeks }: { weeks: WeekCount[] }) {
  const max = Math.max(1, ...weeks.map((week) => week.completed));
  const total = weeks.reduce((sum, week) => sum + week.completed, 0);

  return (
    <figure className="grid gap-2">
      <div
        role="img"
        aria-label={`Sesiones terminadas por semana en las últimas ${weeks.length} semanas: ${total} en total`}
        className="grid h-40 grid-cols-12 items-end gap-1.5 border-b border-border sm:gap-2.5"
      >
        {weeks.map((week) => (
          <div key={week.weekStart} className="flex h-full flex-col justify-end">
            <span
              className={cn(
                "mb-1 text-center text-[11px] font-bold",
                week.completed === 0 ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {week.completed}
            </span>
            <span
              className={cn(
                "block rounded-t-md",
                week.isCurrent ? "bg-brand-bright" : "bg-brand-bright/35",
                week.completed === 0 && "bg-muted",
              )}
              style={{ height: week.completed === 0 ? 3 : `${(week.completed / max) * 78}%` }}
            />
          </div>
        ))}
      </div>
      <figcaption className="grid grid-cols-12 gap-1.5 text-center text-[10.5px] text-muted-foreground sm:gap-2.5 sm:text-[11px]">
        {weeks.map((week, index) => (
          <span
            key={week.weekStart}
            className={cn(
              week.isCurrent && "font-bold text-brand",
              index % 2 === 1 && !week.isCurrent && "invisible sm:visible",
            )}
          >
            {week.isCurrent ? "Hoy" : weekLabel(week.weekStart)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
