import Link from "next/link";
import type { Metadata } from "next";
import { cn } from "cn";
import { Workspace } from "@/components/auth/Workspace";
import { requireStaff } from "@/lib/progress/access";
import { listPatientsWithLastScreening } from "@/lib/progress/screening-queries";
import { screeningList, screeningOrderLabels } from "@/lib/progress/screening-list";
import { formatDate, formatNumber } from "@/lib/progress/vocabulary";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { DataList } from "@/components/ui/DataList";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = {
  title: "Seguimiento físico",
};

const takenLabels = { some: "Con tamizaje", none: "Sin tamizaje" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireStaff();
  const filters = screeningList.parse(await searchParams);
  const { patients, total, pages } = await listPatientsWithLastScreening(filters);

  const choices = [
    { name: "taken", label: "Tamizaje", options: takenLabels },
    { name: "orden", label: "Orden", options: screeningOrderLabels, required: true },
  ];
  // `orden` no es un filtro —no restringe resultados, solo su orden— así que
  // no genera píldora, igual que `page`.
  const chips = Object.entries(filters)
    .filter(([key, value]) => key !== "page" && key !== "orden" && value)
    .map(([key, value]) => {
      const choice = choices.find((choice) => choice.name === key);
      const options: Record<string, string> = choice?.options ?? {};
      return {
        label: options[String(value)] ?? String(value),
        href: screeningList.href(filters, { [key]: undefined, page: 1 }),
        removeLabel: `Quitar ${choice?.label ?? "la búsqueda"}`,
      };
    });

  return (
    <Workspace
      title="Seguimiento físico"
      name={profile.fullName}
      description="El tamizaje periódico de cada paciente: peso, talla, IMC y medidas corporales. Sustituye la hoja de cálculo con la que se llevaba antes."
    >
      <ListFilters action="/screenings" label="Filtros de seguimiento" values={filters}
        choices={choices} chips={chips}
        search={{ label: "Buscar paciente", placeholder: "Escribe un nombre…" }} />
      <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
        {total === 1 ? "1 paciente encontrado" : `${total} pacientes encontrados`}
      </p>

      {patients.length === 0 && (screeningList.hasActiveFilters(filters) || filters.page > 1) ? (
        <EmptyState title="Ningún paciente coincide con estos filtros"
          action={<ButtonLink href="/screenings">Ver todos los pacientes</ButtonLink>}>
          Prueba con menos filtros o vuelve a la primera página.
        </EmptyState>
      ) : patients.length === 0 ? (
        <EmptyState title="Aún no tienes pacientes que seguir">
          {profile.role === "admin"
            ? "Cuando se registre el primer paciente aparecerá aquí para tomarle su tamizaje inicial."
            : "Aquí verás a los pacientes que tengas asignados. Pídele al administrador que te asigne alguno."}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {patients.map((patient) => (
            <li key={patient.id} className="flex">
              <article
                className={cn(
                  cardVariants({ interactive: true }),
                  "flex w-full flex-col gap-3",
                )}
              >
                <h2 className="text-base font-semibold leading-6">
                  <Link
                    href={`/screenings/${patient.id}`}
                    className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {patient.full_name ?? "Paciente sin nombre"}
                  </Link>
                </h2>

                {patient.last ? (
                  <>
                    <Badge variant="info">
                      Último tamizaje: {formatDate(patient.last.taken_on)}
                    </Badge>
                    <DataList items={[
                      { term: "Peso", value: `${formatNumber(patient.last.weight_kg)} kg` },
                      { term: "IMC", value: formatNumber(patient.last.bmi) },
                    ]} />
                  </>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Sin tamizajes todavía. Tómale el primero en la evaluación
                    inicial.
                  </p>
                )}

                {/*
                  `relative` para quedar por encima del `after:inset-0` que hace
                  clicable toda la tarjeta; sin eso, el enlace de la ficha es
                  inalcanzable.
                */}
                <ButtonLink
                  variant="ghost"
                  href={`/people/${patient.id}`}
                  className="relative mt-auto justify-self-start"
                >
                  Ver ficha
                </ButtonLink>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={filters.page} pages={pages}
        hrefFor={(page) => screeningList.href(filters, { page })}
        label="Páginas de pacientes" />
    </Workspace>
  );
}
