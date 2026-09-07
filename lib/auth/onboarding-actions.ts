"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfile, requireRole } from "@/lib/auth/session";
import {
  goalSchema,
  environmentSchema,
  patientProfileSchema,
  conditionSchema,
  conditionsSchema,
  patientIdSchema,
} from "@/lib/auth/onboarding-schemas";
import type { AuthState } from "@/lib/auth/schemas";

export async function saveOnboardingStep(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  let profile;
  try {
    profile = await requireRole("patient", { allowOnboarding: true });
  } catch {
    return { error: "No pudimos verificar tu sesión. Vuelve a intentarlo." };
  }
  const supabase = await createClient();
  const step = z.enum(["1", "2", "3"]).safeParse(form.get("step"));
  if (!step.success) return { error: "Selecciona un paso válido." };
  const { data: current, error: readError } = await supabase
    .from("patient_details")
    .select("onboarding_step")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (readError)
    return { error: "No se pudo consultar tu avance. Inténtalo de nuevo." };
  if (current?.onboarding_step === 3) redirect("/patient");
  if (step.data === "1") {
    const parsed = goalSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    // Solo se fija `onboarding_step` cuando aún no ha llegado a 1. Mandarlo con un
    // valor mayor rompía a quien ya pasó por el paso 2 y volvía a "Objetivo":
    // Postgres valida el CHECK `onboarding_required_fields` sobre la fila candidata
    // a INSERT del upsert —con `environment` nulo— antes de resolver el ON CONFLICT,
    // así que `onboarding_step = 2` sin `environment` reventaba la constraint y el
    // guardado devolvía error. En ese caso el ON CONFLICT conserva el paso ya
    // alcanzado; el avance real lo hará el paso 2.
    const advanceStep =
      (current?.onboarding_step ?? 0) >= 1 ? {} : { onboarding_step: 1 };
    const { error } = await supabase.from("patient_details").upsert({
      profile_id: profile.id,
      ...parsed.data,
      ...advanceStep,
    });
    if (error)
      return { error: "No se pudo guardar tu objetivo. Inténtalo de nuevo." };
  } else if (step.data === "2") {
    if (!current || current.onboarding_step < 1)
      return { error: "Completa primero tu objetivo y nivel." };
    const parsed = environmentSchema.safeParse({
      ...Object.fromEntries(form),
      equipment: form.getAll("equipment"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { data, error } = await supabase
      .from("patient_details")
      .update({ ...parsed.data, onboarding_step: 2 })
      .eq("profile_id", profile.id)
      .select("profile_id")
      .single();
    if (error || !data)
      return {
        error: "No se pudo guardar tu equipamiento. Inténtalo de nuevo.",
      };
  } else {
    let input: unknown;
    try {
      input = JSON.parse(String(form.get("conditions")));
    } catch {
      return { error: "Revisa las condiciones antes de continuar." };
    }
    const parsed = conditionsSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { error } = await supabase.rpc("finish_patient_onboarding", {
      patient_id: profile.id,
      conditions: parsed.data,
    });
    if (error)
      return {
        error:
          "No se pudo finalizar. Comprueba los pasos anteriores y vuelve a intentarlo.",
      };
  }
  revalidatePath("/patient", "layout");
  // Tras los pasos 1 y 2 se vuelve al wizard, pero con el número de paso en la
  // URL: redirigir a `/patient/onboarding` a secas —la misma ruta en la que ya
  // está el formulario— el App Router lo trata como no-op y no re-renderiza el
  // Server Component, así que la pantalla se queda en el paso anterior aunque
  // `onboarding_step` ya haya subido. Cambiar el query fuerza la navegación.
  // La página acota `?step=` a `<= onboarding_step + 1`, así que el salto es seguro.
  redirect(
    step.data === "3"
      ? "/patient"
      : `/patient/onboarding?step=${Number(step.data) + 1}`,
  );
}

export async function updatePatientProfile(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const parsed = patientProfileSchema
    .extend({ patientId: patientIdSchema })
    .safeParse({
      ...Object.fromEntries(form),
      equipment: form.getAll("equipment"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    if (!(await getActiveProfile())) {
      return { error: "No pudimos verificar tu sesión. Vuelve a intentarlo." };
    }
  } catch {
    return { error: "No pudimos verificar tu sesión. Vuelve a intentarlo." };
  }
  const { patientId, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("patient_details")
    .update(values)
    .eq("profile_id", patientId)
    .select("profile_id")
    .single();
  if (error)
    return {
      error:
        "No se pudo guardar. Revisa tu acceso a este paciente e inténtalo de nuevo.",
    };
  revalidatePath("/patient/profile");
  revalidatePath(`/people/${patientId}`);
  return {
    success:
      "Perfil actualizado. Se usará en la siguiente asignación de rutina.",
  };
}

export async function saveCondition(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const parsed = conditionSchema
    .extend({
      patientId: patientIdSchema,
      conditionId: z.union([z.literal(""), z.string().uuid()]),
      is_active: z.boolean(),
    })
    .safeParse({
      ...Object.fromEntries(form),
      conditionId: form.get("conditionId") ?? "",
      is_active: form.get("is_active") === "on",
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    if (!(await getActiveProfile())) {
      return { error: "No pudimos verificar tu sesión. Vuelve a intentarlo." };
    }
  } catch {
    return { error: "No pudimos verificar tu sesión. Vuelve a intentarlo." };
  }
  const { patientId, conditionId, ...values } = parsed.data;
  const supabase = await createClient();
  const result = conditionId
    ? await supabase
        .from("patient_conditions")
        .update(values)
        .eq("id", conditionId)
        .eq("patient_id", patientId)
        .select("id")
        .single()
    : await supabase
        .from("patient_conditions")
        .insert({ ...values, patient_id: patientId })
        .select("id")
        .single();
  if (result.error)
    return {
      error:
        "No se pudo guardar la condición. Revisa tu acceso e inténtalo de nuevo.",
    };
  revalidatePath("/patient/profile");
  revalidatePath(`/people/${patientId}`);
  return {
    success:
      "Condición guardada. Las condiciones inactivas se conservan en el historial.",
  };
}
