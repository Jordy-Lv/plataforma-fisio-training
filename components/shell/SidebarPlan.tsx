import Link from "next/link";
import { cn } from "cn";

import { daysUntil } from "@/lib/progress/membership-vocabulary";
import { currentPlan } from "@/lib/progress/patient-plan";

/*
  Tarjeta del plan al pie del menú lateral del paciente: qué plan tiene, cuántos
  días le quedan y una barra con lo que le queda de la membresía. Lleva a
  Membresía. Si está por vencer, en ámbar; sin membresía vigente, «Básico».

  Es un Server Component que `AppShell` pasa al menú (cliente) dentro de un
  `Suspense`: el menú se pinta sin esperar a esta consulta. Plegado el menú, no
  se ve (`group-data-[collapsed=true]/side:hidden`).
*/
export async function SidebarPlan({ patientId }: { patientId: string }) {
  const plan = await currentPlan(patientId);
  const daysLeft = plan.expiresOn ? Math.max(daysUntil(plan.expiresOn), 0) : null;
  const totalDays =
    plan.startedOn && plan.expiresOn
      ? Math.max(daysUntil(plan.expiresOn) - daysUntil(plan.startedOn), 1)
      : null;
  const percent =
    daysLeft !== null && totalDays ? Math.min(100, Math.round((daysLeft / totalDays) * 100)) : 0;

  return (
    <Link
      href="/memberships/me"
      prefetch={false}
      className="block rounded-xl border border-border px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-brand-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring group-data-[collapsed=true]/side:hidden"
    >
      Tu plan
      <b className="block text-sm text-foreground">{plan.label}</b>
      {daysLeft === null ? (
        "Sin membresía activa"
      ) : (
        <>
          <span className={cn(plan.isExpiring && "font-semibold text-warning")}>
            {daysLeft === 1 ? "1 día" : `${daysLeft} días`} para que venza
          </span>
          <span aria-hidden="true" className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className={cn("block h-full rounded-full", plan.isExpiring ? "bg-warning" : "bg-brand-bright")}
              style={{ width: `${percent}%` }}
            />
          </span>
        </>
      )}
    </Link>
  );
}
