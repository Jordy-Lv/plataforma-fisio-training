/**
 * Vocabulario del seguimiento físico y sus etiquetas en español.
 *
 * Las claves en inglés son las que viven dentro de `screenings.measurements`;
 * las etiquetas son lo único que ve el equipo. El sufijo `_cm` va en la clave
 * para que la unidad viaje con el dato y no dependa de la pantalla.
 */
export const measurements = [
  "chest_cm",
  "waist_cm",
  "hip_cm",
  "arm_cm",
  "thigh_cm",
  "calf_cm",
] as const;

export type Measurement = (typeof measurements)[number];

export const measurementLabels: Record<Measurement, string> = {
  chest_cm: "Pecho",
  waist_cm: "Cintura",
  hip_cm: "Cadera",
  arm_cm: "Brazo",
  thigh_cm: "Muslo",
  calf_cm: "Pantorrilla",
};

const numberFormat = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
});

/** Un valor numérico del tamizaje tal como se muestra, o un guion si falta. */
export function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : numberFormat.format(value);
}

const dateFormat = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * `taken_on` es un `date`: se interpreta en UTC para que no se corra un día
 * según la zona horaria del servidor.
 */
export function formatDate(value: string) {
  return dateFormat.format(new Date(`${value}T00:00:00Z`));
}

/** La fecha de hoy en el formato que espera un `input[type=date]`. */
export function today() {
  return new Date().toISOString().slice(0, 10);
}
