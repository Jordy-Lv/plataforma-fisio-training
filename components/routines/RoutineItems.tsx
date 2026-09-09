"use client";

import { useActionState } from "react";
import { Repeat2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import {
  addRoutineItem,
  deleteRoutineItem,
  replaceRoutineItem,
  updateRoutineItem,
} from "@/lib/routines/item-actions";
import {
  updateRoutineItemFormValues,
  updateRoutineItemSchema,
} from "@/lib/routines/item-schemas";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import type { EditableRoutineItem } from "@/lib/routines/item-queries";

/** Objetivo táctil de 44 px: esto se usa de pie, junto al paciente. */
const iconButtonClass = "size-11";

/** La prescripción que el profesional ajusta al caso de esta persona. */
export function RoutineItemForm({
  patientId,
  item,
}: {
  patientId: string;
  item: EditableRoutineItem;
}) {
  const [state, action, pending] = useActionState(updateRoutineItem, {});
  const validation = useFormValidation(
    updateRoutineItemSchema,
    updateRoutineItemFormValues,
  );

  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-4">
      <input type="hidden" name="patientId" value={patientId} />
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

      <Field label="Indicaciones para el paciente (opcional)">
        <textarea
          className={`${inputClass} min-h-20 leading-7`}
          name="notes"
          maxLength={500}
          defaultValue={item.notes ?? ""}
          placeholder="Baja despacio y para si notas molestia en la rodilla."
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
        {pending ? "Guardando…" : "Guardar ajuste"}
      </Button>
    </form>
  );
}

/** Quitar el ejercicio de la rutina de este paciente. */
export function RemoveRoutineItemButton({
  patientId,
  item,
}: {
  patientId: string;
  item: EditableRoutineItem;
}) {
  const [state, action] = useActionState(deleteRoutineItem, {});

  return (
    <div className="grid gap-2">
      <form action={action}>
        <input type="hidden" name="patientId" value={patientId} />
        <input type="hidden" name="id" value={item.id} />
        <ConfirmSubmit
          variant="destructive"
          className={iconButtonClass}
          aria-label={`Quitar ${item.exercises?.name ?? "el ejercicio"} de la rutina`}
          title="¿Quitar este ejercicio de la rutina?"
          description="Se quita solo de la rutina de este paciente. La plantilla de origen no cambia y, si ya lo ejecutó, el historial se conserva."
          confirmLabel="Quitar ejercicio"
        >
          <X aria-hidden="true" />
        </ConfirmSubmit>
      </form>
      <FormMessage state={state} />
    </div>
  );
}

/** Añade un ejercicio del catálogo al final del día. */
export function AddRoutineItemButton({
  patientId,
  dayId,
  exerciseId,
  exerciseName,
}: {
  patientId: string;
  dayId: string;
  exerciseId: string;
  exerciseName: string;
}) {
  const [state, action, pending] = useActionState(addRoutineItem, {});

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="patientId" value={patientId} />
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

/** Cambia el ejercicio de un ítem conservando su sitio y su prescripción. */
export function ReplaceRoutineItemButton({
  patientId,
  itemId,
  exerciseId,
  exerciseName,
}: {
  patientId: string;
  itemId: string;
  exerciseId: string;
  exerciseName: string;
}) {
  const [state, action, pending] = useActionState(replaceRoutineItem, {});

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="id" value={itemId} />
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <Button
        type="submit"
        variant="outline"
        className="min-h-11 w-full"
        aria-label={`Sustituir por ${exerciseName}`}
        disabled={pending}
      >
        <Repeat2 aria-hidden="true" />
        {pending ? "Sustituyendo…" : "Poner este en su lugar"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

/**
 * Añade un ejercicio a la rutina eligiendo el día en un desplegable. Es el
 * control del buscador permanente cuando no se ha entrado a un día concreto.
 *
 * El `<select name="dayId">` solo lo lee un navegador real; las suites HTTP
 * únicamente recorren el modo enfocado (`?dia=`), que usa `AddRoutineItemButton`
 * con el día en un `<input type="hidden">`.
 */
export function AddRoutineItemDayPicker({
  patientId,
  days,
  exerciseId,
  exerciseName,
}: {
  patientId: string;
  days: { id: string; label: string }[];
  exerciseId: string;
  exerciseName: string;
}) {
  const [state, action, pending] = useActionState(addRoutineItem, {});

  if (days.length === 0) return null;

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Día
        <select name="dayId" className={inputClass} defaultValue={days[0].id}>
          {days.map((day) => (
            <option key={day.id} value={day.id}>
              {day.label}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="submit"
        className="min-h-11 w-full"
        aria-label={`Añadir ${exerciseName} a la rutina`}
        disabled={pending}
      >
        {pending ? "Añadiendo…" : "Añadir al día"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
