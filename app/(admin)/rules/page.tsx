import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { MoveRuleForm } from "@/components/catalog/RuleControls";
import { rolePaths } from "@/lib/auth/session";
import { requireStaff } from "@/lib/catalog/access";
import { describeConditions } from "@/lib/catalog/describe-rule";
import { listRules } from "@/lib/catalog/rule-queries";

export const metadata: Metadata = {
  title: "Reglas de asignación",
};

const backLinkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring";

const tagClass =
  "inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireStaff();
  const rules = await listRules();
  const eliminada = (await searchParams).eliminada === "1";
  const esAdmin = profile.role === "admin";
  const activas = rules.filter((rule) => rule.is_active);

  return (
    <Workspace title="Reglas de asignación" name={profile.fullName}>
      <p className="-mt-4 max-w-2xl leading-7 text-muted-foreground">
        Cuando un paciente termina su registro se evalúan estas reglas de
        arriba abajo y gana la primera que coincide con su perfil. Si ninguna
        coincide, no se le asigna nada: queda a la espera de su profesional.
      </p>

      <div className="mb-6 mt-4 flex flex-wrap gap-3">
        <Link href={rolePaths[profile.role]} className={backLinkClass}>
          Volver a mi panel
        </Link>
        <Link href="/rules/simulador" className={backLinkClass}>
          Probar con un perfil
        </Link>
        <Link href="/templates" className={backLinkClass}>
          Plantillas de rutina
        </Link>
        {esAdmin && (
          <Link
            href="/rules/new"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Crear regla
          </Link>
        )}
      </div>

      {eliminada && (
        <p
          role="status"
          className="mb-6 rounded-lg bg-brand-soft p-3 text-sm text-foreground"
        >
          Regla eliminada.
        </p>
      )}

      {rules.length > 0 && activas.length === 0 && (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-destructive p-3 text-sm text-destructive"
        >
          Ninguna regla está activa: ahora mismo ningún paciente nuevo recibe
          rutina automática.
        </p>
      )}

      {rules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-semibold">Aún no hay reglas de asignación</p>
          <p className="mx-auto mt-2 max-w-md leading-7 text-muted-foreground">
            {esAdmin
              ? "Crea la primera indicando a qué perfil se dirige y qué plantilla le corresponde."
              : "El administrador todavía no ha definido ninguna. Sin reglas, cada rutina se asigna a mano."}
          </p>
          {esAdmin && (
            <Link href="/rules/new" className={`mt-5 ${backLinkClass}`}>
              Crear la primera regla
            </Link>
          )}
        </div>
      ) : (
        <ol className="grid gap-4">
          {rules.map((rule, indice) => (
            <li
              key={rule.id}
              className="rounded-2xl border border-border bg-surface p-5"
            >
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
                    <span className={tagClass}>
                      Prioridad {rule.priority}
                    </span>
                    <span
                      className={
                        rule.is_active
                          ? "inline-flex items-center rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand"
                          : tagClass
                      }
                    >
                      {rule.is_active ? "Activa" : "Inactiva"}
                    </span>
                    <span className={tagClass}>
                      {rule.template
                        ? `Asigna «${rule.template.name}»${rule.template.is_active ? "" : " (borrador)"}`
                        : "Plantilla no disponible"}
                    </span>
                  </div>
                </div>

                {esAdmin && (
                  <div className="flex gap-2">
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
                  className="mt-4 rounded-lg border border-destructive p-3 text-sm text-destructive"
                >
                  <p className="font-semibold">
                    Esta regla no se está aplicando
                  </p>
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

      {!esAdmin && rules.length > 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-6 leading-7 text-muted-foreground">
          Puedes consultar las reglas para entender por qué un paciente recibió
          la rutina que recibió, pero cambiarlas es cosa del administrador.
        </p>
      )}
    </Workspace>
  );
}
