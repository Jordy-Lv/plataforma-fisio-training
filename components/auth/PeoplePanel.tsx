import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { Workspace } from "@/components/auth/Workspace";
import {
  CreatePersonForm,
  AssignmentForm,
  DeactivateForm,
} from "@/components/auth/PeopleForms";
import { specialtyLabels } from "@/lib/auth/people-schemas";

export async function PeoplePanel({
  role,
}: {
  role: "admin" | "professional";
}) {
  const profile = await requireRole(role);
  const supabase = await createClient();
  const [peopleResult, assignmentsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, specialty, phone, is_active")
      .in("role", role === "admin" ? ["professional", "patient"] : ["patient"])
      .order("full_name"),
    supabase
      .from("care_assignments")
      .select("patient_id, professional_id, kind")
      .is("ended_at", null),
  ]);
  if (peopleResult.error || assignmentsResult.error)
    throw new Error(
      "No se pudo cargar la lista de personas. Inténtalo de nuevo.",
    );
  const people = peopleResult.data;
  const assignments = assignmentsResult.data;
  return (
    <Workspace
      title={role === "admin" ? "Personas y equipo" : "Mis pacientes"}
      name={profile.fullName}
    >
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_320px]">
        <section>
          <p className="mb-5 max-w-xl leading-7 text-muted-foreground">
            {role === "admin"
              ? "Gestiona el equipo y el acompañamiento de cada paciente. Las bajas conservan su historial."
              : "Consulta a las personas que acompañas y actualiza su perfil de entrenamiento."}
          </p>
          {people.length === 0 ? (
            <p className="rounded-lg bg-muted p-6 leading-7">
              Aún no tienes pacientes asignados. Crea tu primer paciente para
              comenzar su acompañamiento.
            </p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {people.map((person) => (
                <li key={person.id} className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {person.full_name || "Sin nombre"}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {person.specialty
                          ? specialtyLabels[person.specialty]
                          : "Paciente"}
                        {person.phone && ` · ${person.phone}`}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm ${person.is_active ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"}`}
                    >
                      {person.is_active ? "Activo" : "De baja"}
                    </span>
                  </div>
                  {person.role === "patient" && (
                    <>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {assignments
                          .filter((a) => a.patient_id === person.id)
                          .map((a) => specialtyLabels[a.kind])
                          .join(" y ") || "Sin profesional asignado"}
                      </p>
                      <Link
                        className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4"
                        href={`/people/${person.id}`}
                      >
                        Ver perfil e historial de condiciones
                      </Link>
                    </>
                  )}
                  {role === "admin" && person.is_active && (
                    <DeactivateForm
                      personId={person.id}
                      name={person.full_name || "esta persona"}
                      assignments={
                        assignments.filter(
                          (a) => a.professional_id === person.id,
                        ).length
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="grid gap-8 rounded-xl border border-border bg-surface p-5 sm:p-6">
          <CreatePersonForm isAdmin={role === "admin"} />
          {role === "admin" && (
            <div className="border-t border-border pt-6">
              <AssignmentForm
                patients={people.filter(
                  (p) => p.role === "patient" && p.is_active,
                )}
                professionals={people.filter(
                  (p) => p.role === "professional" && p.is_active,
                )}
              />
            </div>
          )}
        </aside>
      </div>
    </Workspace>
  );
}
