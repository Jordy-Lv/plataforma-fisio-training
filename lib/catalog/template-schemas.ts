import { z } from "zod";
import {
  environments,
  goals,
  levels,
  templateKinds,
} from "@/lib/catalog/vocabulary";

/** Lo que devuelve una server action de plantillas. */
export type TemplateState = { error?: string; success?: string };

const uuid = (error: string) => z.string().uuid(error);

/**
 * Un `select` vacío significa «vale para cualquiera», que en la tabla es
 * `null`. El motor de reglas lo interpreta como criterio no restringido.
 */
const anyOf = <T extends readonly [string, ...string[]]>(
  values: T,
  error: string,
) => z.enum(values, { error }).nullable();

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

const templateFields = {
  name: z
    .string({ error: "Escribe el nombre de la plantilla." })
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(120, "Usa como máximo 120 caracteres."),
  kind: z.enum(templateKinds, {
    error: "Indica si la plantilla es de entrenamiento o de fisioterapia.",
  }),
  goal: anyOf(goals, "Ese objetivo no existe. Elige uno de la lista."),
  level: anyOf(levels, "Ese nivel no existe. Elige uno de la lista."),
  environment: anyOf(
    environments,
    "Ese entorno no existe. Elige uno de la lista.",
  ),
  daysPerWeek: z.coerce
    .number({ error: "Indica cuántos días por semana se entrena." })
    .int("Los días por semana deben estar entre 1 y 7.")
    .min(1, "Los días por semana deben estar entre 1 y 7.")
    .max(7, "Los días por semana deben estar entre 1 y 7."),
};

const dayTitle = z
  .string()
  .trim()
  .max(80, "El título del día admite como máximo 80 caracteres.")
  .transform((value) => value || null);

/**
 * El alta admite además el **primer día**, opcional (KAN-8). Crear una
 * plantilla asignable eran dos fases obligatorias —cabecera, redirección y
 * luego añadir día—; con un título aquí, la plantilla nace con su día 1 y solo
 * queda ponerle ejercicios. Vacío significa «lo añado después» y el flujo es
 * el de siempre: por eso el día no se crea salvo que se escriba algo.
 */
export const createTemplateSchema = z.object({
  ...templateFields,
  firstDayTitle: dayTitle,
});

export const updateTemplateSchema = z.object({
  ...templateFields,
  id: uuid("Selecciona una plantilla válida."),
});

export const templateIdSchema = z.object({
  id: uuid("Selecciona una plantilla válida."),
});

export const addDaySchema = z.object({
  templateId: uuid("Selecciona una plantilla válida."),
  title: dayTitle,
});

export const updateDaySchema = z.object({
  id: uuid("Selecciona un día válido."),
  title: dayTitle,
});

export const dayIdSchema = z.object({
  id: uuid("Selecciona un día válido."),
});

/**
 * La prescripción del ejercicio dentro del día. Todo es opcional: en
 * rehabilitación es normal indicar solo la ejecución y dejar las series al
 * criterio del profesional.
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
    .max(500, "Las notas admiten como máximo 500 caracteres.")
    .transform((value) => value || null),
};

export const addItemSchema = z.object({
  ...itemFields,
  dayId: uuid("Selecciona un día válido."),
  exerciseId: uuid("Selecciona un ejercicio del catálogo."),
});

export const updateItemSchema = z.object({
  ...itemFields,
  id: uuid("Selecciona un ejercicio de la plantilla."),
});

export const itemIdSchema = z.object({
  id: uuid("Selecciona un ejercicio de la plantilla."),
});

export const moveItemSchema = z.object({
  id: uuid("Selecciona un ejercicio de la plantilla."),
  direction: z.enum(["up", "down"], {
    error: "Solo se puede subir o bajar un ejercicio.",
  }),
});

/** Un campo vacío del formulario es «sin indicar», no una cadena vacía. */
const blankToNull = (value: FormDataEntryValue | null) =>
  value === null || value === "" ? null : value;

export function templateFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    name: form.get("name") ?? undefined,
    kind: form.get("kind") ?? undefined,
    goal: blankToNull(form.get("goal")),
    level: blankToNull(form.get("level")),
    environment: blankToNull(form.get("environment")),
    daysPerWeek: form.get("daysPerWeek") ?? undefined,
    // Solo lo lee `createTemplateSchema`; al editar, Zod lo descarta.
    firstDayTitle: form.get("firstDayTitle") ?? "",
  };
}

export function idFormValues(form: FormData) {
  return { id: form.get("id") ?? undefined };
}

export function addDayFormValues(form: FormData) {
  return {
    templateId: form.get("templateId") ?? undefined,
    title: form.get("title") ?? "",
  };
}

export function dayFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    title: form.get("title") ?? "",
  };
}

function itemValues(form: FormData) {
  return {
    sets: blankToNull(form.get("sets")),
    reps: blankToNull(form.get("reps")),
    targetWeight: blankToNull(form.get("targetWeight")),
    restSeconds: blankToNull(form.get("restSeconds")),
    notes: form.get("notes") ?? "",
  };
}

export function addItemFormValues(form: FormData) {
  return {
    ...itemValues(form),
    dayId: form.get("dayId") ?? undefined,
    exerciseId: form.get("exerciseId") ?? undefined,
  };
}

export function updateItemFormValues(form: FormData) {
  return { ...itemValues(form), id: form.get("id") ?? undefined };
}

export function moveItemFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    direction: form.get("direction") ?? undefined,
  };
}

/** Activar o desactivar una plantilla; la validación de completitud vive aparte. */
export const setActiveSchema = z.object({
  id: uuid("Selecciona una plantilla válida."),
  intent: z.enum(["activate", "deactivate"], {
    error: "Solo se puede activar o desactivar una plantilla.",
  }),
});

export function setActiveFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    intent: form.get("intent") ?? undefined,
  };
}
