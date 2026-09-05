import { bodyPartLabels } from "@/lib/catalog/body-parts";
import {
  difficultyLabels,
  environmentLabels,
  equipmentLabels,
  goalLabels,
  labelFor,
} from "@/lib/catalog/vocabulary";
import type { RuleConditions } from "@/lib/catalog/rules-schema";

/**
 * El criterio de una regla en español, criterio a criterio.
 *
 * El `jsonb` es almacenamiento; esto es lo que lee el equipo profesional en el
 * panel y en el simulador. Función pura, sin base de datos, para que las dos
 * pantallas digan exactamente lo mismo.
 */

export type CriterionDescription = {
  criterion: keyof RuleConditions;
  label: string;
  value: string;
};

const join = (values: readonly string[], labels: Record<string, string>) =>
  values.map((value) => labelFor(labels, value)).join(", ");

export function describeConditions(
  conditions: RuleConditions,
): CriterionDescription[] {
  const described: CriterionDescription[] = [];
  const add = (
    criterion: keyof RuleConditions,
    label: string,
    value: string,
  ) => described.push({ criterion, label, value });

  if (conditions.goal) add("goal", "Objetivo", join(conditions.goal, goalLabels));
  if (conditions.level)
    add("level", "Nivel", join(conditions.level, difficultyLabels));
  if (conditions.environment)
    add("environment", "Entorno", join(conditions.environment, environmentLabels));
  if (conditions.equipment_any_of)
    add(
      "equipment_any_of",
      "Tiene alguno de",
      join(conditions.equipment_any_of, equipmentLabels),
    );
  if (conditions.equipment_all_of)
    add(
      "equipment_all_of",
      "Tiene todos",
      join(conditions.equipment_all_of, equipmentLabels),
    );
  if (conditions.excludes_conditions)
    add(
      "excludes_conditions",
      "Sin condición activa en",
      join(conditions.excludes_conditions, bodyPartLabels),
    );
  if (conditions.age_range) {
    const { min, max } = conditions.age_range;
    add(
      "age_range",
      "Edad",
      min !== undefined && max !== undefined
        ? `de ${min} a ${max} años`
        : min !== undefined
          ? `desde ${min} años`
          : `hasta ${max} años`,
    );
  }

  return described;
}
