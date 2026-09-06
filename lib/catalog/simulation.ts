import "server-only";

import {
  explainEvaluation,
  type Evaluation,
  type RuleProfile,
} from "@/lib/catalog/evaluate-rules";
import {
  filterContraindicated,
  type FilteredPlan,
} from "@/lib/catalog/filter-contraindications";
import { listEvaluableRules } from "@/lib/catalog/rule-queries";
import {
  getTemplate,
  type TemplateDay,
  type TemplateDetail,
} from "@/lib/catalog/template-queries";
import type { SimulationProfile } from "@/lib/catalog/simulation-schemas";

/**
 * El simulador: qué recibiría este perfil si se registrara ahora mismo.
 *
 * Hace exactamente lo que hará la asignación real —evaluar las reglas, copiar
 * la plantilla ganadora, filtrar lo contraindicado— usando las mismas
 * funciones puras, y **solo lee**: no inserta, no actualiza y no borra nada.
 * Esa es toda la garantía de que una simulación no deja rastro; no hay una
 * segunda implementación que pueda desviarse de la de verdad.
 */

export type SimulationResult = {
  evaluation: Evaluation;
  /** La plantilla que ganó, tal como está hoy. */
  template: TemplateDetail | null;
  /** La rutina que se entregaría, ya depurada. */
  plan: FilteredPlan<TemplateDay> | null;
};

/** El perfil del formulario en lo que el motor entiende. */
export function toRuleProfile(profile: SimulationProfile): RuleProfile {
  return {
    goal: profile.goal,
    level: profile.level,
    environment: profile.environment,
    equipment: profile.equipment,
    conditions: profile.conditions,
    age: profile.age,
  };
}

export async function simulate(
  profile: SimulationProfile,
): Promise<SimulationResult> {
  const rules = await listEvaluableRules();
  const evaluation = explainEvaluation(toRuleProfile(profile), rules);
  if (!evaluation.match) return { evaluation, template: null, plan: null };

  const template = await getTemplate(evaluation.match.rule.template_id);
  if (!template) return { evaluation, template: null, plan: null };

  return {
    evaluation,
    template,
    plan: filterContraindicated(template.days, profile.conditions),
  };
}
