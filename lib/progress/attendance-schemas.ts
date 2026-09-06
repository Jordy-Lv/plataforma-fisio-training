import { z } from "zod";
import { today } from "@/lib/progress/vocabulary";
import type { ProgressState } from "@/lib/progress/screening-schemas";

export type { ProgressState };

/**
 * La asistencia se registra en el mostrador, casi siempre el mismo día. Se
 * admite una fecha anterior para cuadrar el papel del día que no se pasó,
 * pero nunca una futura: dejaría constancia de algo que no ha ocurrido.
 */
const attendedOn = z
  .string({ error: "Indica la fecha de la asistencia." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Indica la fecha de la asistencia.")
  .refine(
    (value) => value <= today(),
    "La fecha de la asistencia no puede ser futura.",
  );

export const registerAttendanceSchema = z.object({
  patientId: z.string().uuid("Selecciona un paciente válido."),
  attendedOn,
  notes: z
    .string()
    .trim()
    .max(500, "Usa como máximo 500 caracteres en la observación.")
    .optional(),
});

/** Lee el formulario de asistencia tal como lo envía el navegador. */
export function attendanceFormValues(form: FormData) {
  const value = (name: string) => form.get(name) ?? undefined;
  return {
    patientId: value("patientId"),
    attendedOn: value("attendedOn"),
    notes: value("notes"),
  };
}
