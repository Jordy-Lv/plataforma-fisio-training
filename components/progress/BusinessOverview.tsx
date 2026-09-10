import type { BusinessOverview as Overview } from "@/lib/progress/overview-queries";
import {
  formatMonth,
  formatTimes,
  monthStart,
} from "@/lib/progress/vocabulary";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";

const cardClass = cn(cardVariants(), "grid gap-2");

const percentFormat = new Intl.NumberFormat("es-CO", {
  style: "percent",
  maximumFractionDigits: 0,
});

/** "1 paciente" y "4 pacientes": el recuento se escribe una sola vez. */
const patients = (count: number) =>
  count === 1 ? "1 paciente" : `${count} pacientes`;

/** Una cifra con su título y la frase que la explica. */
function Metric({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <article className={cardClass}>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      <p className="text-sm leading-6 text-muted-foreground">{children}</p>
    </article>
  );
}

/**
 * El panorama del negocio: clientes activos, cumplimiento y asistencia del mes
 * en curso. Lo que tiene pantalla propia —alertas, membresías y planes— se
 * enlaza, no se repite aquí.
 *
 * Los enlaces del pie dependen del rol: `/plans` es `requireAdmin`, así que
 * ofrecérselo al profesional era mandarlo a un rebote. Es la misma regla que
 * gobierna el menú (`components/shell/nav-items.ts`): un enlace que redirige
 * nada más pulsarlo es peor que no tenerlo.
 */
export function BusinessOverview({
  overview,
  role,
}: {
  overview: Overview;
  role: "admin" | "professional";
}) {
  const { activePatients, compliance, attendance } = overview;
  const month = formatMonth(monthStart());

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-xl font-semibold">Panorama del negocio</h2>
        <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
          Cómo va {month}. El cumplimiento y la asistencia son del mes en curso;
          los clientes activos son los de hoy.
        </p>
      </div>

      {activePatients === 0 ? (
        <EmptyState
          title="Todavía no hay clientes activos"
          action={<ButtonLink href="/people">Ir a Personas</ButtonLink>}
        >
          El panorama se llena cuando haya pacientes entrenando. Registra el
          primero desde el panel de personas.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric title="Clientes activos" value={String(activePatients)}>
            {patients(activePatients)} con acceso a la plataforma. Un paciente
            desactivado deja de contar aquí.
          </Metric>

          <Metric
            title="Cumplimiento"
            value={
              compliance.rate === null
                ? "—"
                : percentFormat.format(compliance.rate)
            }
          >
            {compliance.rate === null
              ? "Nadie ha registrado una sesión este mes. La cifra aparece en cuanto un paciente marque su primer ejercicio."
              : `${compliance.done} de ${compliance.logged} ejercicios hechos en ${compliance.sessions === 1 ? "1 sesión" : `${compliance.sessions} sesiones`} del mes. Los saltados no cuentan.`}
          </Metric>

          <Metric title="Asistencia" value={String(attendance.visits)}>
            {attendance.visits === 0
              ? "Nadie ha venido este mes, o nadie está tomando la asistencia. Regístrala en la ficha de cada paciente."
              : `Vino ${patients(attendance.attended)} de ${activePatients}; entre todos asistieron ${formatTimes(attendance.visits)}.`}
          </Metric>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/attendance">
          Asistencia por paciente
        </ButtonLink>
        <ButtonLink href="/pro/alerts">
          Alertas
        </ButtonLink>
        <ButtonLink href="/memberships">
          Membresías
        </ButtonLink>
        {role === "admin" && (
          <ButtonLink href="/plans">
            Planes y servicios
          </ButtonLink>
        )}
      </div>
    </section>
  );
}
