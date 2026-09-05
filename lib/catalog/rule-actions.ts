"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getRule } from "@/lib/catalog/rule-queries";
import {
  createRuleSchema,
  idFormValues,
  moveRuleFormValues,
  moveRuleSchema,
  ruleFormValues,
  ruleIdSchema,
  setRuleActiveFormValues,
  setRuleActiveSchema,
  updateRuleSchema,
  type RuleState,
} from "@/lib/catalog/rule-schemas";

/**
 * Escritura de las reglas de asignación. Solo `admin`: el profesional las
 * consulta para entender por qué un paciente recibió lo que recibió, pero el
 * criterio de asignación es del equipo, no de quien atiende un caso.
 *
 * RLS es la autorización real. La comprobación de aquí solo sirve para
 * responder algo legible: una server action es una URL pública y un rechazo de
 * la base de datos no es un mensaje para el equipo.
 */

const sinPermiso =
  "Solo el administrador puede editar las reglas de asignación.";

/** El salto con que se renumeran las prioridades al reordenar. */
const step = 10;

async function isAdmin() {
  const profile = await getActiveProfile();
  return profile?.role === "admin";
}

function revalidateRules(id?: string) {
  revalidatePath("/rules");
  revalidatePath("/rules/simulador");
  if (id) revalidatePath(`/rules/${id}`);
}

export async function createRule(
  _previous: RuleState,
  form: FormData,
): Promise<RuleState> {
  const parsed = createRuleSchema.safeParse(ruleFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_rules")
    .insert({
      name: values.name,
      priority: values.priority,
      template_id: values.templateId,
      conditions: values.conditions,
      // Nace inactiva: una regla recién escrita cambia a quién se le asigna
      // qué, y eso se revisa en el simulador antes de dejarla entrar.
      is_active: false,
    })
    .select("id")
    .maybeSingle();

  if (error) return { error: `No se pudo crear la regla: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateRules();
  redirect(`/rules/${data.id}?nueva=1`);
}

export async function updateRule(
  _previous: RuleState,
  form: FormData,
): Promise<RuleState> {
  const parsed = updateRuleSchema.safeParse(ruleFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_rules")
    .update({
      name: values.name,
      priority: values.priority,
      template_id: values.templateId,
      conditions: values.conditions,
    })
    .eq("id", values.id)
    .select("id")
    .maybeSingle();

  if (error) return { error: `No se pudo guardar la regla: ${error.message}` };
  // Sin fila devuelta el `update` no encontró nada que le dejaran tocar: RLS
  // no lanza error, simplemente no afecta a ninguna fila.
  if (!data) return { error: sinPermiso };

  revalidateRules(values.id);
  return {
    success:
      "Regla guardada. Compruébala en el simulador antes de darla por buena.",
  };
}

export async function deleteRule(
  _previous: RuleState,
  form: FormData,
): Promise<RuleState> {
  const parsed = ruleIdSchema.safeParse(idFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_rules")
    .delete()
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: `No se pudo eliminar la regla: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateRules();
  redirect("/rules?eliminada=1");
}

/**
 * Sube o baja una regla en el orden de evaluación.
 *
 * Reordenar renumera las prioridades de diez en diez. Cuesta un `update` por
 * regla movida, pero deja el orden sin empates: con dos reglas en la misma
 * prioridad el desempate lo decide la antigüedad, que es exacto pero no se ve
 * en la pantalla, y una regla de asignación tiene que poder explicarse mirando
 * la lista. Quien quiera un número concreto —la genérica en 99— lo escribe en
 * el formulario de la regla.
 */
export async function moveRule(
  _previous: RuleState,
  form: FormData,
): Promise<RuleState> {
  const parsed = moveRuleSchema.safeParse(moveRuleFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const { id, direction } = parsed.data;
  const supabase = await createClient();
  const { data: rules, error: lecturaError } = await supabase
    .from("assignment_rules")
    .select("id, priority")
    .order("priority")
    .order("created_at");
  if (lecturaError)
    return { error: `No se pudieron leer las reglas: ${lecturaError.message}` };

  const orden = rules ?? [];
  const index = orden.findIndex((rule) => rule.id === id);
  if (index === -1) return { error: "Esa regla ya no existe." };

  const target = direction === "up" ? index - 1 : index + 1;
  // Ya está en el extremo: no hay nada que hacer y tampoco es un error.
  if (target < 0 || target >= orden.length) return {};

  const reordenadas = [...orden];
  [reordenadas[index], reordenadas[target]] = [
    reordenadas[target],
    reordenadas[index],
  ];

  const cambios = reordenadas
    .map((rule, position) => ({ id: rule.id, priority: (position + 1) * step }))
    .filter((rule, position) => rule.priority !== reordenadas[position].priority);

  for (const cambio of cambios) {
    const { data, error } = await supabase
      .from("assignment_rules")
      .update({ priority: cambio.priority })
      .eq("id", cambio.id)
      .select("id")
      .maybeSingle();
    if (error)
      return { error: `No se pudo reordenar las reglas: ${error.message}` };
    if (!data) return { error: sinPermiso };
  }

  revalidateRules(id);
  return { success: direction === "up" ? "Regla subida." : "Regla bajada." };
}

/**
 * Activa o desactiva una regla. Desactivarla no valida nada —siempre debe
 * poder frenarse un criterio— pero activarla avisa si su plantilla está en
 * borrador: la regla ganaría sin tener qué asignar.
 */
export async function setRuleActive(
  _previous: RuleState,
  form: FormData,
): Promise<RuleState> {
  const parsed = setRuleActiveSchema.safeParse(setRuleActiveFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const { id, intent } = parsed.data;
  const activar = intent === "activate";

  const rule = await getRule(id);
  if (!rule) return { error: "Esa regla ya no está disponible." };
  if (activar && !rule.conditions)
    return {
      error: `No se puede activar una regla cuyas condiciones no son válidas. ${rule.issues.join(" ")}`,
    };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_rules")
    .update({ is_active: activar })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { error: `No se pudo cambiar el estado: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateRules(id);
  if (!activar)
    return {
      success:
        "Regla desactivada. Deja de participar en la evaluación; las rutinas ya asignadas siguen igual.",
    };
  return {
    success:
      rule.template && !rule.template.is_active
        ? `Regla activada, pero la plantilla «${rule.template.name}» está en borrador: actívala o la regla ganará sin tener qué asignar.`
        : "Regla activada. Ya participa en la asignación del siguiente paciente.",
  };
}
