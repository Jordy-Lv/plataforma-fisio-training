import { z } from "zod";
import {
  billingPeriods,
  serviceCategories,
} from "@/lib/progress/plan-vocabulary";

/** Lo que devuelve una server action de planes o servicios. */
export type PlanState = { error?: string; success?: string };

const uuid = (error: string) => z.string().uuid(error);

/**
 * Las prestaciones de un plan llegan como texto libre, una por línea. Se
 * parten aquí para que la tabla reciba siempre un `text[]` limpio y ninguna
 * pantalla tenga que volver a interpretarlas.
 */
const features = z
  .string()
  .max(2000, "La lista de lo que incluye admite como máximo 2000 caracteres.")
  .transform((value) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  )
  .pipe(
    z
      .array(z.string().max(200, "Cada línea admite como máximo 200 caracteres."))
      .max(20, "Un plan no puede listar más de 20 prestaciones."),
  );

const planFields = {
  name: z
    .string({ error: "Escribe el nombre del plan." })
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(120, "Usa como máximo 120 caracteres."),
  description: z
    .string()
    .trim()
    .max(1000, "La descripción admite como máximo 1000 caracteres.")
    .transform((value) => value || null),
  price: z.coerce
    .number({ error: "Indica el precio del plan." })
    .min(0, "El precio no puede ser negativo.")
    .max(100_000_000, "Ese precio es demasiado alto. Revísalo."),
  billingPeriod: z.enum(billingPeriods, {
    error: "Indica cada cuánto se cobra el plan.",
  }),
  features,
};

export const createPlanSchema = z.object(planFields);

export const updatePlanSchema = z.object({
  ...planFields,
  id: uuid("Selecciona un plan válido."),
});

export const planIdSchema = z.object({
  id: uuid("Selecciona un plan válido."),
});

/** Activar o desactivar; qué desaparece de la vitrina se explica en la acción. */
export const setPlanActiveSchema = z.object({
  id: uuid("Selecciona un plan válido."),
  intent: z.enum(["activate", "deactivate"], {
    error: "Solo se puede activar o desactivar un plan.",
  }),
});

const serviceFields = {
  name: z
    .string({ error: "Escribe el nombre del servicio." })
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(120, "Usa como máximo 120 caracteres."),
  description: z
    .string()
    .trim()
    .max(1000, "La descripción admite como máximo 1000 caracteres.")
    .transform((value) => value || null),
  price: z.coerce
    .number({ error: "Indica el precio del servicio." })
    .min(0, "El precio no puede ser negativo.")
    .max(100_000_000, "Ese precio es demasiado alto. Revísalo."),
  category: z.enum(serviceCategories, {
    error: "Elige una categoría de la lista.",
  }),
};

export const createServiceSchema = z.object(serviceFields);

export const updateServiceSchema = z.object({
  ...serviceFields,
  id: uuid("Selecciona un servicio válido."),
});

export const serviceIdSchema = z.object({
  id: uuid("Selecciona un servicio válido."),
});

export const setServiceActiveSchema = z.object({
  id: uuid("Selecciona un servicio válido."),
  intent: z.enum(["activate", "deactivate"], {
    error: "Solo se puede activar o desactivar un servicio.",
  }),
});

export function planFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    name: form.get("name") ?? undefined,
    description: form.get("description") ?? "",
    price: form.get("price") ?? undefined,
    billingPeriod: form.get("billingPeriod") ?? undefined,
    features: form.get("features") ?? "",
  };
}

export function serviceFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    name: form.get("name") ?? undefined,
    description: form.get("description") ?? "",
    price: form.get("price") ?? undefined,
    category: form.get("category") ?? undefined,
  };
}

export function idFormValues(form: FormData) {
  return { id: form.get("id") ?? undefined };
}

export function setActiveFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    intent: form.get("intent") ?? undefined,
  };
}
