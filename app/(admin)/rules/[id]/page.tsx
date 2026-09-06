import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { RuleStatusForm } from "@/components/catalog/RuleControls";
import { DeleteRuleForm, RuleForm } from "@/components/catalog/RuleForm";
import { requireStaff } from "@/lib/catalog/access";
import { describeConditions } from "@/lib/catalog/describe-rule";
import { getRule, listTemplateOptions } from "@/lib/catalog/rule-queries";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sectionClass = cn(cardVariants({ padding: "lg" }), "mt-10");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!uuid.test(id)) return { title: "Regla de asignación" };
  const rule = await getRule(id);
  return { title: rule?.name ?? "Regla de asignación" };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireStaff();
  const { id } = await params;
  if (!uuid.test(id)) notFound();

  const rule = await getRule(id);
  if (!rule) notFound();

  const recienCreada = (await searchParams).nueva === "1";
  const puedeEditar = profile.role === "admin";
  const templates = puedeEditar ? await listTemplateOptions() : [];
  const criterios = rule.conditions ? describeConditions(rule.conditions) : [];

  return (
    <Workspace
      title={rule.name}
      name={profile.fullName}
      actions={
        <ButtonLink variant="ghost" href="/rules">
          Volver a las reglas
        </ButtonLink>
      }
    >
      {recienCreada && (
        <p
          role="status"
          className="mb-6 rounded-lg bg-brand-soft p-3 text-sm text-brand-soft-foreground"
        >
          Regla creada como inactiva. Pruébala en el simulador y actívala
          cuando haga lo que esperas.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Badge>Prioridad {rule.priority}</Badge>
        <Badge variant={rule.is_active ? "success" : "neutral"}>
          {rule.is_active ? "Activa" : "Inactiva"}
        </Badge>
      </div>

      <section className={sectionClass}>
        <h2 className="text-xl font-semibold">Qué hace esta regla</h2>
        <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
          {rule.template ? (
            <>
              Al paciente que coincida se le asigna una copia de{" "}
              <Link
                href={`/templates/${rule.template.id}`}
                className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
              >
                «{rule.template.name}»
              </Link>
              {rule.template.is_active
                ? "."
                : ", que hoy está en borrador y no se asignará hasta que se active."}
            </>
          ) : (
            "Su plantilla ya no está disponible: indícale otra antes de activarla."
          )}
        </p>

        {rule.conditions === null ? (
          <div
            id="regla-invalida"
            className="mt-5 rounded-lg border border-destructive bg-danger-soft p-3 text-sm text-destructive"
          >
            <p className="font-semibold">Sus condiciones no son válidas</p>
            <ul className="mt-2 grid gap-1">
              {rule.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            <p className="mt-2 leading-7">
              El motor la ignora mientras siga así. Revisa los criterios abajo y
              vuelve a guardarla.
            </p>
          </div>
        ) : criterios.length === 0 ? (
          <p className="mt-5 leading-7 text-muted-foreground">
            Sin criterios: coincide con cualquier perfil que llegue hasta ella.
            Es la red de seguridad y debería tener la prioridad más alta en
            número, para que se evalúe la última.
          </p>
        ) : (
          <dl className="mt-5 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            {criterios.map((criterio) => (
              <div key={criterio.criterion} className="contents">
                <dt className="text-muted-foreground">{criterio.label}</dt>
                <dd>{criterio.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {puedeEditar && (
          <div className="mt-6">
            <RuleStatusForm
              ruleId={rule.id}
              active={rule.is_active}
              blocked={rule.conditions === null}
              describedBy="regla-invalida"
            />
          </div>
        )}

        <ButtonLink href="/rules/simulador" className="mt-6">
          Probar con un perfil
        </ButtonLink>
      </section>

      {puedeEditar ? (
        <>
          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">Criterios de la regla</h2>
            <p className="mb-6 mt-2 max-w-2xl leading-7 text-muted-foreground">
              Cambiar esto afecta a las asignaciones siguientes; las rutinas ya
              asignadas son copias y no cambian.
            </p>
            <div className="max-w-2xl">
              <RuleForm rule={rule} templates={templates} />
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">Eliminar la regla</h2>
            <p className="mb-6 mt-2 max-w-2xl leading-7 text-muted-foreground">
              Si solo quieres dejar de aplicarla, desactívala: se conserva lo
              que escribiste y puede volver a entrar cuando quieras.
            </p>
            <DeleteRuleForm ruleId={rule.id} />
          </section>
        </>
      ) : (
        <EmptyState className="mt-10" title="Esta regla es de solo lectura">
          Puedes consultar esta regla para entender una asignación, pero
          cambiarla es cosa del administrador.
        </EmptyState>
      )}
    </Workspace>
  );
}
