import type { PatientRoutine } from "@/lib/routines/queries";

const statusLabels = { active: "Activa", pending_review: "Pendiente de revisión", completed: "Finalizada", archived: "Archivada" };

export function RoutineSummary({ routine, staff = false }: { routine: PatientRoutine; staff?: boolean }) {
  return (
    <article className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <p className="text-sm font-medium text-brand">
        {routine.kind === "training" ? "Entrenamiento" : "Rehabilitación"} · {statusLabels[routine.status]}
      </p>
      <h2 className="mt-2 break-words text-2xl font-semibold">{routine.name}</h2>
      {staff && routine.notes && <details className="mt-4">
        <summary className="min-h-11 cursor-pointer py-3 font-medium">Por qué se asignó y qué se excluyó</summary>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{routine.notes}</p>
      </details>}
      <div className="mt-5 grid gap-6">
        {routine.routine_days.map((day) => <section key={day.id}>
          <h3 className="font-semibold">Día {day.day_number}{day.title ? ` · ${day.title}` : ""}</h3>
          {!day.routine_items.length && <p className="mt-2 text-muted-foreground">El equipo debe completar este día antes de entregar la rutina.</p>}
          <ol className="mt-3 grid gap-3">
            {day.routine_items.map((item) => <li key={item.id} className="rounded-xl border border-border p-4">
              <p className="break-words font-medium">{item.exercises?.name ?? "Ejercicio"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.sets ?? "—"} series · {item.reps ?? "—"} repeticiones
                {item.target_weight !== null ? ` · ${item.target_weight} kg` : ""}
                {item.rest_seconds !== null ? ` · ${item.rest_seconds} s de descanso` : ""}
              </p>
            </li>)}
          </ol>
        </section>)}
      </div>
    </article>
  );
}
