"use server";

import { createClient as createAuthClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import {
  createPersonSchema,
  assignmentSchema,
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
          ? "Este paciente ya tiene un profesional de esa especialidad. Cierra la asignación anterior antes de cambiarlo."
          : "No se pudo asignar. Revisa que ambas personas estén activas y la especialidad coincida.",
    };
  revalidatePath("/admin");
  revalidatePath("/pro");
  return { success: "Profesional asignado." };
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
  revalidatePath("/admin");
  revalidatePath("/pro");
  return { success: "Persona dada de baja. Su historial se conserva." };
}
