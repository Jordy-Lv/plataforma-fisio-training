import { z } from "zod";
import { bodyParts } from "@/lib/catalog/body-parts";

const id = z.string().uuid("Selecciona un registro válido.");
const nullableNumber = (max: number, label: string, integer = true) => z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  (integer ? z.coerce.number().int(`${label} debe ser un número entero.`) : z.coerce.number())
    .min(0, `${label} no puede ser negativo.`).max(max, `${label} no puede superar ${max}.`).nullable(),
);
export const startSessionSchema = z.object({ dayId: id });
export const closeSessionSchema = z.object({ sessionId: id });
export const sessionLogSchema = z.object({
  sessionId: id,
  itemId: id,
  status: z.enum(["done", "skipped", "modified"], { error: "Indica si lo hiciste, saltaste o modificaste." }),
  actualSets: nullableNumber(100, "Las series"),
  actualReps: nullableNumber(1000, "Las repeticiones"),
  actualWeight: nullableNumber(9999.99, "El peso", false),
  perceivedEffort: z.preprocess((value) => value === "" || value === undefined ? null : value,
    z.coerce.number().int().min(1, "El esfuerzo debe estar entre 1 y 10.").max(10, "El esfuerzo debe estar entre 1 y 10.").nullable()),
  painLevel: z.coerce.number().int("El dolor debe ser un número entero.").min(0, "El nivel de dolor debe estar entre 0 y 10.").max(10, "El nivel de dolor debe estar entre 0 y 10."),
  painLocation: z.preprocess((value) => value === "" || value === undefined ? null : value,
    z.enum(bodyParts, { error: "Selecciona una zona del cuerpo válida." }).nullable()),
  notes: z.string().trim().max(2000, "La observación no puede superar 2000 caracteres."),
  replacedByExerciseId: z.preprocess((value) => value === "" || value === undefined ? null : value, id.nullable()),
}).superRefine((value, ctx) => {
  if ((value.status === "skipped" || value.painLevel > 0) && !value.painLocation)
    ctx.addIssue({ code: "custom", path: ["painLocation"], message: "Indica la zona al reportar dolor o saltar un ejercicio." });
  if (value.status === "skipped" && !value.notes)
    ctx.addIssue({ code: "custom", path: ["notes"], message: "Explica el motivo antes de saltar el ejercicio." });
  if (value.replacedByExerciseId && value.status !== "modified")
    ctx.addIssue({ code: "custom", path: ["status"], message: "Marca como modificado para registrar una sustitución." });
});
export const readAlertSchema = z.object({ alertId: id });
export type RoutineActionState = { error?: string; success?: string };
