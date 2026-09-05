import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
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

  return (
    <Workspace title="Mi membresía" name={profile.fullName}>
      <section className="max-w-xl">
        <Link
          href="/patient"
          className="mb-8 inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
        >
          Volver a mi espacio
        </Link>

        {!membership ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-semibold">Todavía no tienes una membresía</p>
            <p className="mt-2 leading-7 text-muted-foreground">
              Cuando el administrador registre tu plan, verás aquí tu fecha de
              vencimiento y su estado. Consulta la oferta en{" "}
              <Link href="/offer" className="font-medium underline">
                planes y servicios
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-4 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {membership.plan_name ?? "Tu plan"}
              </h2>
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {membershipStatusLabels[membership.status]}
              </span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Ingreso</dt>
              <dd>{formatDate(membership.started_on)}</dd>
              <dt className="text-muted-foreground">Vencimiento</dt>
              <dd className="font-medium">
                {formatDate(membership.expires_on)}
              </dd>
              <dt className="text-muted-foreground">Monto</dt>
              <dd>{formatCurrency(membership.amount)}</dd>
            </dl>
            <p className="leading-7 text-muted-foreground">
              Tu mensualidad {formatDueIn(membership.expires_on)}. Si necesitas
              renovarla o cambiar de plan, habla con recepción.
            </p>
          </div>
        )}
      </section>
    </Workspace>
  );
}
