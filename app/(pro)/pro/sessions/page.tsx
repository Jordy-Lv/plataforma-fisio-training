import { redirect } from "next/navigation";
import { cn } from "cn";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Workspace } from "@/components/auth/Workspace";
import { SessionHistory } from "@/components/routines/SessionHistory";
import { Button } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Select } from "@/components/ui/Field";
import { patientSessions } from "@/lib/routines/session-queries";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/routine");

  const supabase = await createClient();
  const { data: patients, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "patient")
    .order("full_name");
  if (error)
    throw new Error(`No se pudieron consultar los pacientes: ${error.message}`);

  const query = await searchParams;
  const patient = patients.find((person) => person.id === query.patient);
  const sessions = patient ? await patientSessions(patient.id) : [];

  return (
    <Workspace
      title="Sesiones de pacientes"
      name={actor.fullName}
      description="Elige a un paciente para ver las sesiones que ha registrado al entrenar."
    >
      {patients.length === 0 ? (
        <EmptyState title="Aún no tienes pacientes asignados">
          El administrador puede vincular pacientes a tu atención. Sus sesiones
          aparecerán aquí en cuanto empiecen a entrenar.
        </EmptyState>
      ) : (
        <>
          {/*
            Formulario `GET` sin JavaScript: el paciente elegido va en la URL,
            así que la consulta se puede compartir y el botón de retroceso
            funciona.
          */}
          <form
            className={cn(
              cardVariants({ padding: "sm" }),
              "flex flex-wrap items-end gap-3",
            )}
          >
            <Field label="Paciente" className="min-w-60 flex-1">
              <Select name="patient" defaultValue={patient?.id ?? ""}>
                <option value="">Selecciona un paciente</option>
                {patients.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name ?? "Paciente"}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" variant="outline">
              Consultar sesiones
            </Button>
          </form>

          {patient ? (
            <SessionHistory sessions={sessions} staff />
          ) : (
            <EmptyState className="mt-8" title="Ningún paciente seleccionado">
              Elige a alguien de la lista para ver su historial de sesiones.
            </EmptyState>
          )}
        </>
      )}
    </Workspace>
  );
}
