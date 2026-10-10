import { cn } from "cn";

import { cardVariants } from "@/components/ui/Card";
import type { ServiceGroup } from "@/lib/progress/plan-queries";
import {
  formatCurrency,
  serviceCategoryLabels,
} from "@/lib/progress/plan-vocabulary";

export function OfferServiceGroup({ group }: { group: ServiceGroup }) {
  return (
    <section className={cn(cardVariants({ padding: "sm" }), "min-w-0")}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {serviceCategoryLabels[group.category]}
      </h3>
      <ul className="divide-y divide-border">
        {group.services.map((service) => (
          <li key={service.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 break-words font-semibold">{service.name}</p>
              <p className="shrink-0 font-semibold tabular-nums">
                {formatCurrency(service.price)}
              </p>
            </div>
            {service.description && (
              <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                {service.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
