import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** Lo que se muestra cuando el paciente no tiene una membresía vigente. */
export const BASIC_PLAN_LABEL = "Básico";

export type CurrentPlan = {
  /** «Mensual», «Semestral»… o «Básico» si no hay membresía vigente. */
  label: string;
  /** Inicio y vencimiento de la membresía vigente (`YYYY-MM-DD`), o `null`. */
  startedOn: string | null;
  expiresOn: string | null;
  /** `true` si la membresía vigente está por vencer (`expiring_soon`). */
  isExpiring: boolean;
};

/**
 * El plan vigente con sus fechas, para la tarjeta del menú lateral (cuánto le
 * queda). Misma lectura y misma `cache` que el rótulo: el shell y la portada
 * la comparten en cada petición.
 */
export const currentPlan = cache(async (patientId: string): Promise<CurrentPlan> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("status, started_on, expires_on, plan:plans!memberships_plan_id_fkey (name)")
    .eq("patient_id", patientId)
    .in("status", ["active", "expiring_soon"])
    .order("expires_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`No se pudo consultar tu plan: ${error.message}`);

  const plan = Array.isArray(data?.plan) ? data?.plan[0] : data?.plan;
  return {
    label: plan?.name?.replace(/^plan\s+/i, "") || BASIC_PLAN_LABEL,
    startedOn: data?.started_on ?? null,
    expiresOn: data?.expires_on ?? null,
    isExpiring: data?.status === "expiring_soon",
  };
});

/**
 * El plan que el paciente tiene hoy, tal como se rotula en su barra: el nombre
 * del plan de su membresía vigente sin el «Plan » delante («Plan Mensual» →
 * «Mensual»). Vigente es `active` o `expiring_soon`; si la más reciente venció
 * o se canceló, o si nunca tuvo una, el rótulo es «Básico». «Básico» no es un
 * plan de la tabla `plans`: es cómo se nombra no tener ninguno.
 *
 * Se lee en cada pantalla del paciente (la barra está en todas), así que va
 * envuelta en `cache`: una sola consulta por petición aunque la pidan el shell
 * y la portada a la vez. RLS limita la lectura a la propia membresía.
 */
export const currentPlanLabel = cache(
  async (patientId: string) => (await currentPlan(patientId)).label,
);
