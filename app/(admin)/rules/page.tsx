import { ruleList } from "@/lib/catalog/rule-list";
import { FlashToast } from "@/components/ui/FlashToast";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { Notice } from "@/components/ui/Notice";
import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { MoveRuleForm } from "@/components/catalog/RuleControls";
import { requireStaff } from "@/lib/catalog/access";
import { describeConditions } from "@/lib/catalog/describe-rule";
import { listRules, listTemplateOptions } from "@/lib/catalog/rule-queries";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Reglas de asignación",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireStaff();
  const search = await searchParams;
  const filters = ruleList.parse(search);
  const [{ rules, total, pages, activeTotal }, templates] = await Promise.all([listRules(filters), listTemplateOptions()]);
  const eliminada = search.eliminada === "1";
  const canReorder = !ruleList.hasActiveFilters(filters) && filters.page === 1 && pages === 1;
  const choices = [
    { name: "status", label: "Estado", options: { active: "Activas", inactive: "Inactivas" } },
    { name: "state", label: "Condiciones", options: { broken: "Condiciones inválidas" } },
    { name: "template", label: "Plantilla de destino", options: Object.fromEntries(templates.map((template) => [template.id, template.name])) },
  ];
  const chips = Object.entries(filters).filter(([key, value]) => key !== "page" && value).map(([key, value]) => {
    const choice = choices.find((choice) => choice.name === key);
    const options: Record<string, string> = choice?.options ?? {};
    return { label: options[String(value)] ?? String(value),
      href: ruleList.href(filters, { [key]: undefined, page: 1 }), removeLabel: `Quitar ${choice?.label ?? "búsqueda"}` };
  });
  const esAdmin = profile.role === "admin";

  return (
    <Workspace
      title="Reglas de asignación"
      name={profile.fullName}
      description="Cuando un paciente termina su registro se evalúan estas reglas de arriba abajo y gana la primera que coincide con su perfil. Si ninguna coincide, no se le asigna nada: queda a la espera de su profesional."
      actions={
        <>
          <ButtonLink variant="ghost" href="/rules/simulador">
            Probar con un perfil
          </ButtonLink>
          {esAdmin && (
            <ButtonLink variant="default" href="/rules/new">
              Crear regla
            </ButtonLink>
          )}
        </>
      }
    >
      {eliminada && (
        <p
          role="status"
          className="mb-6 rounded-lg bg-brand-soft p-3 text-sm text-brand-soft-foreground"
        >
          Regla eliminada.
        </p>
      )}
      <FlashToast param="eliminada" message="Regla eliminada." />

      {rules.length > 0 && activeTotal === 0 && (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-destructive bg-danger-soft p-3 text-sm text-destructive"
        >
          Ninguna regla está activa: ahora mismo ningún paciente nuevo recibe
          rutina automática.
        </p>
      )}

      <ListFilters action="/rules" label="Filtros de reglas" values={filters} choices={choices} chips={chips} />
      {!canReorder && esAdmin && <Notice tone="info" className="mb-4">Quita los filtros para reordenar. Si hay varias páginas, los controles se ocultan para evitar mover una regla respecto a otra que no está a la vista. El orden es el que evalúa el motor.</Notice>}
      <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">{total} reglas encontradas</p>
      {rules.length === 0 && (ruleList.hasActiveFilters(filters) || filters.page > 1) ? (
        <EmptyState title="No hay reglas en esta página" action={<ButtonLink href="/rules">Ver todas las reglas</ButtonLink>}>
          Prueba con menos filtros o vuelve a la primera página.
        </EmptyState>
      ) : rules.length === 0 ? (
        <EmptyState
          title="Aún no hay reglas de asignación"
          action={
            esAdmin && (
              <ButtonLink variant="default" href="/rules/new">
                Crear la primera regla
              </ButtonLink>
            )
          }
        >
          {esAdmin
            ? "Crea la primera indicando a qué perfil se dirige y qué plantilla le corresponde."
            : "El administrador todavía no ha definido ninguna. Sin reglas, cada rutina se asigna a mano."}
        </EmptyState>
      ) : (
        <ol className="grid gap-4">
          {rules.map((rule, indice) => (
            <li key={rule.id} className={cardVariants()}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-2">
                  <h2 className="text-base font-semibold leading-6">
                    <Link
                      href={`/rules/${rule.id}`}
                      className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {rule.name}
                    </Link>
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>Prioridad {rule.priority}</Badge>
                    <Badge variant={rule.is_active ? "success" : "neutral"}>
                      {rule.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                    <Badge variant={rule.template ? "neutral" : "warning"}>
                      {rule.template
                        ? `Asigna «${rule.template.name}»${rule.template.is_active ? "" : " (borrador)"}`
                        : "Plantilla no disponible"}
                    </Badge>
                  </div>
                </div>

                {esAdmin && canReorder && (
                  <div className="grid grid-cols-2 gap-2">
                    <MoveRuleForm
                      ruleId={rule.id}
                      direction="up"
                      disabled={indice === 0}
                    />
                    <MoveRuleForm
                      ruleId={rule.id}
                      direction="down"
                      disabled={indice === rules.length - 1}
                    />
                  </div>
                )}
              </div>

              {rule.conditions === null ? (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-destructive bg-danger-soft p-3 text-sm text-destructive"
                >
                  <p className="font-semibold">Esta regla no se está aplicando</p>
                  <ul className="mt-2 grid gap-1">
                    {rule.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                  <p className="mt-2 leading-7">
                    Sus condiciones no valen con el formato actual. El motor la
                    ignora hasta que se vuelvan a guardar.
                  </p>
                </div>
              ) : describeConditions(rule.conditions).length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Sin criterios: coincide con cualquier perfil que llegue hasta
                  ella. Es la red de seguridad y debería ser la última.
                </p>
              ) : (
                <dl className="mt-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                  {describeConditions(rule.conditions).map((criterio) => (
                    <div key={criterio.criterion} className="contents">
                      <dt className="text-muted-foreground">
                        {criterio.label}
                      </dt>
                      <dd>{criterio.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          ))}
        </ol>
      )}

      <Pagination page={filters.page} pages={pages} hrefFor={(page) => ruleList.href(filters, { page })} label="Páginas de reglas" />
      {!esAdmin && rules.length > 0 && (
        <EmptyState className="mt-8" title="Las reglas son de solo lectura">
          Puedes consultar las reglas para entender por qué un paciente recibió
          la rutina que recibió, pero cambiarlas es cosa del administrador.
        </EmptyState>
      )}
    </Workspace>
  );
}
