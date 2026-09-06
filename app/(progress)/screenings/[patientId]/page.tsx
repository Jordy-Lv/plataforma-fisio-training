import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { ScreeningForm } from "@/components/progress/ScreeningForm";
import { requireStaff } from "@/lib/progress/access";
import {
  getPatientScreenings,
  type Screening,
} from "@/lib/progress/screening-queries";
import {
  formatDate,
  formatNumber,
  measurementLabels,
  measurements,
} from "@/lib/progress/vocabulary";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Tamizajes del paciente",
};

function Measurements({ screening }: { screening: Screening }) {
  const tomadas = measurements.filter(
    (key) => screening.measurements[key] !== undefined,
  );
  if (tomadas.length === 0) return null;

  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border pt-3 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
      {tomadas.map((key) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground">{measurementLabels[key]}</dt>
          <dd>{formatNumber(screening.measurements[key])} cm</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const profile = await requireStaff();
  const { patientId } = await params;
  const seguimiento = await getPatientScreenings(patientId);

  // RLS devuelve vacío tanto si el paciente no existe como si el profesional
  // no lo tiene asignado: en ambos casos, para quien mira, no está.
  if (!seguimiento) notFound();

  const { patient, screenings } = seguimiento;

  return (
    <Workspace
      title={patient.full_name ?? "Paciente sin nombre"}
      name={profile.fullName}
    >
      <div className="mb-8 -mt-4 flex flex-wrap gap-3">
        <ButtonLink href="/screenings">
          Volver al seguimiento
        </ButtonLink>
        <ButtonLink href={`/attendance/${patient.id}`}>
          Ver su asistencia
        </ButtonLink>
        <ButtonLink href={`/evolution/${patient.id}`}>
          Ver su evolución
        </ButtonLink>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
        <section aria-labelledby="historial">
          <h2 id="historial" className="mb-4 text-xl font-semibold">
            Historial de tamizajes
          </h2>

          {screenings.length === 0 ? (
            <EmptyState title="Este paciente no tiene tamizajes">
              Registra el primero con el formulario de esta página. A partir
              del segundo se podrá ver su evolución.
            </EmptyState>
          ) : (
            <ul className="grid gap-4">
              {screenings.map((screening) => (
                <li
                  key={screening.id}
                  className="rounded-2xl border border-border bg-surface p-5"
                >
                  <h3 className="mb-3 font-semibold">
                    {formatDate(screening.taken_on)}
                  </h3>

                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
                    <dt className="text-muted-foreground">Peso</dt>
                    <dd>{formatNumber(screening.weight_kg)} kg</dd>
                    <dt className="text-muted-foreground">Talla</dt>
                    <dd>{formatNumber(screening.height_cm)} cm</dd>
                    <dt className="text-muted-foreground">IMC</dt>
                    <dd>{formatNumber(screening.bmi)}</dd>
                    <dt className="text-muted-foreground">Grasa</dt>
                    <dd>
                      {screening.body_fat_pct === null
                        ? "—"
                        : `${formatNumber(screening.body_fat_pct)} %`}
                    </dd>
                  </dl>

                  <Measurements screening={screening} />

                  {screening.notes && (
                    <p className="mt-3 leading-7 text-muted-foreground">
                      {screening.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="nuevo"
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <h2 id="nuevo" className="mb-1 text-xl font-semibold">
            Registrar un tamizaje
          </h2>
          <p className="mb-6 text-sm leading-6 text-muted-foreground">
            El IMC lo calcula la plataforma a partir del peso y la talla.
          </p>
          <ScreeningForm patientId={patient.id} />
        </section>
      </div>
    </Workspace>
  );
}
