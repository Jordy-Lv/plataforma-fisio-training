import { z } from "zod";
import { membershipStatuses } from "@/lib/progress/membership-vocabulary";

/** Lo que devuelve una server action de membresías. */
export type MembershipState = { error?: string; success?: string };

const uuid = (error: string) => z.string().uuid(error);

const dateOn = (error: string) =>
  z
    .string({ error })
    .regex(/^\d{4}-\d{2}-\d{2}$/, error);

const membershipFields = {
  patientId: uuid("Selecciona un paciente válido."),
  planId: uuid("Selecciona un plan válido."),
  startedOn: dateOn("Indica la fecha de ingreso."),
  expiresOn: dateOn("Indica la fecha de vencimiento."),
  amount: z.coerce
    .number({ error: "Indica el monto de la mensualidad." })
    .min(0, "El monto no puede ser negativo.")
    .max(100_000_000, "Ese monto es demasiado alto. Revísalo."),
  status: z.enum(membershipStatuses, {
    error: "Elige un estado de la lista.",
  }),
  notes: z
    .string()
    .trim()
    .max(500, "La observación admite como máximo 500 caracteres.")
    .transform((value) => value || null),
};

/** La fecha de vencimiento no puede ser anterior a la de ingreso. */
const datesInOrder = {
  check: (value: { startedOn: string; expiresOn: string }) =>
    value.expiresOn >= value.startedOn,
  params: {
    error: "La fecha de vencimiento no puede ser anterior a la de ingreso.",
    path: ["expiresOn"],
  },
};

export const createMembershipSchema = z
  .object(membershipFields)
  .refine(datesInOrder.check, datesInOrder.params);

export const updateMembershipSchema = z
  .object({
    ...membershipFields,
    id: uuid("Selecciona una membresía válida."),
  })
  .refine(datesInOrder.check, datesInOrder.params);

/**
 * Plazo de aviso de vencimiento, en días. Lo comparten el editor del panel de
 * administración y la ruta del cron para que ambos rechacen exactamente lo
 * mismo: entero de 1 a 90.
 */
export const noticeDaysSchema = z.coerce
  .number({ error: "Indica el plazo de aviso en días." })
  .int("El plazo de aviso se cuenta en días enteros.")
  .min(1, "El plazo de aviso debe ser de al menos un día.")
  .max(90, "Un plazo mayor de 90 días no tiene sentido para un aviso.");

export function membershipFormValues(form: FormData) {
  return {
    id: form.get("id") ?? undefined,
    patientId: form.get("patientId") ?? undefined,
    planId: form.get("planId") ?? undefined,
    startedOn: form.get("startedOn") ?? undefined,
    expiresOn: form.get("expiresOn") ?? undefined,
    amount: form.get("amount") ?? undefined,
    status: form.get("status") ?? undefined,
    notes: form.get("notes") ?? "",
  };
}
