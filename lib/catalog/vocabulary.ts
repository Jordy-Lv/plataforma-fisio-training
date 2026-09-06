/**
 * Vocabulario del catálogo de ejercicios y sus etiquetas en español.
 *
 * Los valores en inglés son los que viven en `exercises.muscle_groups` y
 * `exercises.environments`; las etiquetas son lo único que ve el equipo.
 * El equipamiento no se redefine aquí: es el mismo vocabulario cerrado que usa
 * el registro del paciente, y vive en `lib/catalog/equipment.ts`.
 */
import { equipment, equipmentLabels } from "@/lib/catalog/equipment";

export { equipment, equipmentLabels };
export type { Equipment } from "@/lib/catalog/equipment";

/** Grupos musculares tal como los siembra free-exercise-db. */
export const muscleGroups = [
  "abdominals",
  "abductors",
  "adductors",
  "biceps",
  "calves",
  "chest",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "lower back",
  "middle back",
  "neck",
  "quadriceps",
  "shoulders",
  "traps",
  "triceps",
] as const;

export type MuscleGroup = (typeof muscleGroups)[number];

export const muscleGroupLabels: Record<MuscleGroup, string> = {
  abdominals: "Abdominales",
  abductors: "Abductores",
  adductors: "Aductores",
  biceps: "Bíceps",
  calves: "Pantorrillas",
  chest: "Pecho",
  forearms: "Antebrazos",
  glutes: "Glúteos",
  hamstrings: "Isquiotibiales",
  lats: "Dorsales",
  "lower back": "Zona lumbar",
  "middle back": "Espalda media",
  neck: "Cuello",
  quadriceps: "Cuádriceps",
  shoulders: "Hombros",
  traps: "Trapecios",
  triceps: "Tríceps",
};

/** Coincide con el enum `training_environment`. */
export const environments = ["home", "gym"] as const;

export type Environment = (typeof environments)[number];

export const environmentLabels: Record<Environment, string> = {
  home: "En casa",
  gym: "En gimnasio",
};

/** Coincide con el enum `fitness_level`. */
export const difficultyLabels: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

/** Etiqueta legible para un valor guardado; si no lo conoce, lo devuelve tal cual. */
export function labelFor(labels: Record<string, string>, value: string) {
  return labels[value] ?? value;
}

/** Coincide con el enum `professional_specialty`: de qué equipo es la plantilla. */
export const templateKinds = ["training", "physio"] as const;

export type TemplateKind = (typeof templateKinds)[number];

export const templateKindLabels: Record<TemplateKind, string> = {
  training: "Entrenamiento",
  physio: "Fisioterapia",
};

/**
 * Coincide con el enum `patient_goal`. Las etiquetas están en tercera persona
 * porque aquí las lee el equipo, no el paciente: en el registro, el mismo
 * vocabulario se le presenta en primera persona.
 */
export const goals = [
  "lose_weight",
  "gain_muscle",
  "performance",
  "rehab",
  "general_health",
] as const;

export type Goal = (typeof goals)[number];

export const goalLabels: Record<Goal, string> = {
  lose_weight: "Bajar de peso",
  gain_muscle: "Ganar músculo",
  performance: "Rendimiento",
  rehab: "Rehabilitación",
  general_health: "Salud general",
};

/** Coincide con el enum `fitness_level`; sus etiquetas son `difficultyLabels`. */
export const levels = ["beginner", "intermediate", "advanced"] as const;

export type Level = (typeof levels)[number];
