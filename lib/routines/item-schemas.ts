import { z } from "zod";

/** Lo que devuelve una server action de ajuste de la rutina. */
export type RoutineItemState = { error?: string; success?: string };

const uuid = (error: string) => z.string().uuid(error);

/** Un campo numérico opcional del formulario: vacío es «sin indicar». */
function optionalNumber(
  { min, max, integer = true }: { min: number; max: number; integer?: boolean },
  error: string,
) {
  const base = integer
    ? z.coerce.number({ error }).int(error)
    : z.coerce.number({ error });
  return base.min(min, error).max(max, error).nullable();
}

/**
 * La prescripción del ejercicio dentro del día del paciente.
 *
 * Los rangos coinciden hoy con los de `lib/catalog/template-schemas.ts`, pero
 * se definen aparte a propósito: la plantilla es material del equipo y la
 * rutina es el caso de una persona. Si mañana el ajuste clínico necesita
 * admitir más descanso que una plantilla, ese cambio no debe arrastrar al
 * catálogo.
 */
const itemFields = {
  sets: optionalNumber(
    { min: 1, max: 12 },
    "Las series deben ser un número entre 1 y 12.",
  ),
  reps: optionalNumber(
    { min: 1, max: 100 },
    "Las repeticiones deben ser un número entre 1 y 100.",
  ),
  targetWeight: optionalNumber(
    { min: 0, max: 500, integer: false },
    "El peso objetivo debe estar entre 0 y 500 kg.",
  ),
  restSeconds: optionalNumber(
    { min: 0, max: 900 },
    "El descanso debe estar entre 0 y 900 segundos.",
  ),
  notes: z
    .string()
    .trim()
    .max(500, "Las indicaciones admiten como máximo 500 caracteres.")
    .transform((value) => value || null),
};

export const updateRoutineItemSchema = z.object({
  ...itemFields,
  id: uuid("Selecciona un ejercicio de la rutina."),
});

export const addRoutineItemSchema = z.object({
  dayId: uuid("Selecciona un día válido de la rutina."),
  exerciseId: uuid("Selecciona un ejercicio del catálogo."),
});

export const routineItemIdSchema = z.object({
  id: uuid("Selecciona un ejercicio de la rutina."),
});

export const replaceRoutineItemSchema = z.object({
  id: uuid("Selecciona un ejercicio de la rutina."),
  exerciseId: uuid("Selecciona el ejercicio que lo sustituye."),
});

/** Un campo vacío del formulario es «sin indicar», no una cadena vacía. */
const blankToNull = (value: FormDataEntryValue | null) =>
  value === null || value === "" ? null : value;

export function updateRoutineItemFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    sets: blankToNull(form.get("sets")),
    reps: blankToNull(form.get("reps")),
    targetWeight: blankToNull(form.get("targetWeight")),
    restSeconds: blankToNull(form.get("restSeconds")),
    notes: form.get("notes") ?? "",
  };
}

export function routineItemIdFormValues(form: FormData) {
  return { id: form.get("id") ?? undefined };
}

export function addRoutineItemFormValues(form: FormData) {
  return {
    dayId: form.get("dayId") ?? undefined,
    exerciseId: form.get("exerciseId") ?? undefined,
  };
}

export function replaceRoutineItemFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    exerciseId: form.get("exerciseId") ?? undefined,
  };
}
