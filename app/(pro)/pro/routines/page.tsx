import Link from "next/link";
import { redirect } from "next/navigation";
import { cn } from "cn";
import { getActiveProfile } from "@/lib/auth/session";
import { listPatientProfiles } from "@/lib/auth/people-queries";
import { routineList } from "@/lib/routines/routine-list";
import { Workspace } from "@/components/auth/Workspace";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";

const stateLabels = { active: "Activos", inactive: "Inactivos" };
const routineLabels = { with: "Con rutina activa", without: "Sin rutina activa" };

/** Lo que se dice de la rutina en la tarjeta, sin abrirla. */
const routineBadge = {
  active: { label: "Rutina activa", variant: "success" as const },
  review: { label: "Pendiente de revisión", variant: "warning" as const },
  none: { label: "Sin rutina", variant: "neutral" as const },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/routine");

  const filters = routineList.parse(await searchParams);
  const { patients, total } = await listPatientProfiles({
    q: filters.q,
    state: filters.state,
    routine: filters.routine,
    range: routineList.range(filters),
  });
  const pages = routineList.pages(total);

  const choices = [
    { name: "state", label: "Estado del paciente", options: stateLabels },
    { name: "routine", label: "Rutina", options: routineLabels },
  ];
  const chips = Object.entries(filters)
    .filter(([key, value]) => key !== "page" && value)
    .map(([key, value]) => {
      const choice = choices.find((choice) => choice.name === key);
      const options: Record<string, string> = choice?.options ?? {};
      return {
        label: options[String(value)] ?? String(value),
        href: routineList.href(filters, { [key]: undefined, page: 1 }),
        removeLabel: `Quitar ${choice?.label ?? "la búsqueda"}`,
      };
    });

  return (
    <Workspace
      title="Rutinas de pacientes"
      name={actor.fullName}
      description="Consulta las rutinas y asigna una propuesta a partir del perfil de cada paciente."
    >
      <ListFilters action="/pro/routines" label="Filtros de pacientes" values={filters}
        choices={choices} chips={chips}
        search={{ label: "Buscar paciente", placeholder: "Escribe un nombre…" }} />
      <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
        {total === 1 ? "1 paciente encontrado" : `${total} pacientes encontrados`}
      </p>

      {patients.length === 0 && (routineList.hasActiveFilters(filters) || filters.page > 1) ? (
        <EmptyState title="Ningún paciente coincide con estos filtros"
          action={<ButtonLink href="/pro/routines">Ver todos los pacientes</ButtonLink>}>
          Prueba con menos filtros o vuelve a la primera página.
        </EmptyState>
      ) : patients.length === 0 ? (
        <EmptyState title="Aún no tienes pacientes asignados">
          El administrador puede vincular pacientes a tu atención. En cuanto lo
          haga, aparecerán aquí para asignarles su rutina.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {patients.map((patient) => {
            const badge = routineBadge[patient.routine];
            return (
              <li key={patient.id} className="flex">
                <article
                  className={cn(
                    cardVariants({ interactive: true }),
                    "flex w-full flex-col gap-3",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-semibold leading-6">
                      <Link
                        href={`/pro/routines/${patient.id}`}
                        prefetch={false}
                        className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {patient.full_name ?? "Paciente sin nombre"}
                      </Link>
                    </h2>
                    {!patient.is_active && <Badge>Inactivo</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <ButtonLink
                      variant="ghost"
                      href={`/people/${patient.id}`}
                      prefetch={false}
                      className="relative">
                      Ver ficha
                    </ButtonLink>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={filters.page} pages={pages}
        hrefFor={(page) => routineList.href(filters, { page })}
        label="Páginas de pacientes" />
    </Workspace>
  );
}
