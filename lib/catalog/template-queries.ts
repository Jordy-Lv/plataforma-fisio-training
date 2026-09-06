import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";

type TemplateRow = Database["public"]["Tables"]["routine_templates"]["Row"];

export type TemplateListItem = Pick<
  TemplateRow,
  | "id"
  | "name"
  | "kind"
  | "goal"
  | "level"
  | "environment"
  | "days_per_week"
  | "is_active"
> & { days: number; items: number };

/**
 * Listado de plantillas con cuántos días y cuántos ejercicios tiene cada una.
 * Los conteos van embebidos en la misma consulta: son lo que distingue una
 * plantilla lista de un borrador, y pedirlos por separado sería una consulta
 * por fila.
 */
export async function listTemplates(): Promise<TemplateListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_templates")
    .select(
      "id, name, kind, goal, level, environment, days_per_week, is_active, template_days(id, template_items(id))",
    )
    .order("kind")
    .order("name");
  if (error)
    throw new Error(`No se pudieron consultar las plantillas: ${error.message}`);

  return (data ?? []).map(({ template_days, ...template }) => ({
    ...template,
    days: template_days.length,
    items: template_days.reduce((total, day) => total + day.template_items.length, 0),
  }));
}

export type TemplateItem = {
  id: string;
  position: number;
  sets: number | null;
  reps: number | null;
  target_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    media_url: string | null;
    contraindications: string[];
  };
};

export type TemplateDay = {
  id: string;
  day_number: number;
  title: string | null;
  items: TemplateItem[];
};

export type TemplateDetail = Pick<
  TemplateRow,
  | "id"
  | "name"
  | "kind"
  | "goal"
  | "level"
  | "environment"
  | "days_per_week"
  | "is_active"
> & { days: TemplateDay[] };

/**
 * La plantilla completa con sus días y sus ejercicios. Devuelve `null` si no
 * existe o si RLS no la deja ver.
 *
 * El orden se aplica aquí y no en la consulta porque es el contrato de la
 * pantalla: los días por su número y los ejercicios por su `position`, que es
 * el orden en que el paciente los ejecutará.
 */
export async function getTemplate(id: string): Promise<TemplateDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_templates")
    .select(
      `id, name, kind, goal, level, environment, days_per_week, is_active,
       template_days (
         id, day_number, title,
         template_items (
           id, position, sets, reps, target_weight, rest_seconds, notes,
           exercises ( id, name, media_url, contraindications )
         )
       )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new Error(`No se pudo consultar la plantilla: ${error.message}`);
  if (!data) return null;

  const { template_days, ...template } = data;
  return {
    ...template,
    days: template_days
      .map((day) => ({
        id: day.id,
        day_number: day.day_number,
        title: day.title,
        items: day.template_items
          .map(({ exercises, ...item }) => ({ ...item, exercise: exercises }))
          .sort((a, b) => a.position - b.position),
      }))
      .sort((a, b) => a.day_number - b.day_number),
  };
}

export type RuleUsingTemplate = {
  id: string;
  name: string;
  priority: number;
  is_active: boolean;
};

/**
 * Las reglas de asignación que apuntan a esta plantilla. Desactivarla las deja
 * sin destino, así que hay que poder decir cuáles antes de hacerlo.
 */
export async function listRulesUsingTemplate(
  templateId: string,
): Promise<RuleUsingTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_rules")
    .select("id, name, priority, is_active")
    .eq("template_id", templateId)
    .order("priority");
  if (error)
    throw new Error(`No se pudieron consultar las reglas: ${error.message}`);
  return data ?? [];
}
