import { PatientProfile } from "@/components/auth/PatientProfile";

export const metadata = { title: "Ficha del paciente" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <PatientProfile patientId={(await params).id} />;
}
