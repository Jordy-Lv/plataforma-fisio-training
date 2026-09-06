import type { Metadata } from "next";
import { cn } from "cn";
import { Workspace } from "@/components/auth/Workspace";
import { requireAuth } from "@/lib/progress/access";
import {
  listActivePlans,
  listActiveServiceGroups,
} from "@/lib/progress/plan-queries";
import {
  billingPeriodSuffix,
  formatCurrency,
  serviceCategoryLabels,
} from "@/lib/progress/plan-vocabulary";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Planes y servicios",
};

export default async function Page() {
  const profile = await requireAuth();
  const [plans, groups] = await Promise.all([
    listActivePlans(),
    listActiveServiceGroups(),
  ]);

  const empty = plans.length === 0 && groups.length === 0;

  return (
    <Workspace
      title="Planes y servicios"
      name={profile.fullName}
      description="Lo que el negocio ofrece hoy: los planes de suscripción y los servicios que se contratan aparte."
    >
      <section className="max-w-3xl">
        {empty ? (
          <EmptyState title="Todavía no hay oferta publicada">
            Cuando el administrador active los planes y servicios, los verás
            aquí con su descripción y su precio.
          </EmptyState>
        ) : (
          <>
            {plans.length > 0 && (
              <>
                <h2 className="mb-4 text-xl font-semibold">
                  Planes de suscripción
                </h2>
                <ul className="mb-10 grid gap-4 sm:grid-cols-2">
                  {plans.map((plan) => (
                    <li
                      key={plan.id}
                      className={cn(cardVariants(), "grid gap-3")}
                    >
                      <h3 className="text-base font-semibold leading-6">
                        {plan.name}
                      </h3>
                      <p>
                        <strong className="text-lg font-semibold">
                          {formatCurrency(plan.price)}
                        </strong>{" "}
                        <span className="text-sm text-muted-foreground">
                          {billingPeriodSuffix[plan.billing_period]}
                        </span>
                      </p>
                      {plan.description && (
                        <p className="text-sm leading-6 text-muted-foreground">
                          {plan.description}
                        </p>
                      )}
                      {plan.features.length > 0 && (
                        <ul className="grid list-disc gap-1 pl-5 text-sm leading-6 text-muted-foreground">
                          {plan.features.map((feature) => (
                            <li key={feature}>{feature}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {groups.length > 0 && (
              <>
                <h2 className="mb-4 text-xl font-semibold">
                  Servicios adicionales
                </h2>
                <div className="grid gap-8">
                  {groups.map((group) => (
                    <div key={group.category}>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {serviceCategoryLabels[group.category]}
                      </h3>
                      <ul className="grid gap-3">
                        {group.services.map((service) => (
                          <li
                            key={service.id}
                            className={cardVariants()}
                          >
                            <p className="font-semibold">{service.name}</p>
                            {service.description && (
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {service.description}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </Workspace>
  );
}
