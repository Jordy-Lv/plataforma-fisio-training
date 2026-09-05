"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Choices, FormMessage } from "@/components/auth/FormParts";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { updateContraindications } from "@/lib/catalog/exercise-actions";
import {
  contraindicationsFormValues,
  contraindicationsSchema,
} from "@/lib/catalog/exercise-schemas";
import { useFormValidation } from "@/lib/auth/use-form-validation";

/**
 * Etiquetado clínico. Se edita aparte de la ficha porque es lo único que el
 * equipo cambia sobre los ejercicios importados, y porque cada zona marcada
 * retira el ejercicio de las rutinas de quien tenga una condición activa ahí.
 */
export function ContraindicationsForm({
  exerciseId,
  contraindications,
}: {
  exerciseId: string;
  contraindications: string[];
}) {
  const [state, action, pending] = useActionState(updateContraindications, {});
  const validation = useFormValidation(
    contraindicationsSchema,
    contraindicationsFormValues,
  );

  return (
    <form onSubmit={validation.onSubmit} action={action} className="grid gap-6">
      <input type="hidden" name="id" value={exerciseId} />

      <Choices
        multiple
        name="contraindications"
        title="Zonas del cuerpo con las que no es compatible"
        labels={bodyPartLabels}
        selected={contraindications}
      />
      <p className="-mt-4 text-sm text-muted-foreground">
        Sin ninguna zona marcada, el ejercicio puede asignarse a cualquier
        paciente. Desmarcarlas todas es una decisión clínica, no un descuido.
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
        {pending ? "Guardando…" : "Guardar etiquetado clínico"}
      </Button>
    </form>
  );
}
