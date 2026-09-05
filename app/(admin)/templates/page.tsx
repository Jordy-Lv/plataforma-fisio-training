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

export const metadata: Metadata = {
  title: "Plantillas de rutina",
};

const backLinkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring";

const tagClass =
  "inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";

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
        <Link href={rolePaths[profile.role]} className={backLinkClass}>
          Volver a mi panel
        </Link>
        <Link href="/exercises" className={backLinkClass}>
          Catálogo de ejercicios
        </Link>
        <Link href="/rules" className={backLinkClass}>
          Reglas de asignación
        </Link>
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
            <Link href="/templates/new" className={`mt-5 ${backLinkClass}`}>
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
                  <span
                    className={
                      template.is_active
                        ? "inline-flex items-center rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand"
                        : tagClass
                    }
                  >
                    {template.is_active ? "Activa" : "Borrador"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className={tagClass}>
                    {labelFor(templateKindLabels, template.kind)}
                  </span>
                  <span className={tagClass}>
                    {template.days} de {template.days_per_week}{" "}
                    {template.days_per_week === 1 ? "día" : "días"} definidos
                  </span>
                  <span className={tagClass}>
                    {template.items === 1
                      ? "1 ejercicio"
                      : `${template.items} ejercicios`}
                  </span>
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
