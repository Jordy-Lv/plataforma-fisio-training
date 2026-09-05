import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { assignmentSchema } from "@/lib/routines/assignment";
import { patientRoutines } from "@/lib/routines/queries";
import { Workspace } from "@/components/auth/Workspace";
import { AssignmentForm } from "@/components/routines/AssignmentForm";
import { RoutineSummary } from "@/components/routines/RoutineSummary";

export default async function Page({ params }: { params: Promise<{ patientId: string }> }) {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/routine");
  const values = assignmentSchema.safeParse(await params);
  if (!values.success) notFound();
  const { patientId } = values.data;
  const supabase = await createClient();
  const { data: patient, error } = await supabase.from("profiles")
    .select("id, full_name, is_active").eq("id", patientId).eq("role", "patient").maybeSingle();
  if (error) throw new Error("No se pudo consultar el paciente.");
  if (!patient) notFound();
  const routines = await patientRoutines(patientId);
  return <Workspace title={patient.full_name ?? "Rutinas del paciente"} name={actor.fullName}>
    <Link href="/pro/routines" className="inline-flex min-h-11 items-center font-medium text-brand">Volver a pacientes</Link>
    {patient.is_active && <AssignmentForm patientId={patientId} />}
    {!routines.length && <p className="my-6 rounded-2xl border border-dashed border-border p-6 text-muted-foreground">
      Aún no hay rutinas. Evalúa el perfil para asignar una propuesta según las reglas del equipo.
    </p>}
    <div className="mt-6 grid gap-6">{routines.map((routine) => <RoutineSummary key={routine.id} routine={routine} staff />)}</div>
  </Workspace>;
}
