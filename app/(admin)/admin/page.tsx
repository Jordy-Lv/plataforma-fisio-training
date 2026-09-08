import type { Metadata } from "next";

import { StaffHome } from "@/components/progress/StaffHome";
import { requireAdmin } from "@/lib/progress/access";

export const metadata: Metadata = {
  title: "Panel de administración",
};

/**
 * El panel de inicio es el panorama del negocio. El directorio de personas y
 * el alta se movieron a `/people`.
 */
export default async function Page() {
  const profile = await requireAdmin();

  return <StaffHome role="admin" name={profile.fullName} />;
}
