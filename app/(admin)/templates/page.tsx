import { templateList } from "@/lib/catalog/template-list";
import { ListFilters } from "@/components/catalog/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { DataList } from "@/components/ui/DataList";
import Link from "next/link";
import type { Metadata } from "next";
import { cn } from "cn";
import { Workspace } from "@/components/auth/Workspace";
import { requireStaff } from "@/lib/catalog/access";
import { listTemplates } from "@/lib/catalog/template-queries";
import {
  difficultyLabels,
  environmentLabels,
  goalLabels,
  labelFor,
  templateKindLabels,
} from "@/lib/catalog/vocabulary";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Plantillas de rutina",
};

/** Un criterio sin valor no restringe: la plantilla sirve para cualquier perfil. */
const cualquiera = "Cualquiera";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireStaff();
  const search = await searchParams;
  const filters = templateList.parse(search);
  const { templates, total, pages } = await listTemplates(filters);
  const eliminada = search.eliminada === "1";
  const choices = [
    { name: "kind", label: "Tipo", options: templateKindLabels },
    { name: "goal", label: "Objetivo", options: goalLabels },
    { name: "level", label: "Nivel", options: difficultyLabels },
    { name: "environment", label: "Entorno", options: environmentLabels },
    { name: "status", label: "Estado", options: { active: "Activas", draft: "Borradores" } },
    { name: "incomplete", label: "Construcción", options: { "1": "Incompletas" } },
  ];
  const chips = Object.entries(filters).filter(([key, value]) => key !== "page" && value).map(([key, value]) => {
    const choice = choices.find((choice) => choice.name === key);
    const options: Record<string, string> = choice?.options ?? {};
    return { label: options[value === true ? "1" : String(value)] ?? String(value),
      href: templateList.href(filters, { [key]: undefined, page: 1 }), removeLabel: `Quitar ${choice?.label ?? "búsqueda"}` };
  });
  const esAdmin = profile.role === "admin";

  return (
    <Workspace
      title="Plantillas de rutina"
      name={profile.fullName}
      description="Las rutinas base del equipo. El motor de reglas elige una y la copia para el paciente: la plantilla nunca cambia al asignarse."
      actions={
        esAdmin && (
          <ButtonLink variant="default" href="/templates/new">
            Crear plantilla
          </ButtonLink>
        )
      }
    >
      {eliminada && (
        <p
          role="status"
          className="mb-6 rounded-lg bg-brand-soft p-3 text-sm text-brand-soft-foreground"
        >
          Plantilla eliminada.
        </p>
      )}

      <ListFilters action="/templates" label="Filtros de plantillas" values={filters} choices={choices} chips={chips} />
      <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">{total} plantillas encontradas</p>
      {templates.length === 0 && (templateList.hasActiveFilters(filters) || filters.page > 1) ? (
        <EmptyState title="No hay plantillas en esta página" action={<ButtonLink href="/templates">Ver todas las plantillas</ButtonLink>}>
          Prueba con menos filtros o vuelve a la primera página.
        </EmptyState>
      ) : templates.length === 0 ? (
        <EmptyState
          title="Aún no hay plantillas de rutina"
          action={
            esAdmin && (
              <ButtonLink variant="default" href="/templates/new">
                Crear la primera plantilla
              </ButtonLink>
            )
          }
        >
          {esAdmin
            ? "Crea la primera indicando a qué perfil se dirige y añade después sus días y sus ejercicios."
            : "El administrador todavía no ha creado ninguna. Sin plantillas, el motor de reglas no tiene qué asignar."}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {templates.map((template) => (
            <li key={template.id} className="flex">
              <article
                className={cn(
                  cardVariants({ interactive: true }),
                  "flex w-full flex-col gap-4",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold leading-6">
                    <Link
                      href={`/templates/${template.id}`}
                      className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {template.name}
                    </Link>
                  </h2>
                  <Badge variant={template.is_active ? "success" : "neutral"}>
                    {template.is_active ? "Activa" : "Borrador"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge>{labelFor(templateKindLabels, template.kind)}</Badge>
                  <Badge
                    variant={
                      template.days === template.days_per_week
                        ? "neutral"
                        : "warning"
                    }
                  >
                    {template.days} de {template.days_per_week}{" "}
                    {template.days_per_week === 1 ? "día" : "días"} definidos
                  </Badge>
                  <Badge>
                    {template.items === 1
                      ? "1 ejercicio"
                      : `${template.items} ejercicios`}
                  </Badge>
                </div>

                <DataList items={[
                  { term: "Objetivo", value: template.goal ? labelFor(goalLabels, template.goal) : cualquiera },
                  { term: "Nivel", value: template.level ? labelFor(difficultyLabels, template.level) : cualquiera },
                  { term: "Entorno", value: template.environment ? labelFor(environmentLabels, template.environment) : cualquiera },
                ]} />
              </article>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={filters.page} pages={pages} hrefFor={(page) => templateList.href(filters, { page })} label="Páginas de plantillas" />
    </Workspace>
  );
}
