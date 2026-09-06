import { z } from "zod";
import { evaluateRules } from "@/lib/catalog/evaluate-rules";
import { filterContraindicated } from "@/lib/catalog/filter-contraindications";
import { simulationProfileSchema } from "@/lib/catalog/simulation-schemas";

export const assignmentSchema = z.object({
  patientId: z.string().uuid("Selecciona un paciente válido."),
});

const contextSchema = z.object({
  profile: simulationProfileSchema,
  onboarding_step: z.literal(3, { error: "El paciente debe completar su perfil." }),
  rules: z.array(z.object({
    id: z.string().uuid(), name: z.string(), priority: z.number(),
    template_id: z.string().uuid(), is_active: z.boolean(), conditions: z.unknown(),
  })),
  templates: z.array(z.object({
    id: z.string().uuid(), name: z.string(), is_active: z.boolean(),
    days: z.array(z.object({
      day_number: z.number(),
      items: z.array(z.object({
        exercise: z.object({
          id: z.string().uuid(), name: z.string(), contraindications: z.array(z.string()),
        }),
      })),
    })),
  })),
});

/** Consume el contrato del slice 2 sin duplicar el motor ni el filtro. */
export function prepareAssignment(context: unknown) {
  const parsed = contextSchema.safeParse(context);
  if (!parsed.success)
    throw new Error("El perfil del paciente está incompleto o contiene valores inválidos. Revísalo antes de asignar.");
  const { profile, rules, templates } = parsed.data;
  const match = evaluateRules(profile, rules);
  if (!match) return { selectedRule: undefined, excludedExercises: [], notes: "" };
  const template = templates.find((item) => item.id === match.rule.template_id);
  if (!template?.is_active)
    throw new Error("La regla ganadora apunta a una plantilla inactiva. Actívala o corrige la regla antes de asignar.");
  if (!template.days.length || template.days.some((day) => !day.items.length))
    throw new Error("La plantilla tiene días sin ejercicios. Completa la plantilla antes de asignar.");
  const plan = filterContraindicated(template.days, profile.conditions);
  return {
    selectedRule: match.rule.id,
    excludedExercises: [...new Set(plan.removed.map((item) => item.exercise_id))].sort(),
    notes: [`Regla aplicada: ${match.rule.name}.`,
      ...match.checks.map((check) => `${check.criterion}: ${check.actual}; requiere ${check.expected}.`),
      plan.notes].filter(Boolean).join("\n"),
  };
}

export type AssignmentState = { error?: string; success?: string };
