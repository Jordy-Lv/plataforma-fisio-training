import Link from "next/link";
import type { Metadata } from "next";
import { cn } from "cn";
import { Workspace } from "@/components/auth/Workspace";
import { requireStaff } from "@/lib/progress/access";
import { listPatientsWithLastScreening } from "@/lib/progress/screening-queries";
import { formatDate, formatNumber } from "@/lib/progress/vocabulary";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { cardVariants } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Seguimiento físico",
};

export default async function Page() {
  const profile = await requireStaff();
  const patients = await listPatientsWithLastScreening();

  return (
    <Workspace
      title="Seguimiento físico"
      name={profile.fullName}
      description="El tamizaje periódico de cada paciente: peso, talla, IMC y medidas corporales. Sustituye la hoja de cálculo con la que se llevaba antes."
    >
      {patients.length === 0 ? (
        <EmptyState title="Aún no tienes pacientes que seguir">
          {profile.role === "admin"
            ? "Cuando se registre el primer paciente aparecerá aquí para tomarle su tamizaje inicial."
            : "Aquí verás a los pacientes que tengas asignados. Pídele al administrador que te asigne alguno."}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {patients.map((patient) => (
            <li key={patient.id} className="flex">
              <article
                className={cn(
                  cardVariants({ interactive: true }),
                  "flex w-full flex-col gap-3",
                )}
              >
                <h2 className="text-base font-semibold leading-6">
                  <Link
                    href={`/screenings/${patient.id}`}
                    className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {patient.full_name ?? "Paciente sin nombre"}
                  </Link>
                </h2>

                {patient.last ? (
                  <>
                    <Badge variant="info">
                      Último tamizaje: {formatDate(patient.last.taken_on)}
                    </Badge>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Peso</dt>
                      <dd>{formatNumber(patient.last.weight_kg)} kg</dd>
                      <dt className="text-muted-foreground">IMC</dt>
                      <dd>{formatNumber(patient.last.bmi)}</dd>
                    </dl>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Sin tamizajes todavía. Tómale el primero en la evaluación
                    inicial.
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </Workspace>
  );
}
