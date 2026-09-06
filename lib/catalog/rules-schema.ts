import { z } from "zod";
import { bodyParts } from "@/lib/catalog/body-parts";
import { equipment } from "@/lib/catalog/equipment";
import { environments, goals, levels } from "@/lib/catalog/vocabulary";

/**
 * Esquema de `assignment_rules.conditions`, el `jsonb` donde vive el criterio
 * de una regla de asignación. Los campos son los de
 * `docs/03-motor-de-reglas.md`; un campo ausente significa "no me importa este
 * criterio" y no restringe nada.
 *
 * Se valida en los dos sentidos, y por motivos distintos:
 *
 * - **Al escribir**, con `parseRuleConditions`, para que el `jsonb` no acepte
 *   basura. El panel arma el objeto desde un formulario por criterio, pero la
 *   server action valida igual: el formulario no es la única puerta.
 * - **Al leer**, con `safeParseRuleConditions`, porque una regla guardada por
 *   una versión anterior del esquema puede no cumplir el actual. Esa regla se
 *   ignora y se advierte en el panel; nunca detiene la evaluación completa.
 *
 * El objeto es estricto: un criterio desconocido se rechaza en lugar de
 * ignorarse en silencio. Ignorarlo sería peor que fallar — el equipo creería
 * haber restringido algo que en realidad no restringe a nadie.
 */

export type BodyPart = (typeof bodyParts)[number];

/**
 * Un criterio de lista: valores del vocabulario cerrado, sin repetir y sin
 * quedar vacío. Una lista vacía es ambigua —¿ninguna coincidencia o ningún
 * filtro?— así que se rechaza y se pide quitar el criterio.
 */
function listCriterion<T extends readonly [string, ...string[]]>(
  values: T,
  label: string,
) {
  return z
    .array(
      z.enum(values, {
        error: `Hay un valor de ${label} que no está en la lista.`,
      }),
    )
    .min(1, `Selecciona al menos un valor de ${label} o quita el criterio.`)
    .max(values.length, `Revisa los valores de ${label}: hay valores de más.`)
    .refine(
      (list) => new Set(list).size === list.length,
      `No repitas valores de ${label}.`,
    )
    .optional();
}

const age = (label: string) =>
  z
    .number({ error: `La ${label} debe ser un número.` })
    .int(`La ${label} debe ser un número entero de años.`)
    .min(0, `La ${label} no puede ser negativa.`)
    .max(120, `La ${label} debe ser menor que 120.`)
    .optional();

const ageRangeSchema = z
  .strictObject({ min: age("edad mínima"), max: age("edad máxima") })
  .refine(
    (range) => range.min !== undefined || range.max !== undefined,
    "Indica al menos una edad, mínima o máxima, o quita el criterio.",
  )
  .refine(
    (range) =>
      range.min === undefined ||
      range.max === undefined ||
      range.min <= range.max,
    "La edad mínima no puede ser mayor que la edad máxima.",
  );

export const ruleConditionsSchema = z.strictObject({
  /** El objetivo del paciente está en la lista. */
  goal: listCriterion(goals, "objetivo"),
  /** Su nivel está en la lista. */
  level: listCriterion(levels, "nivel"),
  /** Su entorno de entrenamiento está en la lista. */
  environment: listCriterion(environments, "entorno"),
  /** Tiene al menos uno de esos equipamientos. */
  equipment_any_of: listCriterion(equipment, "equipamiento"),
  /** Tiene todos esos equipamientos. */
  equipment_all_of: listCriterion(equipment, "equipamiento"),
  /** No tiene ninguna de esas condiciones activas. */
  excludes_conditions: listCriterion(bodyParts, "condición"),
  /** Su edad cae dentro del rango. */
  age_range: ageRangeSchema.optional(),
});

export type RuleConditions = z.infer<typeof ruleConditionsSchema>;

/** Una regla sin ningún criterio: coincide con cualquier perfil. */
export function isCatchAll(conditions: RuleConditions) {
  return Object.values(conditions).every((value) => value === undefined);
}

/**
 * Los problemas de una regla en español y accionables. Los mensajes de los
 * criterios ya vienen escritos; solo hay que traducir los que Zod genera por su
 * cuenta —campos desconocidos, tipos que no son objeto— porque esos los lee el
 * equipo profesional en el panel, no un programador.
 */
export function conditionIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    if (issue.code === "unrecognized_keys")
      return `Esta regla usa criterios que ya no existen: ${issue.keys.join(", ")}.`;
    const field = issue.path.join(" › ");
    if (issue.code === "invalid_type" && issue.path.length === 0)
      return "Las condiciones de la regla no son un objeto válido.";
    return field ? `${field}: ${issue.message}` : issue.message;
  });
}

export type RuleConditionsResult =
  | { ok: true; conditions: RuleConditions }
  | { ok: false; issues: string[] };

/**
 * Valida sin lanzar. Es la puerta de lectura: el motor la usa para descartar
 * una regla inválida y seguir con las demás.
 */
export function safeParseRuleConditions(value: unknown): RuleConditionsResult {
  const result = ruleConditionsSchema.safeParse(value ?? {});
  return result.success
    ? { ok: true, conditions: result.data }
    : { ok: false, issues: conditionIssues(result.error) };
}

/**
 * Valida al escribir. Lanza con todos los problemas juntos para que la server
 * action los devuelva al formulario de una sola vez.
 */
export function parseRuleConditions(value: unknown): RuleConditions {
  const result = safeParseRuleConditions(value);
  if (!result.ok) throw new Error(result.issues.join(" "));
  return result.conditions;
}
