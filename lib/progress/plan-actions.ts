"use server";

import { revalidatePath } from "next/cache";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  createPlanSchema,
  createServiceSchema,
  idFormValues,
  planFormValues,
  planIdSchema,
  serviceFormValues,
  serviceIdSchema,
  setActiveFormValues,
  setPlanActiveSchema,
  setServiceActiveSchema,
  updatePlanSchema,
  updateServiceSchema,
  type PlanState,
} from "@/lib/progress/plan-schemas";

const sinPermiso =
  "Solo el administrador puede definir los planes y los servicios.";

/**
 * Planes y servicios los escribe únicamente `admin`. RLS es la autorización
 * real, pero una server action es una URL pública: el rol se comprueba aquí
 * también para responder algo legible en vez de un error de base de datos.
 */
async function isAdmin() {
  const profile = await getActiveProfile();
  return profile?.role === "admin";
}

/** Rutas que dependen de la oferta: el panel y la vitrina del paciente. */
function revalidateOffer() {
  revalidatePath("/plans");
  revalidatePath("/offer");
}

// --- Planes -----------------------------------------------------------------

export async function createPlan(
  _previous: PlanState,
  form: FormData,
): Promise<PlanState> {
  const parsed = createPlanSchema.safeParse(planFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .insert({
      name: values.name,
      description: values.description,
      price: values.price,
      billing_period: values.billingPeriod,
      features: values.features,
    })
    .select("id")
    .maybeSingle();

  if (error) return { error: `No se pudo crear el plan: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateOffer();
  return { success: "Plan creado." };
}

export async function updatePlan(
  _previous: PlanState,
  form: FormData,
): Promise<PlanState> {
  const parsed = updatePlanSchema.safeParse(planFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .update({
      name: values.name,
      description: values.description,
      price: values.price,
      billing_period: values.billingPeriod,
      features: values.features,
    })
    .eq("id", values.id)
    .select("id")
    .maybeSingle();

  if (error) return { error: `No se pudo guardar el plan: ${error.message}` };
  // Sin fila devuelta el `update` no encontró nada que le dejaran tocar: RLS
  // no lanza error, simplemente no afecta a ninguna fila.
  if (!data) return { error: sinPermiso };

  revalidateOffer();
  return { success: "Plan actualizado." };
}

/**
 * Activa o desactiva un plan. Desactivarlo lo saca de la vitrina; las
 * membresías que lo referencian siguen funcionando porque son un registro
 * propio con su fecha de vencimiento, no una vista del plan.
 */
export async function setPlanActive(
  _previous: PlanState,
  form: FormData,
): Promise<PlanState> {
  const parsed = setPlanActiveSchema.safeParse(setActiveFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const activar = parsed.data.intent === "activate";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .update({ is_active: activar })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (error)
    return { error: `No se pudo cambiar el estado del plan: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateOffer();
  return {
    success: activar
      ? "Plan activado. Ya se muestra en la vitrina."
      : "Plan desactivado. Sale de la vitrina; las membresías que lo usan siguen igual.",
  };
}

export async function deletePlan(
  _previous: PlanState,
  form: FormData,
): Promise<PlanState> {
  const parsed = planIdSchema.safeParse(idFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .delete()
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  // 23503: hay membresías que lo referencian —`on delete restrict`—. Borrarlo
  // dejaría esas membresías sin plan, así que la salida es desactivarlo.
  if (error?.code === "23503")
    return {
      error:
        "No se puede eliminar: hay membresías registradas con este plan. Desactívalo en lugar de eliminarlo.",
    };
  if (error) return { error: `No se pudo eliminar el plan: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateOffer();
  return { success: "Plan eliminado." };
}

// --- Servicios ------------------------------------------------------------------

export async function createService(
  _previous: PlanState,
  form: FormData,
): Promise<PlanState> {
  const parsed = createServiceSchema.safeParse(serviceFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      name: values.name,
      description: values.description,
      category: values.category,
    })
    .select("id")
    .maybeSingle();

  if (error) return { error: `No se pudo crear el servicio: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateOffer();
  return { success: "Servicio creado." };
}

export async function updateService(
  _previous: PlanState,
  form: FormData,
): Promise<PlanState> {
  const parsed = updateServiceSchema.safeParse(serviceFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .update({
      name: values.name,
      description: values.description,
      category: values.category,
    })
    .eq("id", values.id)
    .select("id")
    .maybeSingle();

  if (error)
    return { error: `No se pudo guardar el servicio: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateOffer();
  return { success: "Servicio actualizado." };
}

export async function setServiceActive(
  _previous: PlanState,
  form: FormData,
): Promise<PlanState> {
  const parsed = setServiceActiveSchema.safeParse(setActiveFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const activar = parsed.data.intent === "activate";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .update({ is_active: activar })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (error)
    return { error: `No se pudo cambiar el estado del servicio: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateOffer();
  return {
    success: activar
      ? "Servicio activado. Ya se muestra en la vitrina."
      : "Servicio desactivado. Sale de la vitrina.",
  };
}

export async function deleteService(
  _previous: PlanState,
  form: FormData,
): Promise<PlanState> {
  const parsed = serviceIdSchema.safeParse(idFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .delete()
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (error)
    return { error: `No se pudo eliminar el servicio: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateOffer();
  return { success: "Servicio eliminado." };
}
