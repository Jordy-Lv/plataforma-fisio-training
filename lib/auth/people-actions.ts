"use server";

import { createClient as createAuthClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import {
  createPersonSchema,
  assignmentSchema,
  closeAssignmentSchema,
  deactivateSchema,
} from "@/lib/auth/people-schemas";
import type { AuthState } from "@/lib/auth/schemas";

export async function createPerson(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const parsed = createPersonSchema.safeParse({
    ...Object.fromEntries(form),
    specialty: form.get("specialty") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const values = parsed.data;
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc(
    "prepare_person_registration",
    {
      person_email: values.email,
      person_name: values.fullName,
      person_phone: values.phone,
      person_role: values.role,
      person_specialty: values.specialty ?? undefined,
    },
  );
  if (error)
    return {
      error:
        error.code === "23505"
          ? "Ya hay un alta en curso para ese correo. Inténtalo en unos minutos."
          : error.message,
    };
  const { url, anonKey } = getSupabaseConfig();
  const registrationClient = createAuthClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error: signupError } = await registrationClient.auth.signUp({
    email: values.email,
    password: values.password,
    options: { data: { registration_token: token } },
  });
  if (signupError || !data.user || data.user.identities?.length === 0) {
    const { error: cleanupError } = await supabase.rpc(
      "cancel_person_registration",
      { registration_token: token },
    );
    if (cleanupError)
      return {
        error:
          "El alta no se completó y su autorización sigue pendiente. Espera cinco minutos antes de reintentar.",
      };
    return {
      error:
        "No se pudo completar el alta. Revisa si el correo ya existe o vuelve a intentarlo en unos minutos.",
    };
  }
  if (data.session) {
    const { error: signoutError } = await registrationClient.auth.signOut({
      scope: "local",
    });
    if (signoutError)
      throw new Error(
        "La cuenta se creó, pero no se pudo cerrar su sesión de registro. No repitas el alta.",
      );
  }
  revalidatePath("/people");
  revalidatePath("/admin");
  revalidatePath("/pro");
  return {
    success: data.session
      ? "Persona creada. Ya puede entrar con su correo y contraseña inicial."
      : "Persona creada. Debe confirmar el correo antes de entrar con su contraseña inicial.",
  };
}

export async function assignProfessional(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const parsed = assignmentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("care_assignments").insert({
    patient_id: parsed.data.patientId,
    professional_id: parsed.data.professionalId,
    kind: parsed.data.kind,
  });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "Este paciente ya tiene un profesional de esa especialidad. Ciérralo primero en «Acompañamientos vigentes», aquí abajo."
          : "No se pudo asignar. Revisa que ambas personas estén activas y la especialidad coincida.",
    };
  revalidatePath("/people");
  revalidatePath(`/people/${parsed.data.patientId}`);
  revalidatePath("/admin");
  revalidatePath("/pro");
  return { success: "Profesional asignado." };
}

/**
 * Cierra un acompañamiento vigente. **No borra la fila**: escribe `ended_at`,
 * que es el cierre lógico —el historial es parte del valor del producto y esta
 * tabla no tiene ninguna política de `delete`—.
 *
 * La autorización es RLS: la política «admin actualiza asignaciones» exige
 * `is_admin()`, así que a quien no lo sea le devuelve cero filas. El `.is
 * ("ended_at", null)` hace la operación idempotente: cerrar dos veces no
 * reescribe la fecha del primer cierre.
 */
export async function closeAssignment(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const parsed = closeAssignmentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("care_assignments")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", parsed.data.assignmentId)
    .is("ended_at", null)
    .select("id");
  if (error)
    return { error: "No se pudo cerrar el acompañamiento. Inténtalo de nuevo." };
  if (!data || data.length === 0)
    return {
      error:
        "Ese acompañamiento ya estaba cerrado, o no tienes permiso para cerrarlo.",
    };
  revalidatePath("/people");
  revalidatePath("/admin");
  revalidatePath("/pro");
  return {
    success:
      "Acompañamiento cerrado. Ese profesional deja de ver al paciente, y el historial se conserva.",
  };
}

export async function deactivatePerson(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const parsed = deactivateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("deactivate_person", {
    person_id: parsed.data.personId,
    expected_assignments: parsed.data.expectedAssignments,
  });
  if (error) return { error: error.message };
  revalidatePath("/people");
  revalidatePath(`/people/${parsed.data.personId}`);
  revalidatePath("/admin");
  revalidatePath("/pro");
  return { success: "Persona dada de baja. Su historial se conserva." };
}
