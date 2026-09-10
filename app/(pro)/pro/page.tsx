import type { Metadata } from "next";

import { ProHome } from "@/components/progress/ProHome";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Mi panel",
};

/**
 * El panel del profesional es lo que tiene que atender hoy. El panorama del
 * negocio del mes es del administrador y vive en `/admin`; el directorio y el
 * alta de un paciente, en `/people`.
 */
export default async function Page() {
  const profile = await requireRole("professional");

  return <ProHome name={profile.fullName} />;
}
