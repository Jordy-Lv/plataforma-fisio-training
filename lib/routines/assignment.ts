import { z } from "zod";

/**
 * El paciente de la pantalla de rutina. La asignación ya no evalúa reglas
 * (ADR-0009): el profesional elige la plantilla, ver `assignment-actions.ts`.
 */
export const assignmentSchema = z.object({
  patientId: z.string().uuid("Selecciona un paciente válido."),
});
