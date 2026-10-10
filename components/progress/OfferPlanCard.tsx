import { Check } from "lucide-react";
import { cn } from "cn";

import { cardVariants } from "@/components/ui/Card";
import type { Plan } from "@/lib/progress/plan-queries";
import {
  billingPeriodSuffix,
  formatCurrency,
} from "@/lib/progress/plan-vocabulary";

export function OfferPlanCard({ plan }: { plan: Plan }) {
  return (
    <li
      className={cn(
        cardVariants({ padding: "sm" }),
        "min-w-0 basis-[85%] shrink-0 snap-start space-y-3 break-words only:basis-full sm:basis-auto",
      )}
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold leading-6">{plan.name}</h3>
        <p>
          <strong className="text-2xl font-semibold tabular-nums">
            {formatCurrency(plan.price)}
          </strong>{" "}
          <span className="text-sm text-muted-foreground">
            {billingPeriodSuffix[plan.billing_period]}
          </span>
        </p>
      </div>
      {plan.description && (
        <p className="text-sm leading-6 text-muted-foreground">
          {plan.description}
        </p>
      )}
      {plan.features.length > 0 && (
        <ul className="grid gap-1 text-sm leading-6 text-muted-foreground">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand" />
              <span className="min-w-0">{feature}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
