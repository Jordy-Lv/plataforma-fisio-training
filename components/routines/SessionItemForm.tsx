"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { bodyParts, bodyPartLabels } from "@/lib/catalog/body-parts";
import { logSessionItem } from "@/lib/routines/session-actions";
import { sessionLogSchema, type RoutineActionState } from "@/lib/routines/schemas";
import type { ExecutionItem, SessionLog } from "@/lib/routines/session-queries";

const field = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-base";
const labels = { done: "Hecho", skipped: "Saltado", modified: "Modificado" };
export function SessionItemForm({ sessionId, item, log, catalog }: {
  sessionId: string; item: ExecutionItem; log?: SessionLog; catalog: { id: string; name: string }[];
}) {
  const exercise = log?.exercises ?? item.exercises;
  const [validation, setValidation] = useState<string>();
  const [state, action, pending] = useActionState<RoutineActionState, FormData>(logSessionItem, {});
  return <article className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6">
    <h2 className="break-words text-lg font-semibold">{exercise?.name ?? "Ejercicio"}</h2>
    <p className="mt-1 text-sm text-muted-foreground">Prescrito: {(log ? log.prescribed_sets : item.sets) ?? "—"} series · {(log ? log.prescribed_reps : item.reps) ?? "—"} repeticiones · {(log ? log.prescribed_weight : item.target_weight) ?? "—"} kg · {item.rest_seconds ?? "—"} s de descanso</p>
    <p className="mt-2 font-medium text-brand">{log ? `✓ ${labels[log.status]} · guardado` : "Pendiente de registrar"}</p>
    <details className="mt-2">
      <summary className="min-h-11 cursor-pointer py-3 font-medium">Ver cómo se hace</summary>
      {exercise?.media_url && <Image src={exercise.media_url} alt={exercise.name} width={480} height={360} unoptimized className="h-auto w-full rounded-xl object-contain" />}
      <p className="whitespace-pre-wrap break-words py-3 leading-7">{exercise?.description || "Consulta las indicaciones con tu profesional antes de realizarlo."}</p>
    </details>
    <details className="mt-3">
      <summary className="min-h-11 cursor-pointer py-3 font-medium text-brand">{log ? "Editar registro" : "Registrar ejercicio"}</summary>
    <form action={action} onSubmit={(event) => {
      const result = sessionLogSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
      setValidation(result.success ? undefined : result.error.issues[0].message);
      if (!result.success) event.preventDefault();
    }} className="mt-3 grid min-w-0 gap-4">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="itemId" value={item.id} />
      <label>Qué ocurrió<select name="status" defaultValue={log?.status ?? "done"} className={field}>
        <option value="done">Hecho</option><option value="skipped">Saltado</option><option value="modified">Modificado</option>
      </select></label>
      <div className="grid grid-cols-2 gap-3">
        <label>Series reales<input name="actualSets" type="number" min="0" max="100" defaultValue={log?.actual_sets ?? ""} className={field} /></label>
        <label>Repeticiones reales<input name="actualReps" type="number" min="0" max="1000" defaultValue={log?.actual_reps ?? ""} className={field} /></label>
        <label>Peso real (kg)<input name="actualWeight" type="number" min="0" max="9999.99" step="0.01" defaultValue={log?.actual_weight ?? ""} className={field} /></label>
        <label>Esfuerzo (1–10)<input name="perceivedEffort" type="number" min="1" max="10" defaultValue={log?.perceived_effort ?? ""} className={field} /></label>
      </div>
      <label>Dolor (0–10)<input name="painLevel" type="number" min="0" max="10" required defaultValue={log?.pain_level ?? 0} className={field} /></label>
      <label>Zona del dolor<select name="painLocation" defaultValue={log?.pain_location ?? ""} className={field}>
        <option value="">Sin zona indicada</option>{bodyParts.map((part) => <option key={part} value={part}>{bodyPartLabels[part]}</option>)}
      </select></label>
      <label>Motivo u observación<textarea name="notes" maxLength={2000} defaultValue={log?.notes ?? ""} className={`${field} min-h-24 py-2`} /></label>
      <p className="text-sm text-muted-foreground">Si saltas el ejercicio, indica dolor, zona y motivo en este mismo paso. Usa 0 si no hubo dolor.</p>
      <label>Ejercicio de sustitución<select name="replacedByExerciseId" defaultValue={log?.replaced_by_exercise_id ?? ""} className={field}>
        <option value="">Sin sustitución</option>{catalog.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
      </select></label>
      <Button type="submit" disabled={pending} className="min-h-11">{pending ? "Guardando…" : log ? "Actualizar este registro" : "Registrar este ejercicio"}</Button>
      {(validation || state.error) && <p role="alert" className="text-destructive">{validation || state.error}</p>}
      {state.success && <p role="status" className="text-brand">{state.success}</p>}
    </form>
    </details>
  </article>;
}
