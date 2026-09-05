import { z } from "zod";
import { bodyParts } from "@/lib/catalog/body-parts";
import { equipment } from "@/lib/catalog/equipment";

export const goalLabels = {
  lose_weight: "Bajar de peso",
  gain_muscle: "Ganar músculo",
  performance: "Mejorar mi rendimiento",
  rehab: "Recuperarme de una lesión",
  general_health: "Cuidar mi salud",
};
export const levelLabels = {
  beginner: "Estoy empezando",
  intermediate: "Entreno con regularidad",
  advanced: "Tengo experiencia avanzada",
};
export const environmentLabels = { home: "En casa", gym: "En gimnasio" };
export const severityLabels = {
  mild: "Leve",
  moderate: "Moderada",
  severe: "Severa",
};
export const goalSchema = z.object({
  goal: z.enum(
    ["lose_weight", "gain_muscle", "performance", "rehab", "general_health"],
    { error: "Selecciona tu objetivo." },
  ),
  level: z.enum(["beginner", "intermediate", "advanced"], {
    error: "Selecciona tu nivel.",
  }),
});
export const environmentSchema = z.object({
  environment: z.enum(["home", "gym"], { error: "Selecciona dónde entrenas." }),
  equipment: z
    .array(z.enum(equipment, { error: "Selecciona equipamiento de la lista." }))
    .min(1, "Selecciona al menos una opción; puedes elegir peso corporal.")
    .max(8, "Revisa el equipamiento seleccionado."),
});
export const patientProfileSchema = goalSchema.extend(environmentSchema.shape);
export const conditionSchema = z.object({
  body_part: z.enum(bodyParts, {
    error: "Parte del cuerpo inválida. Selecciona una zona de la lista.",
  }),
  severity: z.enum(["mild", "moderate", "severe"], {
    error: "Selecciona la severidad.",
  }),
  notes: z
    .string()
    .trim()
    .max(1000, "Usa como máximo 1000 caracteres en las notas."),
});
export const conditionsSchema = z
  .array(conditionSchema)
  .max(20, "Registra como máximo 20 condiciones.");
export const patientIdSchema = z
  .string()
  .uuid("Selecciona un paciente válido.");
