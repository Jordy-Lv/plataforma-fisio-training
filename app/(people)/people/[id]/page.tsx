import { PatientProfile } from "@/components/auth/PatientProfile";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <PatientProfile patientId={(await params).id} />;
}
