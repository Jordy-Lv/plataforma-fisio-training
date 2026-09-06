"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Choices, Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import {
  createExercise,
  updateExercise,
} from "@/lib/catalog/exercise-actions";
import {
  createExerciseSchema,
  exerciseFormValues,
  mediaTypes,
  updateExerciseSchema,
} from "@/lib/catalog/exercise-schemas";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import {
  difficultyLabels,
  environmentLabels,
  equipmentLabels,
  muscleGroupLabels,
} from "@/lib/catalog/vocabulary";
import type { ExerciseDetail } from "@/lib/catalog/queries";

/**
 * Alta y edición de un ejercicio propio del negocio. Es el mismo formulario:
 * la única diferencia es que al editar la imagen ya existe y solo se reemplaza
 * si se elige otra.
 */
export function ExerciseForm({ exercise }: { exercise?: ExerciseDetail }) {
  const editing = Boolean(exercise);
  const [state, action, pending] = useActionState(
    editing ? updateExercise : createExercise,
    {},
  );
  const validation = useFormValidation(
    editing ? updateExerciseSchema : createExerciseSchema,
    exerciseFormValues,
  );

  return (
    <form
      onSubmit={validation.onSubmit}
      action={action}
      encType="multipart/form-data"
      className="grid gap-6"
    >
      {exercise && <input type="hidden" name="id" value={exercise.id} />}

      <Field label="Nombre del ejercicio">
        <input
          className={inputClass}
          name="name"
          defaultValue={exercise?.name ?? ""}
          required
          minLength={3}
          maxLength={120}
          placeholder="Sentadilla con banda"
        />
      </Field>

      <Field label="Cómo se ejecuta">
        <textarea
          className={`${inputClass} min-h-40 leading-7`}
          name="description"
          defaultValue={exercise?.description ?? ""}
          required
          minLength={20}
          maxLength={4000}
          placeholder="Explica la posición inicial, el movimiento y los errores frecuentes. Lo lee el paciente entre series."
        />
      </Field>

      <Field
        label={
          editing
            ? "Reemplazar la imagen o el GIF (opcional)"
            : "Imagen o GIF del movimiento"
        }
      >
        <input
          className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium`}
          name="media"
          type="file"
          accept={mediaTypes.join(",")}
          required={!editing}
        />
      </Field>
      <p className="-mt-4 text-sm text-muted-foreground">
        JPG, PNG, WEBP o GIF, hasta 5 MB.
        {editing && " Si no eliges ninguna, se conserva la que ya tiene."}
      </p>

      <Choices
        multiple
        name="muscleGroups"
        title="Grupos musculares que trabaja"
        labels={muscleGroupLabels}
        selected={exercise?.muscle_groups}
      />

      <Choices
        multiple
        name="equipment"
        title="Equipamiento que necesita"
        labels={equipmentLabels}
        selected={exercise?.equipment}
      />

      <Choices
        multiple
        name="environments"
        title="Dónde se puede hacer"
        labels={environmentLabels}
        selected={exercise?.environments}
      />

      <Field label="Nivel">
        <select
          className={inputClass}
          name="difficulty"
          defaultValue={exercise?.difficulty ?? ""}
        >
          <option value="">Sin especificar</option>
          {Object.entries(difficultyLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      {!editing && (
        <>
          <Choices
            multiple
            name="contraindications"
            title="Contraindicado para (opcional)"
            labels={bodyPartLabels}
          />
          <p className="-mt-4 text-sm text-muted-foreground">
            Marca las zonas del cuerpo con las que este ejercicio no es
            compatible. El motor de asignación lo excluirá de las rutinas de
            quien tenga una condición activa en esa zona.
          </p>
        </>
      )}

      <FormMessage
        state={validation.error ? { error: validation.error } : state}
      />

      <Button type="submit" className="min-h-12 text-base" disabled={pending}>
        {pending
          ? "Guardando…"
          : editing
            ? "Guardar cambios"
            : "Crear ejercicio"}
      </Button>
    </form>
  );
}
