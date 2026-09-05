import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { OfferControls } from "@/components/progress/OfferControls";
import { PlanForm } from "@/components/progress/PlanForm";
import { ServiceForm } from "@/components/progress/ServiceForm";
import { requireAdmin } from "@/lib/progress/access";
import { listAllPlans, listAllServices } from "@/lib/progress/plan-queries";
import {
  billingPeriodSuffix,
  formatCurrency,
  serviceCategoryLabels,
} from "@/lib/progress/plan-vocabulary";

export const metadata: Metadata = {
  title: "Planes y servicios",
};

const backLinkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring";

const tagClass =
  "inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";

const cardClass =
  "grid gap-4 rounded-2xl border border-border bg-surface p-5";

export default async function Page() {
  const profile = await requireAdmin();
  const [plans, services] = await Promise.all([
    listAllPlans(),
    listAllServices(),
  ]);

  return (
    <Workspace title="Planes y servicios" name={profile.fullName}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        La oferta comercial del negocio. Lo que esté activo se muestra en la
        vitrina que ve el paciente; desactivar un plan no afecta a las
        membresías ya registradas con él.
      </p>

      <div className="mb-8 mt-4 flex flex-wrap gap-3">
        <Link href="/admin" className={backLinkClass}>
          Volver a mi panel
        </Link>
        <Link href="/offer" className={backLinkClass}>
          Ver la vitrina
        </Link>
      </div>

      <section className="grid gap-6">
        <h2 className="text-xl font-semibold">Planes de suscripción</h2>

        {plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-semibold">Todavía no hay planes</p>
            <p className="mx-auto mt-2 max-w-md leading-7 text-muted-foreground">
              Crea el primer plan con el formulario de abajo. Aparecerá en la
              vitrina en cuanto esté activo.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {plans.map((plan) => (
              <li key={plan.id}>
                <article className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold leading-6">
                      {plan.name}
                    </h3>
                    <span className={tagClass}>
                      {plan.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-sm">
                    <strong className="font-semibold">
                      {formatCurrency(plan.price)}
                    </strong>{" "}
                    {billingPeriodSuffix[plan.billing_period]}
                  </p>
                  {plan.description && (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {plan.description}
                    </p>
                  )}
                  {plan.features.length > 0 && (
                    <ul className="grid list-disc gap-1 pl-5 text-sm text-muted-foreground">
                      {plan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  )}
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">
                      Editar
                    </summary>
                    <div className="mt-4">
                      <PlanForm plan={plan} />
                    </div>
                  </details>
                  <OfferControls
                    kind="plan"
                    id={plan.id}
                    isActive={plan.is_active}
                  />
                </article>
              </li>
            ))}
          </ul>
        )}

        <article className={cardClass}>
          <h3 className="text-base font-semibold">Nuevo plan</h3>
          <PlanForm />
        </article>
      </section>

      <section className="mt-12 grid gap-6">
        <h2 className="text-xl font-semibold">Servicios adicionales</h2>

        {services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-semibold">Todavía no hay servicios</p>
            <p className="mx-auto mt-2 max-w-md leading-7 text-muted-foreground">
              Nutrición, fisioterapia, artes marciales o talleres. Crea el
              primero con el formulario de abajo.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {services.map((service) => (
              <li key={service.id}>
                <article className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold leading-6">
                      {service.name}
                    </h3>
                    <span className={tagClass}>
                      {service.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {serviceCategoryLabels[service.category]}
                  </p>
                  {service.description && (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">
                      Editar
                    </summary>
                    <div className="mt-4">
                      <ServiceForm service={service} />
                    </div>
                  </details>
                  <OfferControls
                    kind="service"
                    id={service.id}
                    isActive={service.is_active}
                  />
                </article>
              </li>
            ))}
          </ul>
        )}

        <article className={cardClass}>
          <h3 className="text-base font-semibold">Nuevo servicio</h3>
          <ServiceForm />
        </article>
      </section>
    </Workspace>
  );
}
