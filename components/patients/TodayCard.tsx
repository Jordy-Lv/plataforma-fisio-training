import Link from "next/link";
import { Check, Info, Minus, Play } from "lucide-react";
import { cn } from "cn";

import { addDays } from "@/lib/routines/calendar";
import { formatShortDate, formatWeekdayDate, today } from "@/lib/progress/vocabulary";
import type { OpenSession } from "@/lib/progress/patient-overview";
import type {
  ExercisePreview,
  OpenSessionProgress,
  PatientAgenda,
  SessionExercise,
} from "@/lib/progress/patient-agenda";

/*
  Lo primero que ve el paciente bajo su semana: qué le toca hoy y el botón para
  hacerlo.

  Una sola de cinco situaciones, por orden de prioridad:

  1. Dejó una sesión a medias → «Tu rutina del día de hoy», sus ejercicios con lo ya
     marcado y «Continuar sesión».
  2. Tiene algo programado hoy → «Hoy te toca», los ejercicios del día y
     «Empezar sesión», que lleva al día de rutina, donde se inicia (aquí no hay
     formulario: `/patient` no puede ganar ninguno, `docs/11`).
  3. Hoy ya entrenó → «Hoy ya entrenaste».
  4. No tiene rutina → «Aún no tienes una rutina».
  5. Descansa → «Hoy descansas» y cuál es su próxima sesión.

  No es una tarjeta: va suelta sobre el fondo y alineada a la izquierda, como en
  la app de Smart Fit, en el teléfono y en escritorio. La etiqueta del estado va
  en letras doradas; los ejercicios, en una columna de filas bajas en el
  teléfono y en dos en escritorio; «Ver mi rutina» junto al botón principal y,
  si tiene una zona en cuidado, el recordatorio de registrar el dolor.
*/

/** Cuántos ejercicios caben en la vista previa antes de «+N más». */
const PREVIEW_LIMIT = 4;

function volume(sets: number | null, reps: number | null) {
  if (sets && reps) return `${sets} × ${reps}`;
  if (sets) return sets === 1 ? "1 serie" : `${sets} series`;
  if (reps) return `${reps} reps`;
  return null;
}
export function TodayCard({
  agenda,
  openSession,
  hasRoutine,
  careZone,
  openProgress = null,
}: {
  agenda: PatientAgenda;
  openSession: OpenSession | null;
  /** Avance de la sesión a medias; solo cuando `openSession` existe. */
  openProgress?: OpenSessionProgress | null;
  hasRoutine: boolean;
  /** La zona en cuidado más antigua, ya rotulada («rodilla»), o `null`. */
  careZone: string | null;
}) {
  const kindLabel = (kind: "training" | "physio") =>
    kind === "physio" ? "Fisioterapia" : "Entrenamiento";

  let tag: string;
  let title: string;
  let detail: string | null = null;
  let chips: string[] = [];
  let action: { href: string; label: string; isPrimary: boolean } | null = null;
  /*
    La vista previa: con una sesión a medias, sus ejercicios con lo ya marcado
    (y la ventana arranca justo antes del siguiente, para que se vea por dónde
    va); si hoy le toca algo nuevo, los primeros del día.
  */
  let preview: (SessionExercise | ExercisePreview)[] = [];
  let hiddenCount = 0;
  let nextIndex = -1;
  let firstNumber = 1;
  if (openSession && openProgress) {
    const all = openProgress.exercises;
    nextIndex = all.findIndex((exercise) => exercise.status === null);
    const start = Math.max(0, Math.min(nextIndex - 1, all.length - PREVIEW_LIMIT));
    preview = all.slice(start, start + PREVIEW_LIMIT);
    hiddenCount = all.length - preview.length;
    nextIndex = nextIndex - start;
    firstNumber = start + 1;
  } else if (agenda.today) {
    preview = agenda.today.exercises;
    hiddenCount = agenda.today.exerciseCount - preview.length;
  }

  if (openSession) {
    tag = "Tu rutina del día de hoy";
    title = openSession.dayTitle;
    // Corto: la rutina y, solo si no la empezó hoy, desde cuándo.
    const hoy = today();
    const since =
      openSession.performedOn === hoy
        ? null
        : openSession.performedOn === addDays(hoy, -1)
          ? "ayer"
          : `desde el ${formatShortDate(openSession.performedOn)}`;
    detail = since ? `${openSession.routineName} · ${since}` : openSession.routineName;
    if (openProgress)
      chips = [
        `${openProgress.logged} de ${openProgress.total} ${openProgress.total === 1 ? "ejercicio" : "ejercicios"}`,
      ];
    action = {
      href: `/routine/sessions/${openSession.id}`,
      label: "Continuar sesión",
      isPrimary: true,
    };
  } else if (agenda.today) {
    tag = "Hoy te toca";
    title = agenda.today.title;
    detail = agenda.today.routineName;
    chips = [
      agenda.today.exerciseCount === 1
        ? "1 ejercicio"
        : `${agenda.today.exerciseCount} ejercicios`,
      kindLabel(agenda.today.kind),
    ];
    action = {
      href: `/routine/calendar/days/${agenda.today.dayId}?${new URLSearchParams({ date: agenda.today.date, view: "week" })}`,
      label: "Empezar sesión",
      isPrimary: true,
    };
  } else if (agenda.isTodayDone) {
    tag = "Hoy ya entrenaste";
    title = "Sesión de hoy completada";
    detail = agenda.next
      ? `Tu próxima sesión: ${formatWeekdayDate(agenda.next.date)} · ${agenda.next.title}`
      : "Buen trabajo. Descansa y recupérate.";
    action = { href: "/routine", label: "Ver mi rutina", isPrimary: false };
  } else if (!hasRoutine) {
    tag = "Muy pronto";
    title = "Aún no tienes una rutina";
    detail = "Tu profesional la asignará tras la evaluación inicial.";
  } else {
    tag = "Hoy descansas";
    title = "No tienes sesión programada";
    detail = agenda.next
      ? `Tu próxima sesión: ${formatWeekdayDate(agenda.next.date)} · ${agenda.next.title}`
      : "Aún no hay próximas sesiones en tu calendario.";
    action = { href: "/routine", label: "Ver mi rutina", isPrimary: false };
  }

  const showCareNote = careZone !== null && action?.isPrimary === true;

  return (
    <section
      aria-label="Hoy"
      className="py-2"
    >

      <span className="inline-flex self-start text-xs font-bold uppercase tracking-[0.08em] text-brand lg:text-[13px]">
        {tag}
      </span>
      <h2 className="mt-2.5 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl lg:text-[28px]">
        {title}
      </h2>
      {detail && (
        <p className="mt-1 text-sm leading-5 text-muted-foreground lg:text-base">{detail}</p>
      )}
      {chips.length > 0 && (
        // En el teléfono sobran: la lista de ejercicios ya dice cuántos hay y cuáles hizo.
        <ul className="mt-2.5 hidden flex-wrap gap-1.5 lg:flex">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold lg:px-3 lg:text-sm"
            >
              {chip}
            </li>
          ))}
        </ul>
      )}
      {preview.length > 0 && (
        <ol
          aria-label={openSession ? "Ejercicios de tu sesión" : "Ejercicios de hoy"}
          className="mt-3 grid gap-1 lg:mt-4 lg:grid-cols-2 lg:gap-2"
        >
          {preview.map((exercise, index) => {
            const status = "status" in exercise ? exercise.status : null;
            const isNext = index === nextIndex;
            return (
              <li
                key={`${index}-${exercise.name}`}
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs lg:gap-2.5 lg:rounded-xl lg:px-3.5 lg:py-2.5 lg:text-sm",
                  // El siguiente, solo con el contorno dorado, sin fondo.
                  isNext ? "ring-1 ring-inset ring-brand-bright" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 flex-none place-items-center rounded-md text-[11px] font-extrabold lg:size-6 lg:text-xs",
                    status === "skipped"
                      ? "bg-surface text-muted-foreground"
                      : status
                        ? "bg-success text-success-foreground"
                        : "bg-surface text-brand",
                  )}
                >
                  {status === "skipped" ? (
                    <Minus aria-label="Saltado" className="size-3" />
                  ) : status ? (
                    <Check aria-label="Hecho" className="size-3" strokeWidth={3} />
                  ) : (
                    firstNumber + index
                  )}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-bold",
                    status && "text-muted-foreground",
                  )}
                >
                  {exercise.name}
                </span>
                {isNext ? (
                  <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-brand lg:text-xs">
                    Siguiente
                  </span>
                ) : (
                  volume(exercise.sets, exercise.reps) && (
                    <span className="whitespace-nowrap text-xs text-muted-foreground lg:text-[13px]">
                      {volume(exercise.sets, exercise.reps)}
                    </span>
                  )
                )}
              </li>
            );
          })}
          {hiddenCount > 0 && (
            <li className="flex items-center justify-center rounded-lg border-[1.5px] border-dashed border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground lg:rounded-xl lg:py-2.5 lg:text-sm">
              +{hiddenCount} {hiddenCount === 1 ? "ejercicio más" : "ejercicios más"}
            </li>
          )}
          {/* El aviso de cuidado va como una casilla más de la cuadrícula, con el
              mismo formato que los ejercicios. */}
          {showCareNote && (
            <li className="flex min-w-0 items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs text-brand lg:gap-2.5 lg:rounded-xl lg:px-3.5 lg:py-2.5 lg:text-sm">
              <Info aria-hidden="true" className="size-3.5 flex-none lg:size-4" />
              <span className="min-w-0 truncate">
                Cuida tu <b>{careZone}</b>. Registra dolor en la sesión si aparece.
              </span>
            </li>
          )}
        </ol>
      )}
      {action && (
        <div className="mt-3 flex gap-2 lg:mt-5 lg:gap-2.5">
          <Link
            href={action.href}
            prefetch={false}
            className={cn(
              "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-12 lg:flex-none lg:px-6 lg:text-base",
              action.isPrimary
                ? "bg-brand-bright text-brand-bright-foreground hover:bg-brand-bright/90"
                : "border-[1.5px] border-border hover:bg-muted",
            )}
          >
            {action.isPrimary && (
              <Play aria-hidden="true" className="hidden size-3.5 fill-current lg:block" />
            )}
            {action.label}
          </Link>
          {action.isPrimary && (
            <Link
              href="/routine"
              prefetch={false}
              className="flex min-h-[44px] items-center justify-center rounded-xl border-[1.5px] border-border px-4 text-sm font-bold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-12 lg:px-6 lg:text-base"
            >
              Ver mi rutina
            </Link>
          )}
        </div>
      )}
      {/* Sin lista de ejercicios, el aviso va suelto debajo de los botones. */}
      {showCareNote && preview.length === 0 && (
        <p className="mt-2 flex items-start gap-2 rounded-lg bg-foreground/8 px-2.5 py-1.5 text-xs leading-4 text-brand lg:mt-2.5">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 flex-none" />
          <span>
            Cuida tu <b>{careZone}</b>. Registra dolor en la sesión si aparece.
          </span>
        </p>
      )}
    </section>
  );
}
