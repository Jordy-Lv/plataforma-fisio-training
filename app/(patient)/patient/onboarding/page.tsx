import { retryRead } from "@/lib/auth/retry-read";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Workspace } from "@/components/auth/Workspace";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { Card } from "@/components/ui/Card";
import { cn } from "cn";

const steps = ["Objetivo", "Equipamiento", "Condiciones"];

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
        {/*
          Los pasos ya recorridos se distinguen del que falta: sin eso, a mitad
          del alta no se sabía cuánto quedaba y el abandono se pagaba caro,
          porque hasta terminarla el paciente no puede entrar a nada.
        */}
        <ol
          aria-label="Pasos del perfil"
          className="mb-6 grid grid-cols-3 gap-2 text-sm"
        >
          {steps.map((label, i) => {
            const number = i + 1;
            const done = number < step;
            const current = number === step;
            return (
              <li
                key={label}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "border-t-4 pt-3",
                  current && "border-brand font-semibold text-brand",
                  done && "border-brand text-foreground",
                  !current && !done && "border-border text-muted-foreground",
                )}
              >
                {done ? `✓ ${label}` : `${number}. ${label}`}
              </li>
            );
          })}
        </ol>

        <Card padding="lg">
          <p className="mb-6 text-sm text-muted-foreground">
            Paso {step} de {steps.length}. Guardamos tu avance al continuar.
          </p>
          <OnboardingForm key={step} step={step} details={data} />
        </Card>
      </section>
    </Workspace>
  );
}
