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
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Planes y servicios",
};

const cardClass = cn(cardVariants(), "grid gap-4");

export default async function Page() {
  const profile = await requireAdmin();
  const [plans, services] = await Promise.all([
    listAllPlans(),
    listAllServices(),
  ]);

  return (
    <Workspace
      title="Planes y servicios"
      name={profile.fullName}
      description="La oferta comercial del negocio. Lo que esté activo se muestra en la vitrina que ve el paciente; desactivar un plan no afecta a las membresías ya registradas con él."
      actions={
        <ButtonLink variant="ghost" href="/offer">
          Ver la vitrina
        </ButtonLink>
      }
    >
      <section className="grid gap-6">
        <h2 className="text-xl font-semibold">Planes de suscripción</h2>

        {plans.length === 0 ? (
          <EmptyState title="Todavía no hay planes">
            Crea el primer plan con el formulario de abajo. Aparecerá en la
            vitrina en cuanto esté activo.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {plans.map((plan) => (
              <li key={plan.id}>
                <article className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold leading-6">
                      {plan.name}
                    </h3>
                    <Badge variant={plan.is_active ? "success" : "neutral"}>
                      {plan.is_active ? "Activo" : "Inactivo"}
                    </Badge>
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
                    name={plan.name}
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
          <EmptyState title="Todavía no hay servicios">
            Nutrición, fisioterapia, artes marciales o talleres. Crea el
            primero con el formulario de abajo.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {services.map((service) => (
              <li key={service.id}>
                <article className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold leading-6">
                      {service.name}
                    </h3>
                    <Badge variant={service.is_active ? "success" : "neutral"}>
                      {service.is_active ? "Activo" : "Inactivo"}
                    </Badge>
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
                    name={service.name}
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
