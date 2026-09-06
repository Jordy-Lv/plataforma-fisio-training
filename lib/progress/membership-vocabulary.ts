import { today } from "@/lib/progress/vocabulary";

/**
 * Vocabulario del control de mensualidades: los estados de una membresía y sus
 * etiquetas en español. Las claves son los valores del enum `membership_status`.
 */
export const membershipStatuses = [
  "active",
  "expiring_soon",
  "expired",
  "cancelled",
] as const;

export type MembershipStatus = (typeof membershipStatuses)[number];

export const membershipStatusLabels: Record<MembershipStatus, string> = {
  active: "Activa",
  expiring_soon: "Próxima a vencer",
  expired: "Vencida",
  cancelled: "Cancelada",
};

/**
 * Días que faltan para una fecha `YYYY-MM-DD`, contados desde el «hoy» del
 * negocio en Colombia. Negativo si la fecha ya pasó. Se calcula sobre fechas
 * sin hora, en UTC, para que no se corra un día según la zona del servidor.
 */
export function daysUntil(dateOn: string) {
  const target = Date.parse(`${dateOn}T00:00:00Z`);
  const now = Date.parse(`${today()}T00:00:00Z`);
  return Math.round((target - now) / 86_400_000);
}

/** Cómo se dice el plazo restante: "vence hoy", "en 3 días", "venció hace 2 días". */
export function formatDueIn(dateOn: string) {
  const days = daysUntil(dateOn);
  if (days === 0) return "vence hoy";
  if (days === 1) return "vence mañana";
  if (days === -1) return "venció ayer";
  return days > 0 ? `vence en ${days} días` : `venció hace ${-days} días`;
}
