import type { ReactNode } from "react";
import { cn } from "cn";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { Workspace } from "@/components/auth/Workspace";
import {
  CreatePersonForm,
  AssignmentForm,
  DeactivateForm,
} from "@/components/auth/PeopleForms";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { specialtyLabels } from "@/lib/auth/people-schemas";

/**
 * `overview` se pinta dentro del shell, antes de la lista. Antes el panel de
 * administración lo montaba fuera y repetía a mano el ancho del contenedor;
 * con la navegación de la fase 2 eso habría dejado el panorama por encima de
 * la cabecera.
 */
export async function PeoplePanel({
  role,
  overview,
}: {
  role: "admin" | "professional";
  overview?: ReactNode;
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
      role={role === "admin" ? "admin" : "professional"}
      description={
        role === "admin"
          ? "Gestiona el equipo y el acompañamiento de cada paciente. Las bajas conservan su historial."
          : "Consulta a las personas que acompañas y actualiza su perfil de entrenamiento."
      }
    >
      {overview}
      {/*
        La lista y el formulario se parten en dos columnas a partir de `xl`
        (1280px). Antes lo hacían en `lg` (1024px) y entre ~1024 y ~1200, con la
        barra lateral del shell, la columna de "Dar de alta" no cabía y la
        pantalla desbordaba en horizontal. `min-w-0` en la lista deja que su
        pista flexible se encoja por debajo del ancho de su contenido.
      */}
      <div className="mt-10 grid items-start gap-10 xl:grid-cols-[1fr_320px]">
        <section className="min-w-0">
          {people.length === 0 ? (
            <EmptyState title="Aún no tienes pacientes asignados">
              Crea tu primer paciente con el formulario de esta pantalla para
              comenzar su acompañamiento.
            </EmptyState>
          ) : (
            <ul className="grid gap-4">
              {people.map((person) => (
                <li key={person.id} className={cardVariants()}>
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
                    <Badge variant={person.is_active ? "success" : "neutral"}>
                      {person.is_active ? "Activo" : "De baja"}
                    </Badge>
                  </div>
                  {person.role === "patient" && (
                    <>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {assignments
                          .filter((a) => a.patient_id === person.id)
                          .map((a) => specialtyLabels[a.kind])
                          .join(" y ") || "Sin profesional asignado"}
                      </p>
                      <ButtonLink
                        variant="ghost"
                        className="mt-3"
                        href={`/people/${person.id}`}
                      >
                        Ver perfil e historial de condiciones
                      </ButtonLink>
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
        <aside className={cn(cardVariants({ padding: "lg" }), "grid gap-8")}>
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
