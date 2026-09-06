import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Workspace } from "@/components/auth/Workspace";

export default async function Page() {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/routine");
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, full_name, is_active")
    .eq("role", "patient").order("full_name");
  if (error) throw new Error("No se pudieron consultar los pacientes.");
  return <Workspace title="Rutinas de pacientes" name={actor.fullName}>
    <nav className="mb-5 flex flex-wrap gap-4" aria-label="Seguimiento de rutinas">
      <Link className="inline-flex min-h-11 items-center text-brand" href="/pro/sessions">Sesiones registradas</Link>
      <Link className="inline-flex min-h-11 items-center text-brand" href="/pro/alerts">Alertas del equipo</Link>
    </nav>
    <p className="mb-6 max-w-2xl leading-7 text-muted-foreground">Consulta las rutinas y asigna una propuesta a partir del perfil de cada paciente.</p>
    {!data.length && <p>Aún no tienes pacientes asignados. El administrador puede vincularlos a tu atención.</p>}
    <ul className="grid gap-3 sm:grid-cols-2">{data.map((patient) => <li key={patient.id}>
      <Link href={`/pro/routines/${patient.id}`} className="flex min-h-16 items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5">
        <span>{patient.full_name ?? "Paciente sin nombre"}{!patient.is_active ? " · Inactivo" : ""}</span>
        <span className="text-sm text-brand">Ver rutinas</span>
      </Link>
    </li>)}</ul>
  </Workspace>;
}
