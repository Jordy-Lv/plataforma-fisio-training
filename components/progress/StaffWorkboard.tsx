import Link from "next/link";
import { cn } from "cn";

import { cardVariants } from "@/components/ui/Card";
import type { StaffWorkboard as Workboard } from "@/lib/progress/overview-queries";

const cardClass = cn(cardVariants({ interactive: true }), "grid gap-1");

/** "1 alerta" y "3 alertas": el recuento y su nombre se escriben una vez. */
function count(n: number, singular: string, plural: string) {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

/**
 * Una cifra de trabajo con su título, su frase y un enlace que cubre toda la
 * tarjeta: se toca en cualquier punto y lleva a la pantalla donde se resuelve.
 */
function WorkMetric({
  title,
  value,
  href,
  children,
}: {
  title: string;
  value: number;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <article className={cardClass}>
      <h3 className="text-sm font-medium text-muted-foreground">
        <Link
          href={href}
          className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {title}
        </Link>
      </h3>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      <p className="text-sm leading-6 text-muted-foreground">{children}</p>
    </article>
  );
}

/**
 * El trabajo que el personal tiene abierto ahora mismo, aparte del panorama
 * del mes. Cuatro cifras que enlazan a la pantalla donde se atiende cada una.
 * Las consultas viven en `getStaffWorkboard` y RLS decide el alcance.
 */
export function StaffWorkboard({ workboard }: { workboard: Workboard }) {
  const { unreadAlerts, todaySessions, expiringMemberships, pendingScreenings } =
    workboard;

  return (
    <section className="mt-8 grid gap-6">
      <div>
        <h2 className="text-xl font-semibold">Lo que pide atención</h2>
        <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
          El trabajo abierto hoy. Cada cifra abre la pantalla donde se resuelve.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <WorkMetric
          title="Alertas sin leer"
          value={unreadAlerts}
          href="/pro/alerts"
        >
          {unreadAlerts === 0
            ? "Ninguna alerta clínica pendiente de revisar."
            : `${count(unreadAlerts, "alerta clínica", "alertas clínicas")} sin abrir.`}
        </WorkMetric>

        <WorkMetric
          title="Sesiones de hoy"
          value={todaySessions}
          href="/pro/sessions"
        >
          {todaySessions === 0
            ? "Nadie ha entrenado hoy todavía."
            : `${count(todaySessions, "sesión registrada", "sesiones registradas")} con fecha de hoy.`}
        </WorkMetric>

        <WorkMetric
          title="Membresías por vencer"
          value={expiringMemberships}
          href="/memberships"
        >
          {expiringMemberships === 0
            ? "Ninguna mensualidad entra en su ventana de vencimiento."
            : `${count(expiringMemberships, "mensualidad está", "mensualidades están")} próximas a vencer.`}
        </WorkMetric>

        <WorkMetric
          title="Tamizajes pendientes"
          value={pendingScreenings}
          href="/screenings"
        >
          {pendingScreenings === 0
            ? "Todos los pacientes activos tienen su evaluación inicial."
            : `${count(pendingScreenings, "paciente activo no tiene", "pacientes activos no tienen")} ningún tamizaje.`}
        </WorkMetric>
      </div>
    </section>
  );
}
