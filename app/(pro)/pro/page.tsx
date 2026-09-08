import type { Metadata } from "next";

import { StaffHome } from "@/components/progress/StaffHome";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Mi panel",
};

/**
 * El panel de inicio del profesional es el estado de sus pacientes este mes.
 * El directorio y el alta de un paciente están en `/people`.
 */
export default async function Page() {
  const profile = await requireRole("professional");

  return <StaffHome role="professional" name={profile.fullName} />;
}
