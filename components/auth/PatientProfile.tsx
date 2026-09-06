import { notFound, redirect } from "next/navigation";

import {
  ConditionForm,
  PatientProfileForm,
} from "@/components/auth/PatientProfileForms";
import { Workspace } from "@/components/auth/Workspace";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { patientIdSchema } from "@/lib/auth/onboarding-schemas";
import { getActiveProfile } from "@/lib/auth/session";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { createClient } from "@/lib/supabase/server";

export async function PatientProfile({ patientId }: { patientId: string }) {
  if (!patientIdSchema.safeParse(patientId).success) notFound();
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  const supabase = await createClient();
  const [person, details, conditions] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, is_active")
      .eq("id", patientId)
      .eq("role", "patient")
      .maybeSingle(),
    supabase
      .from("patient_details")
      .select(
        "profile_id, goal, level, environment, equipment, birth_date, sex, notes, created_at, onboarding_step",
      )
      .eq("profile_id", patientId)
      .maybeSingle(),
    supabase
      .from("patient_conditions")
      .select(
        "id, patient_id, body_part, severity, notes, is_active, created_at",
      )
      .eq("patient_id", patientId)
      .order("created_at"),
  ]);
  if (person.error || details.error || conditions.error)
    throw new Error("No se pudo consultar el perfil del paciente.");
  if (!person.data) notFound();

  const esPropio = actor.role === "patient";

  return (
    <Workspace
      title={esPropio ? "Mi perfil" : person.data.full_name || "Perfil del paciente"}
      role={actor.role}
      description={
        esPropio
          ? "Tu objetivo y tus condiciones deciden qué rutina se te asigna. Manténlos al día."
          : "El objetivo y las condiciones del paciente deciden qué rutina le corresponde."
      }
    >
      {!person.data.is_active && (
        <Card padding="sm" className="mb-6 border-l-4 border-l-warning bg-warning-soft">
          <p>Paciente dado de baja. Su perfil y condiciones se conservan.</p>
        </Card>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <Card padding="lg" className="grid gap-5">
          <CardTitle className="text-xl">Perfil de entrenamiento</CardTitle>
          {details.data ? (
            <PatientProfileForm details={details.data} />
          ) : (
            <CardDescription className="leading-7">
              {esPropio
                ? "Aún no has comenzado tu perfil. Al continuar podrás indicar tu objetivo, tu equipamiento y tus condiciones."
                : "El paciente aún no ha comenzado su perfil. Al entrar, completará su objetivo, equipamiento y condiciones."}
            </CardDescription>
          )}
        </Card>

        <Card padding="lg" className="grid gap-5">
          <div className="grid gap-1">
            <CardTitle className="text-xl">Condiciones e historial</CardTitle>
            <CardDescription>
              Cuando una condición se supera, desmarca «Condición activa». Se
              conserva en el historial.
            </CardDescription>
          </div>

          {conditions.data.length === 0 ? (
            <EmptyState title="Aún no hay condiciones registradas">
              Añade una condición para que el equipo tenga en cuenta las
              molestias y las lesiones al preparar la rutina.
            </EmptyState>
          ) : (
            <ul className="grid gap-3">
              {conditions.data.map((condition) => (
                <li key={condition.id}>
                  <details className="rounded-xl border border-border px-4">
                    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-3 font-medium">
                      {bodyPartLabels[
                        condition.body_part as keyof typeof bodyPartLabels
                      ] ?? condition.body_part}
                      <Badge
                        variant={condition.is_active ? "warning" : "success"}
                      >
                        {condition.is_active ? "Activa" : "Superada"}
                      </Badge>
                    </summary>
                    <div className="pb-4">
                      <ConditionForm
                        patientId={patientId}
                        condition={condition}
                      />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}

          <details className="rounded-xl border border-border px-4">
            <summary className="flex min-h-11 cursor-pointer items-center py-3 font-semibold text-brand">
              Añadir condición
            </summary>
            <div className="pb-4">
              <ConditionForm key={conditions.data.length} patientId={patientId} />
            </div>
          </details>
        </Card>
      </div>
    </Workspace>
  );
}
