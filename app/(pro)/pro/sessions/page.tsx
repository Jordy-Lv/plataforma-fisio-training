import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Workspace } from "@/components/auth/Workspace";
import { SessionHistory } from "@/components/routines/SessionHistory";
import { patientSessions } from "@/lib/routines/session-queries";
export default async function Page({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/routine");
  const supabase = await createClient();
  const { data: patients, error } = await supabase.from("profiles").select("id, full_name").eq("role", "patient").order("full_name");
  if (error) throw new Error(`No se pudieron consultar los pacientes: ${error.message}`);
  const query = await searchParams;
  const patient = patients.find((person) => person.id === query.patient);
  const sessions = patient ? await patientSessions(patient.id) : [];
  return <Workspace title="Sesiones de pacientes" name={actor.fullName}>
    <Link href="/pro/alerts" className="mb-4 inline-flex min-h-11 items-center text-brand">Ver alertas</Link>
    <form className="mb-6 flex flex-wrap gap-3">
      <label className="grid min-w-0 gap-2">Paciente<select name="patient" defaultValue={patient?.id ?? ""} className="min-h-11 max-w-full rounded-lg border border-border bg-background px-3">
        <option value="">Selecciona un paciente</option>{patients.map((person) => <option key={person.id} value={person.id}>{person.full_name ?? "Paciente"}</option>)}
      </select></label>
      <button className="min-h-11 self-end rounded-lg border border-border px-4" type="submit">Consultar sesiones</button>
    </form>
    {!patients.length && <p>Aún no tienes pacientes asignados. El administrador puede vincularlos a tu atención.</p>}
    {patient && <SessionHistory sessions={sessions} staff />}
  </Workspace>;
}
