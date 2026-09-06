import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { Choices } from "@/components/auth/FormParts";
import { Field, Input } from "@/components/ui/Field";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { equipmentLabels } from "@/lib/catalog/equipment";
import { requireStaff } from "@/lib/catalog/access";
import { failedChecks } from "@/lib/catalog/evaluate-rules";
import { simulate } from "@/lib/catalog/simulation";
import {
  simulationProfileSchema,
  simulationValuesFromParams,
  toSearchParams,
} from "@/lib/catalog/simulation-schemas";
import {
  difficultyLabels,
  environmentLabels,
  goalLabels,
  labelFor,
} from "@/lib/catalog/vocabulary";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Simulador de asignación",
};

const sectionClass = cn(cardVariants({ padding: "lg" }), "mt-10");

/** Por qué una regla no ganó, en una línea. */
const motivos: Record<string, string> = {
  inactive: "Inactiva: no participa en la evaluación.",
  invalid: "Sus condiciones no son válidas y el motor la ignora.",
  not_evaluated: "No llegó a evaluarse: ganó una regla anterior.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireStaff();
  const query = await searchParams;
  const params = toSearchParams(query);
  const enviado = params.get("simular") === "1";

  const parsed = enviado
    ? simulationProfileSchema.safeParse(simulationValuesFromParams(params))
    : null;
  const simulado = parsed?.success ? parsed.data : null;
  const result = simulado ? await simulate(simulado) : null;

  return (
    <Workspace
      title="Simulador de asignación"
      name={profile.fullName}
      description="Un perfil de mentira para ver qué recibiría si se registrara ahora: qué regla ganaría, qué plantilla le tocaría y qué ejercicios se le quitarían por sus condiciones. No crea ningún paciente ni ninguna rutina."
      actions={
        <ButtonLink variant="ghost" href="/rules">
          Volver a las reglas
        </ButtonLink>
      }
    >
      <section className={cardVariants({ padding: "lg" })}>
        <h2 className="text-xl font-semibold">Perfil del paciente</h2>
        <form method="get" className="mt-6 grid max-w-2xl gap-8">
          <input type="hidden" name="simular" value="1" />

          <Choices
            name="goal"
            title="Objetivo"
            labels={goalLabels}
            selected={simulado?.goal ?? "general_health"}
          />
          <Choices
            name="level"
            title="Nivel"
            labels={difficultyLabels}
            selected={simulado?.level ?? "beginner"}
          />
          <Choices
            name="environment"
            title="Entorno"
            labels={environmentLabels}
            selected={simulado?.environment ?? "home"}
          />
          <Choices
            name="equipment"
            title="Equipamiento disponible"
            labels={equipmentLabels}
            selected={simulado?.equipment ?? ["none"]}
            multiple
          />
          <Choices
            name="conditions"
            title="Condiciones activas"
            labels={bodyPartLabels}
            selected={simulado?.conditions ?? []}
            multiple
          />

          <Field label="Edad (años)">
            <Input
              name="age"
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              defaultValue={simulado?.age ?? ""}
              placeholder="Sin indicar"
            />
          </Field>

          <Button type="submit" size="lg" className="justify-self-start">
            Simular la asignación
          </Button>
        </form>
      </section>

      {parsed && !parsed.success && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-destructive bg-danger-soft p-3 text-sm text-destructive"
        >
          {parsed.error.issues[0].message}
        </p>
      )}

      {result && (
        <section className={sectionClass}>
          <h2 className="text-xl font-semibold">Resultado</h2>

          {!result.evaluation.match ? (
            <EmptyState className="mt-4" title="Ninguna regla coincide">
              Este paciente se quedaría sin rutina automática: se avisaría a su
              profesional y su pantalla diría que le están preparando la rutina.
              No se inventa una plantilla. Si esto no es lo que quieres, revisa
              las condiciones de las reglas o crea una regla genérica sin
              criterios como red de seguridad.
            </EmptyState>
          ) : (
            <>
              <div className="mt-4 rounded-lg bg-brand-soft p-4 text-brand-soft-foreground">
                <p className="font-semibold">
                  Gana «{result.evaluation.match.rule.name}» · prioridad{" "}
                  {result.evaluation.match.rule.priority}
                </p>
                <p className="mt-2 leading-7">
                  {result.template ? (
                    <>
                      Se le asignaría una copia de{" "}
                      <Link
                        href={`/templates/${result.template.id}`}
                        className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        «{result.template.name}»
                      </Link>
                      {result.template.is_active
                        ? "."
                        : ", pero esa plantilla está en borrador: hoy no se asignaría nada."}
                    </>
                  ) : (
                    "Su plantilla ya no está disponible: hoy no se asignaría nada."
                  )}
                </p>
              </div>

              <h3 className="mt-6 font-semibold">Por qué gana</h3>
              <ul className="mt-2 grid gap-1 text-sm">
                {result.evaluation.match.checks.length === 0 ? (
                  <li className="text-muted-foreground">
                    No tiene criterios: coincide con cualquier perfil.
                  </li>
                ) : (
                  result.evaluation.match.checks.map((check) => (
                    <li key={check.criterion}>
                      Pide {check.expected}; el perfil trae {check.actual}.
                    </li>
                  ))
                )}
              </ul>
            </>
          )}

          {result.plan && (
            <>
              <h3 className="mt-8 font-semibold">
                Ejercicios que se quitarían por contraindicación
              </h3>
              {result.plan.removed.length === 0 ? (
                <p className="mt-2 leading-7 text-muted-foreground">
                  Ninguno: nada de esta plantilla está contraindicado para sus
                  condiciones.
                </p>
              ) : (
                <ul className="mt-2 grid gap-1 text-sm">
                  {result.plan.removed.map((item) => (
                    <li key={`${item.day_number}-${item.exercise_id}`}>
                      Día {item.day_number}: «{item.exercise_name}»,
                      contraindicado para{" "}
                      {item.reasons
                        .map((zona) => labelFor(bodyPartLabels, zona))
                        .join(" y ")}
                      .
                    </li>
                  ))}
                </ul>
              )}

              {result.plan.needsReview && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-destructive bg-danger-soft p-3 text-sm text-destructive"
                >
                  <p className="font-semibold">
                    La rutina no se entregaría tal cual
                  </p>
                  <ul className="mt-2 grid gap-1">
                    {result.plan.alerts.map((alerta) => (
                      <li key={alerta}>{alerta}</li>
                    ))}
                  </ul>
                  <p className="mt-2 leading-7">
                    Se marcaría para revisión del profesional y se generaría una
                    alerta. Nunca se entrega un día vacío.
                  </p>
                </div>
              )}

              <h3 className="mt-8 font-semibold">
                La rutina que recibiría el paciente
              </h3>
              <ol className="mt-3 grid gap-4">
                {result.plan.days.map((dia) => (
                  <li
                    key={dia.day_number}
                    className={cn(cardVariants({ padding: "sm" }), "rounded-xl")}
                  >
                    <p className="font-semibold">
                      Día {dia.day_number}
                      {dia.title ? ` · ${dia.title}` : ""}
                    </p>
                    {dia.items.length === 0 ? (
                      <p className="mt-2 text-sm text-destructive">
                        Sin ejercicios tras el filtro.
                      </p>
                    ) : (
                      <ol className="mt-2 grid gap-1 text-sm">
                        {dia.items.map((item, indice) => (
                          <li key={item.id}>
                            <span className="text-muted-foreground">
                              {`${indice + 1}.`}
                            </span>{" "}
                            {item.exercise.name}
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}

          <h3 className="mt-8 font-semibold">Qué pasó con las demás reglas</h3>
          {result.evaluation.rules.length === 0 ? (
            <p className="mt-2 leading-7 text-muted-foreground">
              No hay ninguna regla definida todavía.
            </p>
          ) : (
            <ul className="mt-2 grid gap-2 text-sm">
              {result.evaluation.rules.map((evaluacion) => {
                const fallidos = failedChecks(evaluacion);
                return (
                  <li key={evaluacion.rule.id} className="leading-7">
                    <Badge>{evaluacion.rule.priority}</Badge>{" "}
                    <Link
                      href={`/rules/${evaluacion.rule.id}`}
                      className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {evaluacion.rule.name}
                    </Link>{" "}
                    —{" "}
                    {evaluacion.status === "match"
                      ? "coincide y gana."
                      : evaluacion.status === "no_match"
                        ? fallidos
                            .map(
                              (check) =>
                                `pide ${check.expected} y el perfil trae ${check.actual}`,
                            )
                            .join("; ") + "."
                        : motivos[evaluacion.status]}
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-8 rounded-lg bg-muted p-3 text-sm leading-7">
            Esta simulación no ha creado ningún paciente, ninguna rutina ni
            ningún registro: solo ha leído las reglas y la plantilla.
          </p>
        </section>
      )}
    </Workspace>
  );
}
