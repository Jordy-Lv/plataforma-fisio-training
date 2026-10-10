"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, inputClass } from "@/components/auth/FormParts";
import { updateExerciseVideo } from "@/lib/catalog/exercise-actions";
import {
  exerciseVideoFormValues,
  exerciseVideoSchema,
} from "@/lib/catalog/exercise-schemas";
import { useFormValidation } from "@/lib/auth/use-form-validation";

/**
 * Enlace de YouTube de la ficha. Se edita aparte, como el etiquetado clínico,
 * porque también se añade a los ejercicios importados de la biblioteca.
 * Dejar el campo vacío y guardar quita el vídeo.
 */
export function ExerciseVideoForm({
  exerciseId,
  videoUrl,
}: {
  exerciseId: string;
  videoUrl: string | null;
}) {
  const [state, action, pending] = useActionState(updateExerciseVideo, {});
  const validation = useFormValidation(
    exerciseVideoSchema,
    exerciseVideoFormValues,
  );

  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-6">
      <input type="hidden" name="id" value={exerciseId} />

      <Field label="Enlace de YouTube">
        <input
          className={inputClass}
          name="videoUrl"
          type="url"
          inputMode="url"
          defaultValue={videoUrl ?? ""}
          maxLength={300}
          placeholder="https://www.youtube.com/watch?v=…"
        />
      </Field>
      <p className="-mt-4 text-sm text-muted-foreground">
        Vale el enlace de la barra del navegador, el de «Compartir» o el de un
        Short; si lleva minuto de inicio, el vídeo arranca ahí. Para quitarlo,
        deja el campo vacío y guarda.
      </p>

      <FormMessage
        state={validation.error ? { error: validation.error } : state}
      />

      <Button
        type="submit"
        variant="outline"
        className="min-h-12 text-base"
        disabled={pending}
      >
        {pending ? "Guardando…" : "Guardar vídeo"}
      </Button>
    </form>
  );
}
