import type { SessionPain } from "@/lib/progress/patient-progress";
import { formatShortDate } from "@/lib/progress/vocabulary";

const W = 600;
const H = 180;

/** Los puntos de una serie de 0 a 10; las sesiones sin ese dato no se dibujan. */
function polyline(sessions: SessionPain[], read: (s: SessionPain) => number | null) {
  return sessions
    .map((session, index) => {
      const value = read(session);
      if (value === null) return null;
      const x = sessions.length === 1 ? W / 2 : (index * W) / (sessions.length - 1);
      return `${x},${H - (value / 10) * H}`;
    })
    .filter(Boolean)
    .join(" ");
}

/*
  Dolor y esfuerzo percibido, sesión a sesión, en la misma escala de 0 a 10.
  Las líneas son SVG estirado al ancho (`preserveAspectRatio="none"`, con trazo
  que no se deforma); los rótulos van en HTML alrededor, para que no se encojan
  en el teléfono.

  Se lee junto: si el esfuerzo sube y el dolor baja o se mantiene, el
  entrenamiento va bien; si el dolor sube, es lo que tiene que ver su
  profesional.
*/
export function PainEffortChart({ sessions }: { sessions: SessionPain[] }) {
  if (sessions.length < 2) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        {sessions.length === 0
          ? "Aún no has registrado dolor ni esfuerzo. Al marcar cada ejercicio en la sesión, dinos cuánto te costó y si te dolió: aquí verás cómo cambia."
          : "Con una sola sesión registrada aún no hay línea. Registra la siguiente y verás cómo evoluciona."}
      </p>
    );
  }

  const pain = polyline(sessions, (s) => s.pain);
  const effort = polyline(sessions, (s) => s.effort);
  const first = sessions[0];
  const last = sessions.at(-1)!;

  return (
    <figure className="grid gap-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-[3px] w-4 rounded-full bg-pain-high" />
          Dolor
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-[3px] w-4 rounded-full bg-brand-bright" />
          Esfuerzo
        </li>
      </ul>
      <div className="grid grid-cols-[1.5rem_1fr] gap-2">
        <div aria-hidden="true" className="flex h-44 flex-col justify-between text-right text-[11px] text-muted-foreground">
          <span className="-translate-y-1.5">10</span>
          <span>5</span>
          <span className="translate-y-1.5">0</span>
        </div>
        <svg
          role="img"
          aria-label={`Dolor y esfuerzo en tus últimas ${sessions.length} sesiones, de 0 a 10`}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-44 w-full overflow-visible"
        >
          {[0, H / 2, H].map((y) => (
            <line
              key={y}
              x1={0}
              x2={W}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeDasharray={y === H ? undefined : "4 5"}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {effort && (
            <polyline
              points={effort}
              className="fill-none stroke-brand-bright"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {pain && (
            <polyline
              points={pain}
              className="fill-none stroke-pain-high"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>
      <figcaption className="ml-8 flex justify-between text-[11px] text-muted-foreground">
        <span>{formatShortDate(first.performedOn)}</span>
        <span>{formatShortDate(last.performedOn)}</span>
      </figcaption>
    </figure>
  );
}
