import { requireRole } from "@/lib/auth/session";
import { PatientProfile } from "@/components/auth/PatientProfile";

export const metadata = { title: "Mi perfil" };
export default async function Page() {
  const profile = await requireRole("patient");
  return <PatientProfile patientId={profile.id} />;
}
