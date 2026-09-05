import { bodyPartLabels } from "@/lib/catalog/body-parts";
import {
  difficultyLabels,
  environmentLabels,
  equipmentLabels,
  goalLabels,
  labelFor,
} from "@/lib/catalog/vocabulary";
import type {
  Environment,
  Equipment,
  Goal,
  Level,
} from "@/lib/catalog/vocabulary";
import type { BodyPart, RuleConditions } from "@/lib/catalog/rules-schema";
import { safeParseRuleConditions } from "@/lib/catalog/rules-schema";

/**
 * Motor de asignación: decide qué plantilla de rutina le corresponde a un
 * perfil. Es una función **pura**, sin base de datos y sin efectos, tal como
 * decide `openspec/changes/add-exercise-library-and-rules/design.md`.
 *
 * ─── Contrato con el slice 3 (rutinas) ──────────────────────────────────────
 *
 *   evaluateRules(profile: RuleProfile, rules: EvaluableRule[]): MatchResult | null
 *
 * Quien llama carga las reglas y arma el perfil; el motor solo decide.
 *
 * - `rules` se pasa **tal como sale de la consulta**: se admiten reglas
 *   inactivas y `conditions` sin validar. El motor descarta unas y otras.
 * - El orden de evaluación es `priority` ascendente. En empate gana la que
 *   venga antes en el arreglo, así que la consulta debe ordenar
 *   `.order("priority").order("created_at")` para que la decisión sea
 *   reproducible.
 * - Devuelve `null` cuando ninguna regla coincide. Eso **no** es un error: el
 *   paciente queda sin rutina automática, se genera la alerta para su
 *   profesional y su vista dice que le están preparando la rutina. No se
 *   inventa una plantilla.
 * - `MatchResult.checks` explica por qué ganó esa regla, criterio a criterio.
 *   Es lo que pinta el simulador y lo que hace auditable la decisión.
 * - La copia de la plantilla y el filtro de contraindicaciones son pasos
 *   posteriores e independientes; el filtro vive en
 *   `lib/catalog/filter-contraindications.ts`.
 *
 * `explainEvaluation` devuelve además qué pasó con cada regla —cuál falló y en
 * qué criterio, cuáles se ignoraron por inválidas—. La asignación real usa
 * `evaluateRules`; el simulador y el panel usan `explainEvaluation`.
 */

/** El perfil del paciente, con lo único que el motor mira. */
export type RuleProfile = {
  goal: Goal;
  level: Level;
  environment: Environment;
  /** Equipamiento disponible; puede incluir `none` (peso corporal). */
  equipment: Equipment[];
  /** Partes del cuerpo con condición **activa**. */
  conditions: BodyPart[];
  /** Años cumplidos, o `null` si no consta la fecha de nacimiento. */
  age: number | null;
};

/** Una regla tal como se guarda: `conditions` todavía sin validar. */
export type EvaluableRule = {
  id: string;
  name: string;
  priority: number;
  template_id: string;
  is_active: boolean;
  conditions: unknown;
};

export type RuleSummary = Pick<
  EvaluableRule,
  "id" | "name" | "priority" | "template_id"
>;

/** Un criterio evaluado, en texto legible para el panel y el simulador. */
export type CriterionCheck = {
  criterion: keyof RuleConditions;
  /** Qué exige la regla. */
  expected: string;
  /** Qué trae el perfil. */
  actual: string;
  ok: boolean;
};

export type MatchResult = {
  rule: RuleSummary;
  conditions: RuleConditions;
  checks: CriterionCheck[];
};

export type RuleEvaluation = {
  rule: RuleSummary;
  /**
   * `inactive`: no participa. `invalid`: sus condiciones no validan y se
   * ignora. `match`: la ganadora. `no_match`: se evaluó y falló algún
   * criterio. `not_evaluated`: viene después de la ganadora.
   */
  status: "match" | "no_match" | "invalid" | "inactive" | "not_evaluated";
  checks: CriterionCheck[];
  issues: string[];
};

export type Evaluation = {
  match: MatchResult | null;
  rules: RuleEvaluation[];
};

const list = (values: readonly string[], labels: Record<string, string>) =>
  values.map((value) => labelFor(labels, value)).join(", ");

const anyOf = (values: readonly string[], other: readonly string[]) =>
  values.some((value) => other.includes(value));

/**
 * Comprueba los criterios presentes en la regla. Los ausentes no aparecen: no
 * restringen y tampoco tienen nada que explicar.
 */
function checkConditions(
  profile: RuleProfile,
  conditions: RuleConditions,
): CriterionCheck[] {
  const checks: CriterionCheck[] = [];

  if (conditions.goal)
    checks.push({
      criterion: "goal",
      expected: list(conditions.goal, goalLabels),
      actual: labelFor(goalLabels, profile.goal),
      ok: conditions.goal.includes(profile.goal),
    });

  if (conditions.level)
    checks.push({
      criterion: "level",
      expected: list(conditions.level, difficultyLabels),
      actual: labelFor(difficultyLabels, profile.level),
      ok: conditions.level.includes(profile.level),
    });

  if (conditions.environment)
    checks.push({
      criterion: "environment",
      expected: list(conditions.environment, environmentLabels),
      actual: labelFor(environmentLabels, profile.environment),
      ok: conditions.environment.includes(profile.environment),
    });

  if (conditions.equipment_any_of)
    checks.push({
      criterion: "equipment_any_of",
      expected: `alguno de: ${list(conditions.equipment_any_of, equipmentLabels)}`,
      actual: list(profile.equipment, equipmentLabels) || "sin equipamiento",
      ok: anyOf(conditions.equipment_any_of, profile.equipment),
    });

  if (conditions.equipment_all_of)
    checks.push({
      criterion: "equipment_all_of",
      expected: `todos: ${list(conditions.equipment_all_of, equipmentLabels)}`,
      actual: list(profile.equipment, equipmentLabels) || "sin equipamiento",
      ok: conditions.equipment_all_of.every((item) =>
        profile.equipment.includes(item),
      ),
    });

  if (conditions.excludes_conditions)
    checks.push({
      criterion: "excludes_conditions",
      expected: `sin condición en: ${list(conditions.excludes_conditions, bodyPartLabels)}`,
      actual: profile.conditions.length
        ? list(profile.conditions, bodyPartLabels)
        : "sin condiciones activas",
      ok: !anyOf(conditions.excludes_conditions, profile.conditions),
    });

  if (conditions.age_range) {
    const { min, max } = conditions.age_range;
    checks.push({
      criterion: "age_range",
      expected: [
        min !== undefined ? `desde ${min}` : "",
        max !== undefined ? `hasta ${max}` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .concat(" años"),
      actual: profile.age === null ? "edad no registrada" : `${profile.age} años`,
      // Sin fecha de nacimiento no se puede afirmar que el perfil entre en el
      // rango, y ante la duda el criterio no se da por cumplido.
      ok:
        profile.age !== null &&
        (min === undefined || profile.age >= min) &&
        (max === undefined || profile.age <= max),
    });
  }

  return checks;
}

const summarize = (rule: EvaluableRule): RuleSummary => ({
  id: rule.id,
  name: rule.name,
  priority: rule.priority,
  template_id: rule.template_id,
});

/** Evalúa y cuenta qué pasó con cada regla. */
export function explainEvaluation(
  profile: RuleProfile,
  rules: EvaluableRule[],
): Evaluation {
  // `sort` es estable, así que en empate de prioridad se conserva el orden en
  // que llegaron las reglas.
  const ordered = [...rules].sort((a, b) => a.priority - b.priority);

  let match: MatchResult | null = null;
  const evaluations: RuleEvaluation[] = [];

  for (const rule of ordered) {
    const summary = summarize(rule);

    if (match) {
      evaluations.push({
        rule: summary,
        status: "not_evaluated",
        checks: [],
        issues: [],
      });
      continue;
    }

    if (!rule.is_active) {
      evaluations.push({
        rule: summary,
        status: "inactive",
        checks: [],
        issues: [],
      });
      continue;
    }

    const parsed = safeParseRuleConditions(rule.conditions);
    if (!parsed.ok) {
      // Una regla rota no puede tumbar la evaluación entera: se ignora y el
      // panel la señala.
      evaluations.push({
        rule: summary,
        status: "invalid",
        checks: [],
        issues: parsed.issues,
      });
      continue;
    }

    const checks = checkConditions(profile, parsed.conditions);
    const ok = checks.every((check) => check.ok);
    if (ok) match = { rule: summary, conditions: parsed.conditions, checks };
    evaluations.push({
      rule: summary,
      status: ok ? "match" : "no_match",
      checks,
      issues: [],
    });
  }

  return { match, rules: evaluations };
}

/**
 * La regla ganadora, o `null` si ninguna coincide. Es la firma acordada con el
 * slice 3; ver el contrato al principio del módulo.
 */
export function evaluateRules(
  profile: RuleProfile,
  rules: EvaluableRule[],
): MatchResult | null {
  return explainEvaluation(profile, rules).match;
}

/** Los criterios que fallaron, para explicar por qué una regla no coincidió. */
export function failedChecks(evaluation: RuleEvaluation) {
  return evaluation.checks.filter((check) => !check.ok);
}
