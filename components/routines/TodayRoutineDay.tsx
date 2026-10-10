import { CheckCircle2 } from "lucide-react";
import { cn } from "cn";

import { SessionControls } from "@/components/routines/SessionControls";
import { Card } from "@/components/ui/Card";
import type { PatientRoutine } from "@/lib/routines/queries";

type Day = PatientRoutine["routine_days"][number];

/*
  Un día programado para hoy en «Mi rutina»: qué toca, cada ejercicio con su
  volumen y las indicaciones de su profesional, y el botón para hacerlo.

  El botón es el `<form>` de `SessionControls` con `value="<dayId>"`: es
  contrato de `test:routines:sessions` (`docs/11`). Solo se pinta para los días
  programados hoy, que es la regla: la rutina se hace el día que toca.
*/
export function TodayRoutineDay({
  day,
  routineName,
  kind,
  status,
}: {
  day: Day;
  routineName: string;
  kind: "training" | "physio";
  /** Cómo va hoy: sin empezar, a medias o terminada. */
  status: "pending" | "in_progress" | "completed";
}) {
  const label =
    status === "in_progress"
      ? "Continuar sesión"
      : status === "completed"
        ? "Hacerla otra vez"
        : "Empezar sesión";

  return (
    <Card padding="lg" className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={cn(
              "inline-flex rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold",
              kind === "physio" ? "border-info" : "border-brand-bright",
            )}
          >
            {kind === "physio" ? "Fisioterapia" : "Entrenamiento"}
          </span>
          <h2 className="mt-2 break-words text-2xl font-extrabold tracking-tight">
            {day.title || `Día ${day.day_number}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {routineName} · Día {day.day_number} ·{" "}
            {day.routine_items.length === 1
              ? "1 ejercicio"
              : `${day.routine_items.length} ejercicios`}
          </p>
        </div>
        {status === "completed" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-sm font-bold text-success">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Completada hoy
          </span>
        )}
      </div>

      {day.routine_items.length === 0 ? (
        <p className="text-muted-foreground">
          Tu profesional está completando este día. Podrás hacerlo cuando tenga
          ejercicios.
        </p>
      ) : (
        <ol className="grid gap-2">
          {day.routine_items.map((item, index) => (
            <li key={item.id} className="flex gap-3 rounded-xl bg-muted px-3.5 py-3">
              <span className="grid size-6 flex-none place-items-center rounded-lg bg-surface text-xs font-extrabold text-brand">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="break-words font-bold">{item.exercises?.name ?? "Ejercicio"}</p>
                <p className="text-sm text-muted-foreground">
                  {item.sets ?? "—"} series · {item.reps ?? "—"} repeticiones
                  {item.target_weight !== null ? ` · ${item.target_weight} kg` : ""}
                  {item.rest_seconds !== null ? ` · ${item.rest_seconds} s de descanso` : ""}
                </p>
                {item.notes && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                    <span className="font-semibold text-brand">Indicaciones: </span>
                    {item.notes}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {day.routine_items.length > 0 && (
        <SessionControls dayId={day.id} label={label} className="grid gap-2" />
      )}
    </Card>
  );
}
