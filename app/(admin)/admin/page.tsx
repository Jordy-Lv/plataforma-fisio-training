import type { Metadata } from "next";

import { AdminHome } from "@/components/progress/AdminHome";
import { requireAdmin } from "@/lib/progress/access";

export const metadata: Metadata = {
  title: "Panel de administración",
};

/**
 * El panel del administrador es el panorama del negocio del mes. El trabajo
 * del día es del profesional y vive en `/pro`; el directorio y el alta, en
 * `/people`.
 */
export default async function Page() {
  const profile = await requireAdmin();

  return <AdminHome name={profile.fullName} />;
}
