import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  Minus,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

import type {
  BusinessOverview as Overview,
  PreviousMonth,
} from "@/lib/progress/overview-queries";
import { formatMonth, monthStart } from "@/lib/progress/vocabulary";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Progress } from "@/components/ui/Progress";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";

const cardClass = cn(cardVariants(), "grid content-start gap-2");

const percentFormat = new Intl.NumberFormat("es-CO", {
  style: "percent",
  maximumFractionDigits: 0,
});

/** "1 paciente" y "4 pacientes": el recuento se escribe una sola vez. */
const patients = (count: number) =>
  count === 1 ? "1 paciente" : `${count} pacientes`;

const visits = (count: number) =>
  count === 1 ? "1 visita" : `${count} visitas`;

/**
 * Una cifra con su título y la frase que la explica.
 *
 * **El orden `<h3>` → cifra → frase es contrato**: `verify-progress-overview`
 * lee `Título</h3>` seguido de dos `<p>`. Por eso el icono va *dentro* del
 * `<h3>`, antes del texto, y lo que se añade —la barra, la comparación— va
 * después de la frase.
 */
function Metric({
  title,
  icon: Icon,
  value,
  children,
  footer,
}: {
  title: string;
  icon: LucideIcon;
  value: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <article className={cardClass}>
      <h3 className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        {title}
      </h3>
      <p className="mt-1 text-4xl font-semibold tracking-tight">{value}</p>
      <p className="text-sm leading-6 text-muted-foreground">{children}</p>
      {footer}
    </article>
  );
}

/**
 * Cómo se mueve una cifra frente al mes anterior. El color acompaña, pero el
 * texto dice siempre si sube o baja (WCAG 1.4.1).
 */
function Trend({
  delta,
  unit,
  month,
}: {
  delta: number;
  unit: (value: number) => string;
  month: string;
}) {
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const text =
    delta === 0
      ? `Igual que en ${month}`
      : `${delta > 0 ? "Sube" : "Baja"} ${unit(Math.abs(delta))} frente a ${month}`;
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        delta > 0 && "text-success",
        delta < 0 && "text-danger",
        delta === 0 && "text-muted-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

/** El mes sin el año: «agosto». Para comparar, el año sobra. */
const monthName = (value: string) => formatMonth(value).split(" ")[0];

/**
 * El panorama del negocio: clientes activos, cumplimiento y asistencia del mes
 * en curso, cada uno con su comparación frente al mes anterior. Lo que pide
 * acción hoy y los accesos a cada pantalla los monta `AdminHome` alrededor.
 *
 * Desde KAN-5 solo la ve el administrador.
 */
export function BusinessOverview({
  overview,
  previous,
  newPatients,
}: {
  overview: Overview;
  previous: PreviousMonth;
  newPatients: number;
}) {
  const { activePatients, compliance, attendance } = overview;
  const month = formatMonth(monthStart());
  const lastMonth = monthName(previous.since);

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
          <Metric
            title="Clientes activos"
            icon={Users}
            value={String(activePatients)}
            footer={
              <p className="text-xs font-medium text-muted-foreground">
                {newPatients === 0
                  ? "Ningún alta nueva este mes."
                  : newPatients === 1
                    ? "1 alta nueva este mes."
                    : `${newPatients} altas nuevas este mes.`}
              </p>
            }
          >
            {patients(activePatients)} con acceso a la plataforma. Un paciente
            desactivado deja de contar aquí.
          </Metric>

          <Metric
            title="Cumplimiento"
            icon={Target}
            value={
              compliance.rate === null
                ? "—"
                : percentFormat.format(compliance.rate)
            }
            footer={
              compliance.rate !== null && (
                <>
                  <Progress
                    value={compliance.done}
                    max={compliance.logged}
                    label="Ejercicios hechos sobre los registrados este mes"
                  />
                  {previous.complianceRate !== null && (
                    <Trend
                      delta={Math.round(
                        (compliance.rate - previous.complianceRate) * 100,
                      )}
                      unit={(value) =>
                        value === 1 ? "1 punto" : `${value} puntos`
                      }
                      month={lastMonth}
                    />
                  )}
                </>
              )
            }
          >
            {compliance.rate === null
              ? "Nadie ha registrado una sesión este mes. La cifra aparece en cuanto un paciente marque su primer ejercicio."
              : `${compliance.done} de ${compliance.logged} ejercicios hechos en ${compliance.sessions === 1 ? "1 sesión" : `${compliance.sessions} sesiones`} del mes. Los saltados no cuentan.`}
          </Metric>

          <Metric
            title="Asistencia"
            icon={CalendarCheck}
            value={String(attendance.visits)}
            footer={
              <Trend
                delta={attendance.visits - previous.visits}
                unit={visits}
                month={lastMonth}
              />
            }
          >
            {attendance.visits === 0
              ? "Nadie ha venido este mes, o nadie está tomando la asistencia. Regístrala en la ficha de cada paciente."
              : `${attendance.attended === 1 ? "Vino 1" : `Vinieron ${attendance.attended}`} de ${patients(activePatients)}, con ${visits(attendance.visits)} en total.`}
          </Metric>
        </div>
      )}
    </section>
  );
}
