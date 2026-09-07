"use client";

import Image from "next/image";
import { useActionState, useState } from "react";

import { FormMessage } from "@/components/auth/FormParts";
import { Badge, PainBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { bodyPartLabels, bodyParts } from "@/lib/catalog/body-parts";
import { logSessionItem } from "@/lib/routines/session-actions";
import { sessionLogSchema, type RoutineActionState } from "@/lib/routines/schemas";
import type {
  ExecutionItem,
  ReplacementExercise,
  SessionLog,
} from "@/lib/routines/session-queries";

const labels = { done: "Hecho", skipped: "Saltado", modified: "Modificado" };

const painLevels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Un ejercicio de la sesión en curso: qué toca hacer, cómo se hace y el
 * registro de lo que realmente ocurrió.
 *
 * El registro vive dentro de un `<details>`, no de un diálogo: el ADR-0008
 * explica que el contenido de un portal no llega al HTML del servidor y
 * `scripts/verify-routine-sessions.test.mjs` localiza este formulario por
 * `name="itemId"` en ese HTML. El acuse tampoco es un aviso efímero por lo
 * mismo —la prueba busca «Registro guardado» en la respuesta— y porque el
 * paciente registra el ejercicio y sigue entrenando: el mensaje tiene que
 * quedarse donde estaba mirando.
 */
export function SessionItemForm({
  sessionId,
  item,
  log,
  catalog,
}: {
  sessionId: string;
  item: ExecutionItem;
  log?: SessionLog;
  catalog: ReplacementExercise[];
}) {
  const exercise = log?.exercises ?? item.exercises;
  const [validation, setValidation] = useState<string>();
  // El selector de sustitución arranca acotado a ejercicios que comparten grupo
  // muscular con el prescrito. Si ya hay una sustitución guardada o el ejercicio
  // no tiene grupos etiquetados, se muestra el catálogo entero.
  const itemMuscles = item.exercises?.muscle_groups ?? [];
  const [showAllReplacements, setShowAllReplacements] = useState(
    Boolean(log?.replaced_by_exercise_id) || itemMuscles.length === 0,
  );
  const replacementOptions =
    showAllReplacements || itemMuscles.length === 0
      ? catalog
      : catalog.filter(
          (option) =>
            option.id !== item.exercise_id &&
            option.muscle_groups.some((group) => itemMuscles.includes(group)),
        );
  // Sin valor por defecto: el paciente elige un escalón a conciencia. Antes
  // llegaba "0 / Sin dolor" preseleccionado y, con `status` en "Hecho", se
  // registraba el ejercicio sin reportar nada —justo lo que dispara las alertas
  // clínicas—.
  const [pain, setPain] = useState<number | null>(log?.pain_level ?? null);
  const [state, action, pending] = useActionState<RoutineActionState, FormData>(
    logSessionItem,
    {},
  );

  return (
    <article
      className={cardVariants({ padding: "lg", className: "min-w-0" })}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 break-words text-lg font-semibold">
          {exercise?.name ?? "Ejercicio"}
        </h2>
        {log ? (
          <Badge variant="success">✓ {labels[log.status]} · guardado</Badge>
        ) : (
          <Badge variant="outline">Pendiente de registrar</Badge>
        )}
      </div>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Prescrito: {(log ? log.prescribed_sets : item.sets) ?? "—"} series ·{" "}
        {(log ? log.prescribed_reps : item.reps) ?? "—"} repeticiones ·{" "}
        {(log ? log.prescribed_weight : item.target_weight) ?? "—"} kg ·{" "}
        {item.rest_seconds ?? "—"} s de descanso
      </p>

      <details className="mt-3 rounded-xl border border-border px-4">
        <summary className="min-h-11 cursor-pointer py-3 font-medium">
          Ver cómo se hace
        </summary>
        <div className="pb-4">
          {exercise?.media_url && (
            <Image
              src={exercise.media_url}
              alt={exercise.name}
              width={480}
              height={360}
              unoptimized
              className="h-auto w-full rounded-xl object-contain"
            />
          )}
          <p className="whitespace-pre-wrap break-words pt-3 leading-7">
            {exercise?.description ||
              "Consulta las indicaciones con tu profesional antes de realizarlo."}
          </p>
        </div>
      </details>

      <details className="mt-3 rounded-xl border border-border px-4">
        <summary className="min-h-11 cursor-pointer py-3 font-medium text-brand">
          {log ? "Editar registro" : "Registrar ejercicio"}
        </summary>
        <form
          action={action}
          onSubmit={(event) => {
            const result = sessionLogSchema.safeParse(
              Object.fromEntries(new FormData(event.currentTarget)),
            );
            setValidation(result.success ? undefined : result.error.issues[0].message);
            if (!result.success) event.preventDefault();
          }}
          className="grid min-w-0 gap-5 pb-4"
        >
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="itemId" value={item.id} />

          <Field label="Qué ocurrió">
            <Select name="status" defaultValue={log?.status ?? "done"}>
              <option value="done">Hecho</option>
              <option value="skipped">Saltado</option>
              <option value="modified">Modificado</option>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Series reales">
              <Input
                name="actualSets"
                type="number"
                min="0"
                max="100"
                inputMode="numeric"
                defaultValue={log?.actual_sets ?? ""}
              />
            </Field>
            <Field label="Repeticiones reales">
              <Input
                name="actualReps"
                type="number"
                min="0"
                max="1000"
                inputMode="numeric"
                defaultValue={log?.actual_reps ?? ""}
              />
            </Field>
            <Field label="Peso real (kg)">
              <Input
                name="actualWeight"
                type="number"
                min="0"
                max="9999.99"
                step="0.01"
                inputMode="decimal"
                defaultValue={log?.actual_weight ?? ""}
              />
            </Field>
            <Field label="Esfuerzo (1–10)">
              <Input
                name="perceivedEffort"
                type="number"
                min="1"
                max="10"
                inputMode="numeric"
                defaultValue={log?.perceived_effort ?? ""}
              />
            </Field>
          </div>

          {/*
            El dolor se marca con botones y no con un campo numérico: se rellena
            de pie, entre series y con las manos sudadas, y once objetivos de
            44 px en dos filas se aciertan sin apuntar. La etiqueta de al lado
            traduce el número a su escalón, que es lo que el paciente entiende.
          */}
          <fieldset className="grid gap-3">
            <legend className="mb-2 flex flex-wrap items-center gap-3 text-sm font-medium">
              Dolor (0–10)
              <PainBadge level={pain} />
            </legend>
            <div className="grid grid-cols-6 gap-2">
              {painLevels.map((level) => (
                <label
                  key={level}
                  className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-input bg-surface text-base font-medium has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-soft-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
                >
                  {/*
                    Sin `required` nativo: el radio es `sr-only` y su burbuja
                    aparece descolgada. La ausencia de escalón la recoge el
                    `safeParse` del `onSubmit` y el aviso sale en línea, igual
                    que el resto de reglas del formulario.
                  */}
                  <input
                    type="radio"
                    name="painLevel"
                    value={level}
                    checked={pain === level}
                    onChange={() => setPain(level)}
                    className="sr-only"
                  />
                  {level}
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Zona del dolor">
            <Select name="painLocation" defaultValue={log?.pain_location ?? ""}>
              <option value="">Sin zona indicada</option>
              {bodyParts.map((part) => (
                <option key={part} value={part}>
                  {bodyPartLabels[part]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Motivo u observación"
            hint="Si saltas el ejercicio, indica aquí el dolor, la zona y el motivo. Usa 0 si no hubo dolor."
          >
            <Textarea name="notes" maxLength={2000} defaultValue={log?.notes ?? ""} />
          </Field>

          {/*
            El botón de alternancia va fuera del `Field`: `Field` es un
            `<label>` y un `<button>` dentro activaría también el `<select>`.
          */}
          <div className="grid gap-2">
            <Field
              label="Ejercicio de sustitución"
              hint={
                itemMuscles.length > 0 && !showAllReplacements
                  ? `${replacementOptions.length} ejercicios del mismo grupo muscular.`
                  : undefined
              }
            >
              <Select
                name="replacedByExerciseId"
                defaultValue={log?.replaced_by_exercise_id ?? ""}
              >
                <option value="">Sin sustitución</option>
                {replacementOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
            {itemMuscles.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-self-start"
                onClick={() => setShowAllReplacements((value) => !value)}
              >
                {showAllReplacements
                  ? "Mostrar solo ejercicios afines"
                  : "Ver todo el catálogo"}
              </Button>
            )}
          </div>

          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending
              ? "Guardando…"
              : log
                ? "Actualizar este registro"
                : "Registrar este ejercicio"}
          </Button>
          <FormMessage state={validation ? { error: validation } : state} />
        </form>
      </details>
    </article>
  );
}
