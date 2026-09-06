import Link from "next/link";
import { redirect } from "next/navigation";
import { cn } from "cn";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Workspace } from "@/components/auth/Workspace";
import { Badge } from "@/components/ui/Badge";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function Page() {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/routine");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, is_active")
    .eq("role", "patient")
    .order("full_name");
  if (error) throw new Error("No se pudieron consultar los pacientes.");

  return (
    <Workspace
      title="Rutinas de pacientes"
      name={actor.fullName}
      description="Consulta las rutinas y asigna una propuesta a partir del perfil de cada paciente."
    >
      {data.length === 0 ? (
        <EmptyState title="Aún no tienes pacientes asignados">
          El administrador puede vincular pacientes a tu atención. En cuanto lo
          haga, aparecerán aquí para asignarles su rutina.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((patient) => (
            <li key={patient.id} className="flex">
              <article
                className={cn(
                  cardVariants({ interactive: true }),
                  "flex w-full items-center justify-between gap-4",
                )}
              >
                <h2 className="text-base font-semibold leading-6">
                  <Link
                    href={`/pro/routines/${patient.id}`}
                    className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {patient.full_name ?? "Paciente sin nombre"}
                  </Link>
                </h2>
                {!patient.is_active && <Badge>Inactivo</Badge>}
              </article>
            </li>
          ))}
        </ul>
      )}
    </Workspace>
  );
}
