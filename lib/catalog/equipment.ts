export const equipment = [
  "none",
  "bands",
  "dumbbells",
  "barbell",
  "machines",
  "kettlebells",
  "ball",
  "other",
] as const;
export type Equipment = (typeof equipment)[number];
export const equipmentLabels: Record<Equipment, string> = {
  none: "Peso corporal",
  bands: "Bandas",
  dumbbells: "Mancuernas",
  barbell: "Barra",
  machines: "Máquinas",
  kettlebells: "Pesas rusas",
  ball: "Balón",
  other: "Otro equipo",
};
