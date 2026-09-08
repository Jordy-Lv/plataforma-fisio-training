"use client";

import { useActionState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import {
  addTemplateDay,
  addTemplateItem,
  deleteTemplateDay,
  deleteTemplateItem,
  moveTemplateItem,
  updateTemplateDay,
  updateTemplateItem,
} from "@/lib/catalog/template-actions";
import {
  updateItemFormValues,
  updateItemSchema,
} from "@/lib/catalog/template-schemas";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import type { TemplateDay, TemplateItem } from "@/lib/catalog/template-queries";

/** Objetivo táctil de 44 px: esto se usa de pie, con el teléfono en la mano. */
const iconButtonClass = "size-11";

/** El primer error que aparezca entre varias acciones de la misma fila. */
const firstError = (...states: { error?: string }[]) =>
  states.find((state) => state.error) ?? {};

export function AddDayForm({
  templateId,
  full,
}: {
  templateId: string;
  full: boolean;
}) {
  const [state, action, pending] = useActionState(addTemplateDay, {});

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="templateId" value={templateId} />

      <Field label="Título del día (opcional)">
        <input
          className={inputClass}
          name="title"
          maxLength={80}
          placeholder="Tren inferior y core"
          disabled={full}
        />
      </Field>

      <FormMessage state={state} />

      <Button
        type="submit"
        className="min-h-12 justify-self-start text-base"
        disabled={pending || full}
      >
        {pending ? "Añadiendo…" : "Añadir día"}
      </Button>
      {full && (
        <p className="text-sm text-muted-foreground">
          La plantilla ya tiene los siete días de la semana.
        </p>
      )}
    </form>
  );
}

export function DayHeaderForms({
  templateId,
  day,
}: {
  templateId: string;
  day: TemplateDay;
}) {
  const [titleState, titleAction, titlePending] = useActionState(
    updateTemplateDay,
    {},
  );
  const [deleteState, deleteAction] = useActionState(deleteTemplateDay, {});

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <form
          action={titleAction}
          className="flex min-w-60 flex-1 items-end gap-3"
        >
          <input type="hidden" name="templateId" value={templateId} />
          <input type="hidden" name="id" value={day.id} />
          <div className="flex-1">
            <Field label="Título del día">
              <input
                className={inputClass}
                name="title"
                defaultValue={day.title ?? ""}
                maxLength={80}
                placeholder="Sin título"
              />
            </Field>
          </div>
          <Button
            type="submit"
            variant="outline"
            className="min-h-12"
            disabled={titlePending}
          >
            {titlePending ? "Guardando…" : "Guardar"}
          </Button>
        </form>

        <form action={deleteAction}>
          <input type="hidden" name="templateId" value={templateId} />
          <input type="hidden" name="id" value={day.id} />
          <ConfirmSubmit
            variant="destructive"
            className="min-h-12"
            pendingLabel="Eliminando…"
            title="¿Eliminar el día completo?"
            description={
              day.items.length === 1
                ? "Se elimina también su ejercicio. No se puede deshacer."
                : `Se eliminan también sus ${day.items.length} ejercicios. No se puede deshacer.`
            }
            confirmLabel="Eliminar día"
          >
            Eliminar día
          </ConfirmSubmit>
        </form>
      </div>

      <p className="text-sm text-muted-foreground">
        Eliminar el día quita también sus{" "}
        {day.items.length === 1
          ? "1 ejercicio"
          : `${day.items.length} ejercicios`}
        .
      </p>

      <FormMessage state={firstError(titleState, deleteState)} />
    </div>
  );
}

/** Subir, bajar y quitar. Van fuera del formulario de la prescripción. */
export function ItemActions({
  templateId,
  item,
  isFirst,
  isLast,
}: {
  templateId: string;
  item: TemplateItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [upState, upAction, upPending] = useActionState(moveTemplateItem, {});
  const [downState, downAction, downPending] = useActionState(
    moveTemplateItem,
    {},
  );
  const [removeState, removeAction] = useActionState(deleteTemplateItem, {});

  const hidden = (
    <>
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="id" value={item.id} />
    </>
  );

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <form action={upAction}>
          {hidden}
          <input type="hidden" name="direction" value="up" />
          <Button
            type="submit"
            variant="outline"
            className={iconButtonClass}
            aria-label={`Subir ${item.exercise.name}`}
            disabled={isFirst || upPending}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
        </form>

        <form action={downAction}>
          {hidden}
          <input type="hidden" name="direction" value="down" />
          <Button
            type="submit"
            variant="outline"
            className={iconButtonClass}
            aria-label={`Bajar ${item.exercise.name}`}
            disabled={isLast || downPending}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
        </form>

        <form action={removeAction}>
          {hidden}
          <ConfirmSubmit
            variant="destructive"
            className={iconButtonClass}
            aria-label={`Quitar ${item.exercise.name} del día`}
            title="¿Quitar este ejercicio del día?"
            description="Se quita de la plantilla. Las rutinas ya asignadas a partir de ella no cambian."
            confirmLabel="Quitar ejercicio"
          >
            <X aria-hidden="true" />
          </ConfirmSubmit>
        </form>
      </div>

      <FormMessage state={firstError(upState, downState, removeState)} />
    </div>
  );
}

/** La prescripción del ejercicio dentro del día. Todos los campos son opcionales. */
export function ItemForm({
  templateId,
  item,
}: {
  templateId: string;
  item: TemplateItem;
}) {
  const [state, action, pending] = useActionState(updateTemplateItem, {});
  const validation = useFormValidation(updateItemSchema, updateItemFormValues);

  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-4">
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="id" value={item.id} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Series">
          <input
            className={inputClass}
            name="sets"
            type="number"
            inputMode="numeric"
            min={1}
            max={12}
            defaultValue={item.sets ?? ""}
            placeholder="3"
          />
        </Field>
        <Field label="Repeticiones">
          <input
            className={inputClass}
            name="reps"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            defaultValue={item.reps ?? ""}
            placeholder="12"
          />
        </Field>
        <Field label="Peso objetivo (kg)">
          <input
            className={inputClass}
            name="targetWeight"
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={500}
            defaultValue={item.target_weight ?? ""}
            placeholder="Sin indicar"
          />
        </Field>
        <Field label="Descanso (segundos)">
          <input
            className={inputClass}
            name="restSeconds"
            type="number"
            inputMode="numeric"
            min={0}
            max={900}
            defaultValue={item.rest_seconds ?? ""}
            placeholder="60"
          />
        </Field>
      </div>

      <Field label="Notas para el paciente (opcional)">
        <textarea
          className={`${inputClass} min-h-20 leading-7`}
          name="notes"
          maxLength={500}
          defaultValue={item.notes ?? ""}
          placeholder="Baja despacio y no bloquees la rodilla al subir."
        />
      </Field>

      <FormMessage
        state={validation.error ? { error: validation.error } : state}
      />

      <Button
        type="submit"
        variant="outline"
        className="min-h-12 justify-self-start text-base"
        disabled={pending}
      >
        {pending ? "Guardando…" : "Guardar prescripción"}
      </Button>
    </form>
  );
}

/**
 * Añade un ejercicio del catálogo al final del día. La prescripción se
 * rellena después, en la fila del ejercicio.
 */
export function AddItemButton({
  templateId,
  dayId,
  exerciseId,
  exerciseName,
}: {
  templateId: string;
  dayId: string;
  exerciseId: string;
  exerciseName: string;
}) {
  const [state, action, pending] = useActionState(addTemplateItem, {});

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="dayId" value={dayId} />
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <Button
        type="submit"
        className="min-h-11 w-full"
        aria-label={`Añadir ${exerciseName} a este día`}
        disabled={pending}
      >
        {pending ? "Añadiendo…" : "Añadir al día"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

/**
 * Añade un ejercicio a la plantilla eligiendo el día en un desplegable. Es el
 * control del buscador permanente cuando no se ha entrado a un día concreto:
 * evita la navegación a `?dia=<dayId>` para lo habitual.
 *
 * El `<select name="dayId">` solo lo lee un navegador real; las suites HTTP
 * únicamente recorren el modo enfocado (`?dia=`), que usa `AddItemButton` con
 * el día en un `<input type="hidden">`.
 */
export function AddItemDayPicker({
  templateId,
  days,
  exerciseId,
  exerciseName,
}: {
  templateId: string;
  days: TemplateDay[];
  exerciseId: string;
  exerciseName: string;
}) {
  const [state, action, pending] = useActionState(addTemplateItem, {});

  if (days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Añade un día antes de colocar ejercicios.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Día
        <select name="dayId" className={inputClass} defaultValue={days[0].id}>
          {days.map((day) => (
            <option key={day.id} value={day.id}>
              Día {day.day_number}
              {day.title ? ` · ${day.title}` : ""}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="submit"
        className="min-h-11 w-full"
        aria-label={`Añadir ${exerciseName} a la plantilla`}
        disabled={pending}
      >
        {pending ? "Añadiendo…" : "Añadir al día"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
