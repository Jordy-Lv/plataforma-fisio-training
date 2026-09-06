import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { rolePaths } from "@/lib/auth/session";
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
  const templates = await listTemplates();
  const eliminada = (await searchParams).eliminada === "1";
  const esAdmin = profile.role === "admin";

  return (
    <Workspace title="Plantillas de rutina" name={profile.fullName}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        Las rutinas base del equipo. El motor de reglas elige una y la copia
        para el paciente: la plantilla nunca cambia al asignarse.
      </p>

      <div className="mb-6 mt-4 flex flex-wrap gap-3">
        <ButtonLink href={rolePaths[profile.role]}>
          Volver a mi panel
        </ButtonLink>
        <ButtonLink href="/exercises">
          Catálogo de ejercicios
        </ButtonLink>
        <ButtonLink href="/rules">
          Reglas de asignación
        </ButtonLink>
        {esAdmin && (
          <Link
            href="/templates/new"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Crear plantilla
          </Link>
        )}
      </div>

      {eliminada && (
        <p
          role="status"
          className="mb-6 rounded-lg bg-brand-soft p-3 text-sm text-foreground"
        >
          Plantilla eliminada.
        </p>
      )}

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-semibold">Aún no hay plantillas de rutina</p>
          <p className="mx-auto mt-2 max-w-md leading-7 text-muted-foreground">
            {esAdmin
              ? "Crea la primera indicando a qué perfil se dirige y añade después sus días y sus ejercicios."
              : "El administrador todavía no ha creado ninguna. Sin plantillas, el motor de reglas no tiene qué asignar."}
          </p>
          {esAdmin && (
            <Link href="/templates/new" className="mt-5">
              Crear la primera plantilla
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {templates.map((template) => (
            <li key={template.id} className="flex">
              <article className="relative flex w-full flex-col gap-4 rounded-2xl border border-border bg-surface p-5 focus-within:border-brand hover:border-brand">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold leading-6">
                    <Link
                      href={`/templates/${template.id}`}
                      className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {template.name}
                    </Link>
                  </h2>
                  <Badge variant={template.is_active ? "brand" : "neutral"}>
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

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Objetivo</dt>
                  <dd>
                    {template.goal
                      ? labelFor(goalLabels, template.goal)
                      : cualquiera}
                  </dd>
                  <dt className="text-muted-foreground">Nivel</dt>
                  <dd>
                    {template.level
                      ? labelFor(difficultyLabels, template.level)
                      : cualquiera}
                  </dd>
                  <dt className="text-muted-foreground">Entorno</dt>
                  <dd>
                    {template.environment
                      ? labelFor(environmentLabels, template.environment)
                      : cualquiera}
                  </dd>
                </dl>
              </article>
            </li>
          ))}
        </ul>
      )}
    </Workspace>
  );
}
