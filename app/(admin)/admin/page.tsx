import type { Metadata } from "next";

import { AdminHome } from "@/components/progress/AdminHome";
import { requireAdmin } from "@/lib/progress/access";

export const metadata: Metadata = {
  title: "Panel de administración",
};

/**
 * El panel del administrador: lo que pide su atención hoy y el panorama del
 * negocio del mes. El trabajo clínico del día es del profesional y vive en
 * `/pro`; el directorio y el alta, en `/people`.
 */
export default async function Page() {
  const profile = await requireAdmin();

  return <AdminHome id={profile.id} name={profile.fullName} />;
}
