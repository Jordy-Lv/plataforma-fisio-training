import { z } from "zod";
import { bodyParts } from "@/lib/catalog/body-parts";
import {
  equipment,
  environments,
  muscleGroups,
} from "@/lib/catalog/vocabulary";

/** Lo que devuelve una server action del catálogo. */
export type CatalogState = { error?: string; success?: string };

/** Los mismos que acepta el bucket `exercise-media`. */
export const mediaTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

/** 5 MiB: el límite del bucket. Rechazarlo antes ahorra una subida perdida. */
export const maxMediaBytes = 5 * 1024 * 1024;

export const mediaExtensions: Record<(typeof mediaTypes)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * Un `input[type=file]` vacío llega igualmente como `File`, con tamaño cero.
 * Eso es "no se eligió imagen", no "imagen inválida": al crear es un error y
 * al editar significa conservar la que ya tiene.
 */
export const emptyFile = (value: unknown) =>
  value instanceof File && value.size === 0;

const mediaFile = z
  .instanceof(File, { error: "Elige una imagen o un GIF del movimiento." })
  .refine((file) => file.size <= maxMediaBytes, {
    message: "La imagen no puede pesar más de 5 MB.",
  })
  .refine(
    (file) => (mediaTypes as readonly string[]).includes(file.type),
    { message: "Usa una imagen JPG, PNG, WEBP o un GIF." },
  );

/** Al menos un valor del vocabulario cerrado, sin repetidos. */
function chosenFrom<T extends readonly [string, ...string[]]>(
  values: T,
  error: string,
) {
  return z
    .array(z.enum(values, { error }), { error })
    .min(1, error)
    .transform((list) => [...new Set(list)]);
}

const contraindications = z
  .array(
    z.enum(bodyParts, {
      error:
        "Esa zona del cuerpo no existe en el vocabulario clínico. Elige una de la lista.",
    }),
  )
  .transform((list) => [...new Set(list)]);

const exerciseFields = {
  name: z
    .string({ error: "Escribe el nombre del ejercicio." })
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(120, "Usa como máximo 120 caracteres."),
  description: z
    .string({ error: "Explica cómo se ejecuta el movimiento." })
    .trim()
    .min(20, "Explica la ejecución con al menos 20 caracteres.")
    .max(4000, "Usa como máximo 4000 caracteres."),
  muscleGroups: chosenFrom(
    muscleGroups,
    "Marca al menos un grupo muscular que trabaje el ejercicio.",
  ),
  equipment: chosenFrom(
    equipment,
    "Marca el equipamiento que necesita; si no necesita nada, marca «Peso corporal».",
  ),
  environments: chosenFrom(
    environments,
    "Marca dónde se puede hacer: en casa, en gimnasio o en ambos.",
  ),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"], {
      error: "Selecciona el nivel del ejercicio.",
    })
    .nullable(),
};

/**
 * Alta de un ejercicio propio. La imagen es obligatoria: un ejercicio sin
 * contenido visual no le sirve al paciente, que lo consulta entre series.
 */
export const createExerciseSchema = z.object({
  ...exerciseFields,
  contraindications,
  media: mediaFile,
});

/**
 * Edición de la ficha. Sin imagen nueva se conserva la que ya está publicada,
 * y el etiquetado clínico no viaja aquí: lo edita su propio formulario, para
 * que guardar la ficha nunca borre en silencio unas contraindicaciones que no
 * estaban a la vista.
 */
export const updateExerciseSchema = z.object({
  ...exerciseFields,
  id: z.string().uuid("Selecciona un ejercicio válido."),
  media: z.preprocess(
    (value) => (emptyFile(value) ? undefined : value),
    mediaFile.optional(),
  ),
});

/** Etiquetado clínico: se edita solo, sin tocar el resto de la ficha. */
export const contraindicationsSchema = z.object({
  id: z.string().uuid("Selecciona un ejercicio válido."),
  contraindications,
});

/** Lee un formulario del catálogo tal como lo envía el navegador. */
export function exerciseFormValues(form: FormData) {
  const difficulty = form.get("difficulty");
  return {
    id: form.get("id") ?? undefined,
    name: form.get("name") ?? undefined,
    description: form.get("description") ?? undefined,
    muscleGroups: form.getAll("muscleGroups"),
    equipment: form.getAll("equipment"),
    environments: form.getAll("environments"),
    difficulty: difficulty ? difficulty : null,
    contraindications: form.getAll("contraindications"),
    media: form.get("media") ?? undefined,
  };
}

export function contraindicationsFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    contraindications: form.getAll("contraindications"),
  };
}
