import { z } from "zod";
import { bodyParts } from "@/lib/catalog/body-parts";
import { environments, levels, templateKinds } from "@/lib/catalog/vocabulary";
import { isSchedulingDate, todayInBogota } from "@/lib/routines/calendar";

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
  // Sin escalón marcado, `painLevel` no llega en el FormData: el `error` da un
  // aviso claro en vez del "expected number, received NaN" de Zod.
  painLevel: z.coerce.number({ error: "Marca el nivel de dolor; usa 0 si no hubo." }).int("El dolor debe ser un número entero.").min(0, "El nivel de dolor debe estar entre 0 y 10.").max(10, "El nivel de dolor debe estar entre 0 y 10."),
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
export const calendarDateSchema = z.iso.date({ error: "Elige una fecha válida." })
  .refine((value) => value >= "1900-01-01" && value <= "2200-12-31", "Elige una fecha entre 1900 y 2200.");
export const calendarQuerySchema = z.object({
  date: calendarDateSchema.optional(),
  view: z.enum(["month", "week"], { error: "Elige la vista de mes o semana." }).default("month"),
});
export const scheduleRoutineSchema = z.object({
  patientId: id,
  dayId: id,
  scheduledOn: calendarDateSchema.refine((date) => isSchedulingDate(date, todayInBogota()), "Elige una fecha desde hoy y hasta un año."),
});
export const cancelScheduleSchema = z.object({ patientId: id, scheduleId: id });
/**
 * `at` lo marcan las acciones de la asignación: la pantalla muestra solo el
 * acuse de la última, porque sus tres estados conviven entre pasos.
 */
export type RoutineActionState = { error?: string; success?: string; at?: number };

/** Elegir una plantilla crea el borrador (ADR-0009). */
export const chooseTemplateSchema = z.object({
  patientId: z.string().uuid("Selecciona un paciente válido."),
  templateId: z.string().uuid("Elige una plantilla de la lista."),
});
/** Confirmar o descartar un borrador. */
export const routineDraftSchema = z.object({
  patientId: z.string().uuid("Selecciona un paciente válido."),
  routineId: z.string().uuid("Recarga la página: no encontramos el borrador."),
});
/**
 * Filtros de la lista de plantillas, en la URL. Un valor inválido se ignora en
 * vez de romper la página: el filtro solo estrecha. `tipo` solo lo usa el
 * administrador; al profesional le manda su especialidad.
 */
export const templateFiltersSchema = z.object({
  dias: z.coerce.number().int().min(1).max(7).optional().catch(undefined),
  nivel: z.enum(levels).optional().catch(undefined),
  entorno: z.enum(environments).optional().catch(undefined),
  tipo: z.enum(templateKinds).optional().catch(undefined),
  paso: z.literal("plantilla").optional().catch(undefined),
});
export type TemplateFilters = z.infer<typeof templateFiltersSchema>;
