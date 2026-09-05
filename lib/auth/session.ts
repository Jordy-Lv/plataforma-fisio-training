import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleSchema, type UserRole } from "@/lib/auth/schemas";

export const rolePaths: Record<UserRole, string> = {
  admin: "/admin",
  professional: "/pro",
  patient: "/patient",
};

export async function getActiveProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (error)
    throw new Error("No se pudo consultar tu perfil. Inténtalo de nuevo.");
  const role = roleSchema.safeParse(data?.role);
  if (!data?.is_active || !role.success) return null;
  return {
    id: user.id,
    role: role.data,
    fullName: data.full_name as string | null,
  };
}

export async function requireRole(
  role: UserRole,
  options: { allowOnboarding?: boolean } = {},
) {
  const profile = await getActiveProfile();
  if (!profile) redirect("/login");
  if (profile.role !== role) redirect(rolePaths[profile.role]);
  if (role === "patient" && !options.allowOnboarding) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("patient_details")
      .select("onboarding_step")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (error) throw new Error("No se pudo consultar el avance de tu perfil.");
    if (data?.onboarding_step !== 3) redirect("/patient/onboarding");
  }
  return profile;
}
