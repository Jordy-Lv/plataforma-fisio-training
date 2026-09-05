import { z } from "zod";
import { ruleConditionsSchema } from "@/lib/catalog/rules-schema";

/**
 * Lo que el panel envía al crear o editar una regla de asignación.
 *
 * El criterio no se escribe como JSON: el formulario tiene una casilla por
 * valor y aquí se arma el objeto que `rules-schema.ts` valida. Las reglas de
 * validación no se duplican —son las mismas del motor—; esto solo traduce un
 * `FormData` a la forma que espera el esquema.
 */

/** Lo que devuelve una server action de reglas. */
export type RuleState = { error?: string; success?: string };

const uuid = (error: string) => z.string().uuid(error);

const ruleFields = {
  name: z
    .string({ error: "Escribe el nombre de la regla." })
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(120, "Usa como máximo 120 caracteres."),
  /** Menor número, antes se evalúa. */
  priority: z.coerce
    .number({ error: "Indica la prioridad de la regla." })
    .int("La prioridad debe ser un número entero entre 1 y 999.")
    .min(1, "La prioridad debe ser un número entero entre 1 y 999.")
    .max(999, "La prioridad debe ser un número entero entre 1 y 999."),
  templateId: uuid("Selecciona la plantilla que asignará esta regla."),
  conditions: ruleConditionsSchema,
};

export const createRuleSchema = z.object(ruleFields);

export const updateRuleSchema = z.object({
  ...ruleFields,
  id: uuid("Selecciona una regla válida."),
});

export const ruleIdSchema = z.object({
  id: uuid("Selecciona una regla válida."),
});

export const moveRuleSchema = z.object({
  id: uuid("Selecciona una regla válida."),
  direction: z.enum(["up", "down"], {
    error: "Solo se puede subir o bajar una regla.",
  }),
});

export const setRuleActiveSchema = z.object({
  id: uuid("Selecciona una regla válida."),
  intent: z.enum(["activate", "deactivate"], {
    error: "Solo se puede activar o desactivar una regla.",
  }),
});

/**
 * Los valores marcados de un criterio. Sin ninguna casilla marcada el criterio
 * se omite, que es como se expresa «no me importa»: una lista vacía sería
 * ambigua y el esquema la rechaza a propósito.
 */
function checked(form: FormData, name: string) {
  const values = form
    .getAll(name)
    .filter((value): value is string => typeof value === "string" && value !== "");
  return values.length > 0 ? values : undefined;
}

/** Un campo numérico vacío es «sin límite», no un cero. */
function optionalAge(form: FormData, name: string) {
  const raw = form.get(name);
  if (raw === null || raw === "") return undefined;
  return Number(raw);
}

export function ruleConditionsFromForm(form: FormData) {
  const equipment = checked(form, "equipment");
  // Un solo grupo de casillas con dos modos: tener alguno o tenerlos todos.
  const requireAll = form.get("equipmentMode") === "all";
  const min = optionalAge(form, "ageMin");
  const max = optionalAge(form, "ageMax");

  return {
    goal: checked(form, "goal"),
    level: checked(form, "level"),
    environment: checked(form, "environment"),
    equipment_any_of: requireAll ? undefined : equipment,
    equipment_all_of: requireAll ? equipment : undefined,
    excludes_conditions: checked(form, "excludesConditions"),
    age_range:
      min === undefined && max === undefined ? undefined : { min, max },
  };
}

export function ruleFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    name: form.get("name") ?? undefined,
    priority: form.get("priority") ?? undefined,
    templateId: form.get("templateId") ?? undefined,
    conditions: ruleConditionsFromForm(form),
  };
}

export function idFormValues(form: FormData) {
  return { id: form.get("id") ?? undefined };
}

export function moveRuleFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    direction: form.get("direction") ?? undefined,
  };
}

export function setRuleActiveFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    intent: form.get("intent") ?? undefined,
  };
}
