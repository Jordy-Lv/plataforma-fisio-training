import { retryRead } from "@/lib/auth/retry-read";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Workspace } from "@/components/auth/Workspace";
import { OnboardingForm } from "@/components/auth/OnboardingForm";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const profile = await requireRole("patient", { allowOnboarding: true });
  const supabase = await createClient();
  const { data } = await retryRead(
    () => supabase
      .from("patient_details")
      .select(
        "profile_id, goal, level, environment, equipment, birth_date, sex, notes, created_at, onboarding_step",
      )
      .eq("profile_id", profile.id)
      .maybeSingle(),
    "No se pudo cargar tu perfil. Inténtalo de nuevo.",
  );
  if (data?.onboarding_step === 3) redirect("/patient");
  const nextStep = (data?.onboarding_step ?? 0) + 1;
  const requested = Number((await searchParams).step);
  const step =
    Number.isInteger(requested) && requested >= 1 && requested <= nextStep
      ? requested
      : nextStep;
  return (
    <Workspace
      title="Preparemos tu acompañamiento"
      name={profile.fullName}
      role="patient"
      withNav={false}
    >
      <section className="max-w-xl">
        <ol
          aria-label="Pasos del perfil"
          className="mb-7 grid grid-cols-3 gap-2 text-sm"
        >
          {["Objetivo", "Equipamiento", "Condiciones"].map((label, i) => (
            <li
              key={label}
              aria-current={step === i + 1 ? "step" : undefined}
              className={`border-t-4 pt-3 ${step === i + 1 ? "border-brand font-semibold text-brand" : "border-border text-muted-foreground"}`}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>
        <p className="mb-7 text-sm text-muted-foreground">
          Paso {step} de 3. Guardamos tu avance al continuar.
        </p>
        <OnboardingForm key={step} step={step} details={data} />
      </section>
    </Workspace>
  );
}
