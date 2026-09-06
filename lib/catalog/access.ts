import "server-only";

import { redirect } from "next/navigation";
import { getActiveProfile, rolePaths } from "@/lib/auth/session";

/**
 * El catálogo lo consultan `admin` y `professional`. El paciente también tiene
 * lectura en RLS, pero la ve dentro de su rutina, no en este panel: aquí se le
 * devuelve a su espacio.
 */
export async function requireStaff() {
  const profile = await getActiveProfile();
  if (!profile) redirect("/login");
  if (profile.role === "patient") redirect(rolePaths.patient);
  return profile;
}

/**
 * Las plantillas las escribe solo el administrador. El profesional puede
 * consultarlas —RLS se lo permite— pero no llega a las pantallas de alta.
 */
export async function requireAdmin() {
  const profile = await requireStaff();
  if (profile.role !== "admin") redirect(rolePaths[profile.role]);
  return profile;
}
