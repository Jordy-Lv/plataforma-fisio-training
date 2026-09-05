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
