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

/**
 * Los planes, los servicios y las membresías los define solo el
 * administrador. El profesional los consulta —RLS se lo permite en la parte
 * que le toca— pero no llega a las pantallas de alta.
 */
export async function requireAdmin() {
  const profile = await requireStaff();
  if (profile.role !== "admin") redirect(rolePaths[profile.role]);
  return profile;
}

/**
 * La vitrina comercial la ve cualquiera con sesión, el paciente incluido. No
 * hay redirección por rol: solo se exige haber iniciado sesión.
 */
export async function requireAuth() {
  const profile = await getActiveProfile();
  if (!profile) redirect("/login");
  return profile;
}
