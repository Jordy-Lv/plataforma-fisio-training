export const bodyParts = [
  "neck",
  "shoulder",
  "elbow",
  "wrist",
  "upper_back",
  "lower_back",
  "hip",
  "knee",
  "ankle",
  "foot",
  "core",
  "other",
] as const;
export const bodyPartLabels: Record<(typeof bodyParts)[number], string> = {
  neck: "Cuello",
  shoulder: "Hombro",
  elbow: "Codo",
  wrist: "Muñeca",
  upper_back: "Espalda alta",
  lower_back: "Espalda baja",
  hip: "Cadera",
  knee: "Rodilla",
  ankle: "Tobillo",
  foot: "Pie",
  core: "Abdomen",
  other: "Otra zona",
};

/**
 * Zonas del cuerpo que un ejercicio de cada grupo muscular puede hacer doler.
 *
 * No es anatomía: es lo que se ofrece **primero** al paciente cuando registra
 * dolor a mitad de sesión. Doce zonas en un desplegable, de pie y entre series,
 * son once de más; con el ejercicio delante, dos o tres aciertan casi siempre.
 * El resto sigue estando a un toque —el formulario ofrece la lista completa—,
 * así que un acortamiento equivocado no impide reportar nada.
 */
export const bodyPartsByMuscleGroup: Record<string, (typeof bodyParts)[number][]> = {
  abdominals: ["core", "lower_back"],
  abductors: ["hip", "knee"],
  adductors: ["hip", "knee"],
  biceps: ["elbow", "shoulder"],
  calves: ["ankle", "foot", "knee"],
  chest: ["shoulder", "upper_back"],
  forearms: ["wrist", "elbow"],
  glutes: ["hip", "lower_back"],
  hamstrings: ["knee", "hip"],
  lats: ["upper_back", "shoulder"],
  "lower back": ["lower_back", "hip"],
  "middle back": ["upper_back", "neck"],
  neck: ["neck", "upper_back"],
  quadriceps: ["knee", "hip"],
  shoulders: ["shoulder", "neck"],
  traps: ["neck", "upper_back"],
  triceps: ["elbow", "shoulder"],
};

/**
 * Las zonas que se ofrecen para los grupos musculares de un ejercicio, en el
 * orden de `bodyParts` y siempre con «Otra zona» al final. Sin grupos
 * etiquetados devuelve la lista completa: acortar a ciegas escondería la zona
 * que duele.
 */
export function bodyPartsFor(muscleGroups: string[]): (typeof bodyParts)[number][] {
  const zones = new Set(muscleGroups.flatMap((group) => bodyPartsByMuscleGroup[group] ?? []));
  if (zones.size === 0) return [...bodyParts];
  zones.add("other");
  return bodyParts.filter((part) => zones.has(part));
}
