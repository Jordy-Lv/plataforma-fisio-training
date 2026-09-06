import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { EvolutionChart } from "@/components/progress/EvolutionChart";
import { requireStaff } from "@/lib/progress/access";
import { buildScreeningSeries } from "@/lib/progress/evolution";
import { getLoadProgression } from "@/lib/progress/progression-queries";
import { getPatientScreenings } from "@/lib/progress/screening-queries";

export const metadata: Metadata = {
  title: "Evolución del paciente",
};

const linkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring";

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
  // Las dos agregaciones son independientes: se piden a la vez para no sumar
  // una espera detrás de la otra.
  const [medidas, cargas] = await Promise.all([
    buildScreeningSeries(screenings),
    getLoadProgression(patient.id),
  ]);

  return (
    <Workspace
      title={patient.full_name ?? "Paciente sin nombre"}
      name={profile.fullName}
    >
      <div className="mb-8 -mt-4 flex flex-wrap gap-3">
        <Link href={`/screenings/${patient.id}`} className={linkClass}>
          Sus tamizajes
        </Link>
        <Link href={`/attendance/${patient.id}`} className={linkClass}>
          Su asistencia
        </Link>
      </div>

      <div className="grid gap-10">
        <section aria-labelledby="medidas">
          <h2 id="medidas" className="mb-1 text-xl font-semibold">
            Peso y medidas
          </h2>
          <p className="mb-4 leading-7 text-muted-foreground">
            Cómo ha cambiado lo que se mide en cada tamizaje.
          </p>
          <EvolutionChart
            series={medidas}
            empty="Este paciente no tiene tamizajes todavía. Tómale el primero desde su ficha de seguimiento y aquí aparecerá su evolución."
            single="Con un solo tamizaje aún no hay evolución que dibujar. Registra el segundo y la línea aparecerá sola."
          />
        </section>

        <section aria-labelledby="cargas">
          <h2 id="cargas" className="mb-1 text-xl font-semibold">
            Progresión de carga
          </h2>
          <p className="mb-4 leading-7 text-muted-foreground">
            El peso levantado en cada ejercicio, sesión a sesión.
          </p>
          <EvolutionChart
            series={cargas}
            empty="Aún no hay sesiones con peso registrado. La progresión se dibuja con lo que el paciente marque al entrenar."
            single="Solo hay una sesión con peso en este ejercicio. Con la siguiente se podrá ver si la carga sube."
          />
        </section>
      </div>
    </Workspace>
  );
}
