import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { rolePaths } from "@/lib/auth/session";
import { requireStaff } from "@/lib/progress/access";
import { listPatientsWithLastScreening } from "@/lib/progress/screening-queries";
import { formatDate, formatNumber } from "@/lib/progress/vocabulary";

export const metadata: Metadata = {
  title: "Seguimiento físico",
};

const linkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring";

const tagClass =
  "inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";

export default async function Page() {
  const profile = await requireStaff();
  const patients = await listPatientsWithLastScreening();

  return (
    <Workspace title="Seguimiento físico" name={profile.fullName}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        El tamizaje periódico de cada paciente: peso, talla, IMC y medidas
        corporales. Sustituye la hoja de cálculo con la que se llevaba antes.
      </p>

      <div className="mb-6 mt-4 flex flex-wrap gap-3">
        <Link href={rolePaths[profile.role]} className={linkClass}>
          Volver a mi panel
        </Link>
      </div>

      {patients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-semibold">Aún no tienes pacientes que seguir</p>
          <p className="mx-auto mt-2 max-w-md leading-7 text-muted-foreground">
            {profile.role === "admin"
              ? "Cuando se registre el primer paciente aparecerá aquí para tomarle su tamizaje inicial."
              : "Aquí verás a los pacientes que tengas asignados. Pídele al administrador que te asigne alguno."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {patients.map((patient) => (
            <li key={patient.id} className="flex">
              <article className="relative flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 focus-within:border-brand hover:border-brand">
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
                    <span className={tagClass}>
                      Último tamizaje: {formatDate(patient.last.taken_on)}
                    </span>
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
