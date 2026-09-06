import Link from "next/link";
import type { Metadata } from "next";

import { Workspace } from "@/components/auth/Workspace";
import { Badge, membershipBadgeVariant } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getPatientMembership } from "@/lib/progress/membership-queries";
import {
  formatDueIn,
  membershipStatusLabels,
} from "@/lib/progress/membership-vocabulary";
import { formatCurrency } from "@/lib/progress/plan-vocabulary";
import { formatDate } from "@/lib/progress/vocabulary";

export const metadata: Metadata = {
  title: "Mi membresía",
};

export default async function Page() {
  const profile = await requireRole("patient");
  const membership = await getPatientMembership(profile.id);
  const alerta =
    membership?.status === "expiring_soon" || membership?.status === "expired";

  return (
    <Workspace title="Mi membresía" name={profile.fullName} role="patient">
      <div className="max-w-xl">
        {/*
          El aviso lleva el mismo color que el estado de la membresía —ámbar por
          vencer, rojo vencida—, para que se lea igual aquí que en el panel del
          administrador.
        */}
        {membership && alerta && (
          <Card
            role="status"
            padding="sm"
            className={`mb-6 grid gap-1 border-l-4 ${
              membership.status === "expired"
                ? "border-l-danger bg-danger-soft"
                : "border-l-warning bg-warning-soft"
            }`}
          >
            <p className="font-semibold">
              {membership.status === "expired"
                ? "Tu membresía está vencida"
                : "Tu membresía está por vencer"}
            </p>
            <p className="leading-7">
              {membership.status === "expired"
                ? `Venció el ${formatDate(membership.expires_on)}. Renuévala en recepción para seguir asistiendo.`
                : `Vence el ${formatDate(membership.expires_on)}. Renuévala antes de esa fecha para no interrumpir tus sesiones.`}
            </p>
          </Card>
        )}

        {!membership ? (
          <EmptyState title="Todavía no tienes una membresía">
            Cuando el administrador registre tu plan, verás aquí tu fecha de
            vencimiento y su estado. Consulta la oferta en{" "}
            <Link
              href="/offer"
              className="font-medium underline underline-offset-4"
            >
              planes y servicios
            </Link>
            .
          </EmptyState>
        ) : (
          <Card padding="lg" className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CardTitle className="text-lg">
                {membership.plan_name ?? "Tu plan"}
              </CardTitle>
              <Badge variant={membershipBadgeVariant(membership.status)}>
                {membershipStatusLabels[membership.status]}
              </Badge>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Ingreso</dt>
              <dd>{formatDate(membership.started_on)}</dd>
              <dt className="text-muted-foreground">Vencimiento</dt>
              <dd className="font-medium">{formatDate(membership.expires_on)}</dd>
              <dt className="text-muted-foreground">Monto</dt>
              <dd>{formatCurrency(membership.amount)}</dd>
            </dl>

            <p className="leading-7 text-muted-foreground">
              Tu mensualidad {formatDueIn(membership.expires_on)}. Si necesitas
              renovarla o cambiar de plan, habla con recepción.
            </p>
          </Card>
        )}
      </div>
    </Workspace>
  );
}
