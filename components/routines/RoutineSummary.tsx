import { SessionControls } from "@/components/routines/SessionControls";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { cardVariants } from "@/components/ui/Card";
import type { PatientRoutine } from "@/lib/routines/queries";

const statusLabels = {
  active: "Activa",
  pending_review: "Pendiente de revisión",
  completed: "Finalizada",
  archived: "Archivada",
};

/*
  Una rutina activa y una archivada se leían igual antes de la fase 2, las dos
  en gris. Ahora el estado lleva su color: el paciente distingue de un vistazo
  cuál es la que tiene que entrenar hoy.
*/
const statusVariants: Record<keyof typeof statusLabels, BadgeVariant> = {
  active: "success",
  pending_review: "warning",
  completed: "info",
  archived: "neutral",
};

export function RoutineSummary({
  routine,
  staff = false,
}: {
  routine: PatientRoutine;
  staff?: boolean;
}) {
  return (
    <article className={cardVariants({ padding: "lg", className: "min-w-0" })}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="brand">
          {routine.kind === "training" ? "Entrenamiento" : "Rehabilitación"}
        </Badge>
        <Badge variant={statusVariants[routine.status]}>
          {statusLabels[routine.status]}
        </Badge>
      </div>
      <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight">
        {routine.name}
      </h2>

      {staff && routine.notes && (
        <details className="mt-4 rounded-xl border border-border px-4">
          <summary className="min-h-11 cursor-pointer py-3 font-medium">
            Por qué se asignó y qué se excluyó
          </summary>
          <p className="whitespace-pre-wrap break-words pb-4 text-sm leading-6 text-muted-foreground">
            {routine.notes}
          </p>
        </details>
      )}

      {/*
        Un día por bloque plegado (9.2). Antes la pantalla los desplegaba todos:
        dos días de nueve ejercicios eran 2.481 px —casi cuatro pantallas de
        teléfono— para decidir cuál de los dos se entrena hoy. La cabecera queda
        siempre a la vista con lo que hace falta para decidir: el título, cuántos
        ejercicios tiene y el botón de empezar.

        **El botón de iniciar va en la cabecera, no dentro del `<summary>`.** Un
        `<button>` dentro de un `<summary>` alterna el `<details>` al pulsarlo, y
        además ese `<form>` es contrato: `verify-routine-sessions` lo localiza
        por `value="<dayId>"` y lo envía sin JavaScript (`docs/11`, §3).
      */}
      <div className="mt-6 grid gap-4">
        {routine.routine_days.map((day) => (
          <section
            key={day.id}
            className="rounded-xl border border-border bg-background"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-4">
              <div className="min-w-0">
                <h3 className="break-words text-lg font-semibold">
                  Día {day.day_number}
                  {day.title ? ` · ${day.title}` : ""}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {day.routine_items.length === 1
                    ? "1 ejercicio"
                    : `${day.routine_items.length} ejercicios`}
                </p>
              </div>

              {!staff && routine.status === "active" && (
                <SessionControls
                  dayId={day.id}
                  size="sm"
                  className="grid gap-1"
                />
              )}
            </div>

            {day.routine_items.length === 0 ? (
              <p className="px-4 pb-4 pt-2 leading-7 text-muted-foreground">
                El equipo debe completar este día antes de entregar la rutina.
              </p>
            ) : (
              <details className="px-4 pb-2">
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-brand">
                  Ver los ejercicios
                </summary>
                <ol className="grid gap-3 pb-2">
                  {day.routine_items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-border bg-surface p-4"
                    >
                      <p className="break-words font-medium">
                        {item.exercises?.name ?? "Ejercicio"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {item.sets ?? "—"} series · {item.reps ?? "—"}{" "}
                        repeticiones
                        {item.target_weight !== null
                          ? ` · ${item.target_weight} kg`
                          : ""}
                        {item.rest_seconds !== null
                          ? ` · ${item.rest_seconds} s de descanso`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
