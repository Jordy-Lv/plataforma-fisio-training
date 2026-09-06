import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { EvaluableRule } from "@/lib/catalog/evaluate-rules";
import type { RuleConditions } from "@/lib/catalog/rules-schema";
import { safeParseRuleConditions } from "@/lib/catalog/rules-schema";

/**
 * Consultas de las reglas de asignación.
 *
 * Todas ordenan por `priority` y, en empate, por `created_at`: es el orden en
 * que el motor las evalúa —ver el contrato en `evaluate-rules.ts`— y el mismo
 * que ve el equipo en el panel. Si la pantalla mostrara un orden y el motor
 * usara otro, el panel dejaría de explicar nada.
 */

export type RuleTemplate = { id: string; name: string; is_active: boolean };

export type RuleListItem = {
  id: string;
  name: string;
  priority: number;
  is_active: boolean;
  template_id: string;
  /** Nula cuando la plantilla existe pero RLS no la deja ver. */
  template: RuleTemplate | null;
  /** Nulas cuando el `jsonb` guardado no valida contra el esquema actual. */
  conditions: RuleConditions | null;
  /** Qué le pasa a esas condiciones; el panel lo muestra como advertencia. */
  issues: string[];
};

const columns =
  "id, name, priority, is_active, conditions, template_id, routine_templates (id, name, is_active)";

type Row = {
  id: string;
  name: string;
  priority: number;
  is_active: boolean;
  conditions: unknown;
  template_id: string;
  routine_templates: RuleTemplate | null;
};

/**
 * Se valida al leer, no solo al escribir: una regla guardada por una versión
 * anterior del esquema puede haber dejado de valer. Esa regla se muestra con su
 * advertencia y el motor la ignora, en lugar de romper la evaluación entera.
 */
function toRule(row: Row): RuleListItem {
  const parsed = safeParseRuleConditions(row.conditions);
  return {
    id: row.id,
    name: row.name,
    priority: row.priority,
    is_active: row.is_active,
    template_id: row.template_id,
    template: row.routine_templates,
    conditions: parsed.ok ? parsed.conditions : null,
    issues: parsed.ok ? [] : parsed.issues,
  };
}

export async function listRules(): Promise<RuleListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_rules")
    .select(columns)
    .order("priority")
    .order("created_at");
  if (error)
    throw new Error(`No se pudieron consultar las reglas: ${error.message}`);
  return (data ?? []).map(toRule);
}

export async function getRule(id: string): Promise<RuleListItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_rules")
    .select(columns)
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new Error(`No se pudo consultar la regla: ${error.message}`);
  return data ? toRule(data) : null;
}

/**
 * Las reglas tal como las quiere el motor: con `conditions` sin tocar y las
 * inactivas incluidas. Quien decide qué hacer con ellas es `evaluateRules`.
 */
export async function listEvaluableRules(): Promise<EvaluableRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_rules")
    .select("id, name, priority, template_id, is_active, conditions")
    .order("priority")
    .order("created_at");
  if (error)
    throw new Error(`No se pudieron consultar las reglas: ${error.message}`);
  return data ?? [];
}

export type TemplateOption = {
  id: string;
  name: string;
  is_active: boolean;
};

/**
 * Las plantillas a las que puede apuntar una regla. Se ofrecen también las que
 * están en borrador —una regla puede prepararse antes que su plantilla— pero el
 * formulario avisa de cuáles no asignarán nada todavía.
 */
export async function listTemplateOptions(): Promise<TemplateOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_templates")
    .select("id, name, is_active")
    .order("name");
  if (error)
    throw new Error(`No se pudieron consultar las plantillas: ${error.message}`);
  return data ?? [];
}
