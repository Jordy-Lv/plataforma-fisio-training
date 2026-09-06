import { z } from "zod";
import { today, type Measurement } from "@/lib/progress/vocabulary";

/** Lo que devuelve una server action del seguimiento. */
export type ProgressState = { error?: string; success?: string };

/**
 * Un campo numérico vacío llega como cadena vacía, que no es "cero" sino "no
 * se midió". Se convierte a `undefined` antes de comprobar el rango.
 */
const blank = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

function measure(min: number, max: number, error: string) {
  return z.preprocess(
    blank,
    z.coerce.number({ error }).min(min, error).max(max, error),
  );
}

/**
 * Igual que `measure`, pero un campo vacío es válido. El `.optional()` va
 * DENTRO del `preprocess`: `blank` ya convirtió la cadena vacía del formulario
 * en `undefined` cuando se comprueba. Con el `.optional()` por fuera nunca se
 * activaba —el navegador envía `""`, no `undefined`— y el rango fallaba sobre
 * un `NaN`, así que los campos marcados "· opcional" eran obligatorios de facto.
 */
function optionalMeasure(min: number, max: number, error: string) {
  return z.preprocess(
    blank,
    z.coerce.number({ error }).min(min, error).max(max, error).optional(),
  );
}

const bodyMeasure = optionalMeasure(
  10,
  250,
  "Cada medida corporal debe estar entre 10 y 250 cm.",
);

/** Las mismas claves de `lib/progress/vocabulary.ts`, dentro de `measurements`. */
const measurementsSchema = z.object({
  chest_cm: bodyMeasure,
  waist_cm: bodyMeasure,
  hip_cm: bodyMeasure,
  arm_cm: bodyMeasure,
  thigh_cm: bodyMeasure,
  calf_cm: bodyMeasure,
} satisfies Record<Measurement, typeof bodyMeasure>);

const takenOn = z
  .string({ error: "Indica la fecha del tamizaje." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Indica la fecha del tamizaje.")
  .refine(
    (value) => value <= today(),
    "La fecha del tamizaje no puede ser futura.",
  );

/**
 * Peso y talla son obligatorios porque de ellos sale el IMC, que es la métrica
 * que sigue el negocio. El resto de medidas se toman cuando hay tiempo.
 */
export const createScreeningSchema = z.object({
  patientId: z.string().uuid("Selecciona un paciente válido."),
  takenOn,
  weightKg: measure(20, 300, "El peso debe estar entre 20 y 300 kg."),
  heightCm: measure(100, 250, "La talla debe estar entre 100 y 250 cm."),
  bodyFatPct: optionalMeasure(
    1,
    70,
    "El porcentaje de grasa debe estar entre 1 y 70.",
  ),
  measurements: measurementsSchema,
  notes: z
    .string()
    .trim()
    .max(1000, "Usa como máximo 1000 caracteres en las observaciones.")
    .optional(),
});

/** Lee el formulario de tamizaje tal como lo envía el navegador. */
export function screeningFormValues(form: FormData) {
  const value = (name: string) => form.get(name) ?? undefined;
  return {
    patientId: value("patientId"),
    takenOn: value("takenOn"),
    weightKg: value("weightKg"),
    heightCm: value("heightCm"),
    bodyFatPct: value("bodyFatPct"),
    measurements: {
      chest_cm: value("chest_cm"),
      waist_cm: value("waist_cm"),
      hip_cm: value("hip_cm"),
      arm_cm: value("arm_cm"),
      thigh_cm: value("thigh_cm"),
      calf_cm: value("calf_cm"),
    },
    notes: value("notes"),
  };
}
