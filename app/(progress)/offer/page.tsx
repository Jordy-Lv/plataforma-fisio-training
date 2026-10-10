import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { requireAuth } from "@/lib/progress/access";
import {
  listActivePlans,
  listActiveServiceGroups,
} from "@/lib/progress/plan-queries";
import { serviceCategoryLabels } from "@/lib/progress/plan-vocabulary";
import { OfferPlanCard } from "@/components/progress/OfferPlanCard";
import { OfferServiceGroup } from "@/components/progress/OfferServiceGroup";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ListFilters } from "@/components/ui/ListFilters";
import { showcaseList } from "@/lib/progress/showcase-list";

export const metadata: Metadata = {
  title: "Planes y servicios",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireAuth();
  const filters = showcaseList.parse(await searchParams);
  const [plans, groups] = await Promise.all([
    listActivePlans(filters),
    listActiveServiceGroups(filters),
  ]);

  const empty = plans.length === 0 && groups.length === 0;
  const filtrada = showcaseList.hasActiveFilters(filters);
  const choices = [
    { name: "category", label: "Categoría", options: serviceCategoryLabels },
  ];
  const chips = Object.entries(filters)
    .filter(([key, value]) => key !== "page" && value)
    .map(([key, value]) => ({
      label: key === "category"
        ? serviceCategoryLabels[value as keyof typeof serviceCategoryLabels]
        : String(value),
      href: showcaseList.href(filters, { [key]: undefined, page: 1 }),
      removeLabel: key === "category" ? "Quitar la categoría" : "Quitar la búsqueda",
    }));

  return (
    <Workspace
      title="Planes y servicios"
      name={profile.fullName}
      description="Planes de suscripción y servicios que se contratan aparte."
    >
      <section className="max-w-3xl">
        <ListFilters action="/offer" label="Filtros de la oferta" values={filters}
          choices={choices} chips={chips}
          search={{ label: "Buscar por nombre", placeholder: "Un plan o un servicio…" }} />

        {empty && filtrada ? (
          <EmptyState title="Nada de la oferta coincide con estos filtros"
            action={<ButtonLink href="/offer">Ver toda la oferta</ButtonLink>}>
            Prueba con otra categoría o con menos palabras.
          </EmptyState>
        ) : empty ? (
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
                <div
                  role="region"
                  aria-label="Planes de suscripción"
                  tabIndex={0}
                  className="-mx-4 mb-8 overflow-x-auto px-4 pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:mx-0 sm:overflow-visible sm:px-0 snap-x snap-mandatory scroll-px-4 sm:scroll-px-0"
                >
                  <ul aria-label="Planes de suscripción" className="flex items-stretch gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                      <OfferPlanCard key={plan.id} plan={plan} />
                    ))}
                  </ul>
                </div>
              </>
            )}

            {groups.length > 0 && (
              <>
                <h2 className="mb-4 text-xl font-semibold">
                  Servicios adicionales
                </h2>
                <div className="grid gap-4">
                  {groups.map((group) => (
                    <OfferServiceGroup key={group.category} group={group} />
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
