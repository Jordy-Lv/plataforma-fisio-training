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

/**
 * El negocio opera en Colombia: la fecha de "hoy" y la hora de un registro se
 * leen en esa zona, no en la del servidor. Sin esto, una asistencia tomada a
 * las siete de la noche quedaría fechada al día siguiente.
 */
const timeZone = "America/Bogota";

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

const timeFormat = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  timeZone,
});

/**
 * La hora de un `timestamptz`, o `null` si la columna viene vacía —es lo que
 * ocurre cuando se registra un día pasado, del que nadie recuerda la hora.
 */
export function formatTime(value: string | null | undefined) {
  return value === null || value === undefined ? null : timeFormat.format(new Date(value));
}

const shortDateFormat = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** La fecha como cabe en el eje de una gráfica: "5 sept". */
export function formatShortDate(value: string) {
  return shortDateFormat.format(new Date(`${value}T00:00:00Z`));
}

const monthFormat = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** El mes de una fecha `YYYY-MM-DD`, para encabezar un resumen. */
export function formatMonth(value: string) {
  return monthFormat.format(new Date(`${value}T00:00:00Z`));
}

/**
 * La fecha de hoy en el formato que esperan un `input[type=date]` y una
 * columna `date`. `en-CA` es el truco estándar para obtener `YYYY-MM-DD`.
 */
export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** El primer día del mes en curso, para acotar el resumen mensual. */
export function monthStart() {
  return `${today().slice(0, 7)}-01`;
}

/** El primer día del mes anterior, para comparar el mes en curso con él. */
export function previousMonthStart() {
  const [year, month] = today().split("-").map(Number);
  return month === 1
    ? `${year - 1}-12-01`
    : `${year}-${String(month - 1).padStart(2, "0")}-01`;
}

/** La fecha `YYYY-MM-DD` de un `timestamptz` en el día del negocio. */
function dayOf(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(value));
}

/**
 * Cuándo pasó algo, dicho como se dice: «Hoy · 8:15 a. m.», «Ayer · 6:02 p. m.»
 * o «21 sept · 10:29 p. m.». Cuenta en la zona del negocio, no la del servidor.
 */
export function formatWhen(value: string) {
  const day = dayOf(value);
  const now = Date.parse(`${today()}T00:00:00Z`);
  const days = Math.round((now - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
  const label =
    days === 0 ? "Hoy" : days === 1 ? "Ayer" : formatShortDate(day);
  return `${label} · ${formatTime(value)}`;
}

/**
 * "1 vez" y "3 veces": el plural en español no sale de añadir una `s`, así que
 * el recuento de asistencias se escribe aquí y no en cada pantalla.
 */
export function formatTimes(count: number) {
  return count === 1 ? "1 vez" : `${count} veces`;
}
