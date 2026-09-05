import "server-only";

import { redirect } from "next/navigation";
import { getActiveProfile, rolePaths } from "@/lib/auth/session";

/**
 * El seguimiento lo registra el equipo: el administrador y el profesional con
 * asignación vigente. El paciente lee sus tamizajes —RLS se lo permite— pero
 * los ve en su propia vista de evolución, no en este panel.
 */
export async function requireStaff() {
  const profile = await getActiveProfile();
  if (!profile) redirect("/login");
  if (profile.role === "patient") redirect(rolePaths.patient);
  return profile;
}
