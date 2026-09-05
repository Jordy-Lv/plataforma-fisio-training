/**
 * Vocabulario de la oferta comercial: periodicidad de cobro y categorías de
 * servicio adicional, con sus etiquetas en español, y el formato de precio.
 *
 * Las claves en inglés son los valores de los enums `billing_period` y
 * `service_category` del esquema; las etiquetas son lo único que ve el usuario.
 */

export const billingPeriods = [
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
] as const;

export type BillingPeriod = (typeof billingPeriods)[number];

export const billingPeriodLabels: Record<BillingPeriod, string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

/** Cómo se nombra el periodo junto al precio: "al mes", "al año"… */
export const billingPeriodSuffix: Record<BillingPeriod, string> = {
  monthly: "al mes",
  quarterly: "al trimestre",
  semiannual: "al semestre",
  annual: "al año",
};

export const serviceCategories = [
  "nutrition",
  "physio",
  "martial_arts",
  "workshop",
  "training",
] as const;

export type ServiceCategory = (typeof serviceCategories)[number];

export const serviceCategoryLabels: Record<ServiceCategory, string> = {
  nutrition: "Nutrición",
  physio: "Fisioterapia",
  martial_arts: "Artes marciales",
  workshop: "Talleres",
  training: "Entrenamiento",
};

/**
 * El peso colombiano no usa decimales en el día a día del negocio. Se formatea
 * aquí y no en cada pantalla para que "$120.000" se escriba igual en todas.
 */
const currencyFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined
    ? "—"
    : currencyFormat.format(value);
}
