import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfile, rolePaths } from "@/lib/auth/session";
import { patientIdSchema } from "@/lib/auth/onboarding-schemas";
import { Workspace } from "@/components/auth/Workspace";
import {
  PatientProfileForm,
  ConditionForm,
} from "@/components/auth/PatientProfileForms";
import { bodyPartLabels } from "@/lib/catalog/body-parts";

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
  return (
    <Workspace
      title={
        actor.role === "patient"
          ? "Mi perfil"
          : person.data.full_name || "Perfil del paciente"
      }
    >
      <Link
        className="mb-6 inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4"
        href={rolePaths[actor.role]}
      >
        Volver a mi espacio
      </Link>
      {!person.data.is_active && (
        <p className="mb-6 rounded-lg bg-muted p-4">
          Paciente dado de baja. Su perfil y condiciones se conservan.
        </p>
      )}
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-5 text-xl font-semibold">
            Perfil de entrenamiento
          </h2>
          {details.data ? (
            <PatientProfileForm details={details.data} />
          ) : (
            <p className="leading-7 text-muted-foreground">
              El paciente aún no ha comenzado su perfil. Al entrar, completará
              su objetivo, equipamiento y condiciones.
            </p>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            Condiciones e historial
          </h2>
          <p className="mb-5 text-sm leading-6 text-muted-foreground">
            Cuando una condición se supera, desmarca «Condición activa». Se
            conserva en el historial.
          </p>
          {conditions.data.length === 0 && (
            <p className="mb-5 rounded-lg bg-muted p-4 text-sm">
              Aún no hay condiciones registradas. Puedes añadir una a
              continuación.
            </p>
          )}
          {conditions.data.map((condition) => (
            <details
              className="mb-4 rounded-lg border border-border bg-surface p-4"
              key={condition.id}
            >
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-medium">
                {bodyPartLabels[
                  condition.body_part as keyof typeof bodyPartLabels
                ] ?? condition.body_part}
                <span className="text-sm text-muted-foreground">
                  {condition.is_active ? "Activa" : "Superada"}
                </span>
              </summary>
              <div className="pt-4">
                <ConditionForm patientId={patientId} condition={condition} />
              </div>
            </details>
          ))}
          <details className="rounded-lg border border-border bg-surface p-4">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-brand">
              Añadir condición
            </summary>
            <div className="pt-4">
              <ConditionForm
                key={conditions.data.length}
                patientId={patientId}
              />
            </div>
          </details>
        </section>
      </div>
    </Workspace>
  );
}
