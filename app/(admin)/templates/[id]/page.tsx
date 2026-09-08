import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import {
  AddDayForm,
  AddItemButton,
  DayHeaderForms,
  ItemActions,
  ItemForm,
} from "@/components/catalog/TemplateDays";
import {
  DeleteTemplateForm,
  TemplateForm,
} from "@/components/catalog/TemplateForm";
import { TemplateStatusForm } from "@/components/catalog/TemplateStatus";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { requireStaff } from "@/lib/catalog/access";
import { listExercises } from "@/lib/catalog/queries";
import { exerciseFiltersSchema, exercisesHref } from "@/lib/catalog/schemas";
import {
  getTemplate,
  listRulesUsingTemplate,
  type TemplateItem,
} from "@/lib/catalog/template-queries";
import { daysMismatch, templateIssues } from "@/lib/catalog/template-status";
import {
  difficultyLabels,
  environmentLabels,
  goalLabels,
  labelFor,
  templateKindLabels,
} from "@/lib/catalog/vocabulary";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { SectionHeader, SeeAllLink } from "@/components/ui/SectionHeader";
import { cn } from "cn";
import { cardVariants } from "@/components/ui/Card";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sectionClass = cn(cardVariants({ padding: "lg" }), "mt-10");

/** Un criterio sin valor no restringe: la plantilla sirve para cualquier perfil. */
const cualquiera = "Cualquiera";

/** Cuántos ejercicios se ofrecen al buscar: los que caben sin sepultar el día. */
const maxResultados = 8;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!uuid.test(id)) return { title: "Plantilla de rutina" };
  const template = await getTemplate(id);
  return { title: template?.name ?? "Plantilla de rutina" };
}

/** La prescripción tal como la verá el paciente, en una sola línea. */
function ItemSummary({ item }: { item: TemplateItem }) {
  const partes = [
    item.sets && item.reps
      ? `${item.sets} × ${item.reps}`
      : item.sets
        ? `${item.sets} series`
        : item.reps
          ? `${item.reps} repeticiones`
          : null,
    item.target_weight !== null ? `${item.target_weight} kg` : null,
    item.rest_seconds !== null ? `${item.rest_seconds} s de descanso` : null,
  ].filter(Boolean);

  return (
    <div className="grid gap-1 text-sm">
      <p className="text-muted-foreground">
        {partes.length > 0
          ? partes.join(" · ")
          : "Sin series ni repeticiones indicadas"}
      </p>
      {item.notes && <p className="leading-7">{item.notes}</p>}
    </div>
  );
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

  const template = await getTemplate(id);
  if (!template) notFound();

  const query = await searchParams;
  const recienCreada = query.nueva === "1";
  const puedeEditar = profile.role === "admin";

  // El buscador de ejercicios se abre dentro de un día concreto; la URL es su
  // estado, así que el botón de retroceso lo cierra.
  const diaAbierto =
    typeof query.dia === "string" &&
    template.days.some((dia) => dia.id === query.dia)
      ? query.dia
      : null;
  const filtros = exerciseFiltersSchema.parse({ q: query.q });
  const resultados =
    puedeEditar && diaAbierto
      ? (await listExercises(filtros)).exercises.slice(0, maxResultados)
      : [];

  const totalEjercicios = template.days.reduce(
    (total, dia) => total + dia.items.length,
    0,
  );

  // Qué le falta para poder activarse y a quién afecta apagarla.
  const problemas = templateIssues(template);
  const reglas = await listRulesUsingTemplate(template.id);
  const reglasActivas = reglas.filter((regla) => regla.is_active);

  return (
    <Workspace
      title={template.name}
      name={profile.fullName}
      actions={
        <ButtonLink variant="ghost" href="/templates">
          Volver a las plantillas
        </ButtonLink>
      }
    >
      {recienCreada && (
        <p
          role="status"
          className="mb-6 rounded-lg bg-brand-soft p-3 text-sm text-brand-soft-foreground"
        >
          Plantilla creada como borrador. Añádele sus días y sus ejercicios.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Badge>{labelFor(templateKindLabels, template.kind)}</Badge>
        <Badge variant={template.is_active ? "success" : "neutral"}>
          {template.is_active ? "Activa" : "Borrador"}
        </Badge>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
        <dt className="text-muted-foreground">Objetivo</dt>
        <dd>{template.goal ? labelFor(goalLabels, template.goal) : cualquiera}</dd>
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
        <dt className="text-muted-foreground">Días por semana</dt>
        <dd>
          {template.days.length} de {template.days_per_week} definidos ·{" "}
          {totalEjercicios === 1
            ? "1 ejercicio"
            : `${totalEjercicios} ejercicios`}
        </dd>
      </dl>

      <section className={sectionClass}>
        <h2 className="text-xl font-semibold">Estado de la plantilla</h2>
        <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
          {template.is_active
            ? "Activa: el motor de reglas puede asignarla a pacientes nuevos."
            : "Borrador: no se asignará a nadie mientras siga así."}
        </p>

        {problemas.length > 0 && (
          <div
            id="plantilla-incompleta"
            className="mt-4 rounded-lg border border-destructive bg-danger-soft p-3 text-sm text-destructive"
          >
            <p className="font-semibold">
              Le falta contenido para poder activarse
            </p>
            <ul className="mt-2 grid gap-1">
              {problemas.map((problema) => (
                <li key={problema}>{problema}</li>
              ))}
            </ul>
          </div>
        )}

        {problemas.length === 0 && daysMismatch(template) && (
          <p className="mt-4 rounded-lg bg-muted p-3 text-sm leading-7">
            La plantilla indica {template.days_per_week} días por semana y
            tiene {template.days.length} definidos. Puede activarse igual, pero
            conviene revisar que sea lo que quieres.
          </p>
        )}

        {reglas.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Ninguna regla de asignación la usa todavía.
          </p>
        ) : (
          <div className="mt-5">
            <h3 className="font-semibold">Reglas que la usan</h3>
            <ul className="mt-2 grid gap-1 text-sm">
              {reglas.map((regla) => (
                <li key={regla.id}>
                  «{regla.name}» · prioridad {regla.priority}
                  {regla.is_active ? "" : " · inactiva"}
                </li>
              ))}
            </ul>
            {template.is_active && reglasActivas.length > 0 && (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                {reglasActivas.length === 1
                  ? "Al desactivarla, esa regla se queda sin plantilla activa y no asignará nada hasta que se le indique otra."
                  : "Al desactivarla, esas reglas se quedan sin plantilla activa y no asignarán nada hasta que se les indique otra."}{" "}
                Las rutinas ya asignadas no cambian.
              </p>
            )}
          </div>
        )}

        {puedeEditar && (
          <div className="mt-6">
            <TemplateStatusForm
              templateId={template.id}
              active={template.is_active}
              blocked={problemas.length > 0}
              describedBy="plantilla-incompleta"
            />
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="text-xl font-semibold">Días de la plantilla</h2>
        <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
          El paciente ejecuta los ejercicios en el orden en que aparecen aquí.
          Ese orden se copia tal cual al asignar la rutina.
        </p>

        {template.days.length === 0 ? (
          <EmptyState className="mt-6" title="Esta plantilla aún no tiene ningún día">
            {puedeEditar
              ? "Añade el primero con el formulario del final de esta sección y después sus ejercicios."
              : "El administrador todavía no ha definido su contenido."}
          </EmptyState>
        ) : (
          <ol className="mt-6 grid gap-6">
            {template.days.map((dia) => (
              <li
                key={dia.id}
                id={`dia-${dia.id}`}
                className={cn(cardVariants({ padding: "sm" }), "sm:p-5")}
              >
                <h3 className="text-lg font-semibold">
                  Día {dia.day_number}
                  {dia.title ? ` · ${dia.title}` : ""}
                </h3>

                {puedeEditar && (
                  // Renombrar o eliminar un día es raro; no tiene por qué ocupar
                  // la cabecera de cada día. Cerrado, el `<details>` deja sus
                  // formularios («Eliminar día», `value="<dayId>"`) en el HTML
                  // del servidor, que es lo que recorre `verify-catalog-templates`.
                  <details className="mt-3 rounded-xl border border-border px-4">
                    <summary className="flex min-h-11 cursor-pointer items-center py-3 text-sm font-medium text-brand">
                      Renombrar o eliminar el día
                    </summary>
                    <div className="pb-4">
                      <DayHeaderForms templateId={template.id} day={dia} />
                    </div>
                  </details>
                )}

                {dia.items.length === 0 ? (
                  <p className="mt-4 leading-7 text-muted-foreground">
                    Este día no tiene ejercicios todavía.
                  </p>
                ) : (
                  <ol className="mt-4 grid gap-4">
                    {dia.items.map((item, indice) => (
                      <li
                        key={item.id}
                        className={cn(cardVariants({ padding: "sm" }), "rounded-xl")}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="grid gap-2">
                            <p className="font-semibold">
                              {/* El número es el orden de ejecución, no un
                                  adorno: va pegado al nombre. */}
                              <span className="text-muted-foreground">
                                {`${indice + 1}.`}
                              </span>{" "}
                              <Link
                                href={`/exercises/${item.exercise.id}`}
                                className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                              >
                                {item.exercise.name}
                              </Link>
                            </p>
                            {item.exercise.contraindications.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Contraindicado para:{" "}
                                {item.exercise.contraindications
                                  .map((zona) => labelFor(bodyPartLabels, zona))
                                  .join(", ")}
                              </p>
                            )}
                            {/* La prescripción actual se lee siempre; el
                                formulario para cambiarla espera plegado abajo. */}
                            <ItemSummary item={item} />
                          </div>

                          {puedeEditar && (
                            <ItemActions
                              templateId={template.id}
                              item={item}
                              isFirst={indice === 0}
                              isLast={indice === dia.items.length - 1}
                            />
                          )}
                        </div>

                        {puedeEditar && (
                          // Plegado: una plantilla de cinco ejercicios pasa de
                          // cinco formularios abiertos a cinco líneas. Cerrado,
                          // el `<details>` sigue emitiendo el formulario en el
                          // HTML del servidor, así que `verify-catalog-templates`
                          // encuentra igual su `value="<itemId>"` + `name="targetWeight"`.
                          <details className="mt-3 rounded-xl border border-border px-4">
                            <summary className="flex min-h-11 cursor-pointer items-center py-3 font-semibold text-brand">
                              Ajustar la prescripción
                            </summary>
                            <div className="pb-4">
                              <ItemForm templateId={template.id} item={item} />
                            </div>
                          </details>
                        )}
                      </li>
                    ))}
                  </ol>
                )}

                {puedeEditar && (
                  <div className="mt-5 border-t border-border pt-5">
                    {diaAbierto === dia.id ? (
                      <>
                        <form
                          method="get"
                          action={`/templates/${template.id}`}
                          className="flex flex-wrap items-end gap-3"
                        >
                          <input type="hidden" name="dia" value={dia.id} />
                          <Field
                            label="Buscar un ejercicio del catálogo"
                            className="min-w-60 flex-1"
                          >
                            <Input
                              name="q"
                              type="search"
                              defaultValue={filtros.q ?? ""}
                              maxLength={80}
                              autoCapitalize="none"
                              spellCheck={false}
                              placeholder="Sentadilla, plancha, remo…"
                            />
                          </Field>
                          <Button type="submit">Buscar</Button>
                          <ButtonLink
                            variant="ghost"
                            href={`/templates/${template.id}`}
                          >
                            Cerrar
                          </ButtonLink>
                        </form>

                        {resultados.length === 0 ? (
                          <p className="mt-4 leading-7 text-muted-foreground">
                            Ningún ejercicio coincide con esa búsqueda. Prueba
                            con otra palabra del nombre.
                          </p>
                        ) : (
                          <div className="mt-4">
                            {/*
                              El buscador corta en `maxResultados`, así que
                              cuando llega al tope el «Ver el catálogo» es lo
                              único que dice que hay más y adónde ir a verlo.
                            */}
                            <SectionHeader
                              as="h3"
                              title="Ejercicios encontrados"
                              count={resultados.length}
                              action={
                                resultados.length === maxResultados && (
                                  <SeeAllLink href={exercisesHref(filtros)}>
                                    Ver el catálogo
                                  </SeeAllLink>
                                )
                              }
                            />
                            <ul className="grid gap-3 sm:grid-cols-2">
                              {resultados.map((ejercicio) => (
                                <li
                                  key={ejercicio.id}
                                  className={cn(
                                    cardVariants({ padding: "none" }),
                                    "grid gap-2 rounded-xl p-3",
                                  )}
                                >
                                  <p className="text-sm font-medium">
                                    {ejercicio.name}
                                  </p>
                                  <AddItemButton
                                    templateId={template.id}
                                    dayId={dia.id}
                                    exerciseId={ejercicio.id}
                                    exerciseName={ejercicio.name}
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <ButtonLink
                        href={`/templates/${template.id}?dia=${dia.id}`}
                      >
                        Añadir ejercicios a este día
                      </ButtonLink>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        {puedeEditar && (
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="mb-4 text-lg font-semibold">Añadir un día</h3>
            <div className="max-w-2xl">
              <AddDayForm
                templateId={template.id}
                full={template.days.length >= 7}
              />
            </div>
          </div>
        )}
      </section>

      {puedeEditar ? (
        <>
          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">Datos de la plantilla</h2>
            <p className="mb-6 mt-2 max-w-2xl leading-7 text-muted-foreground">
              A qué perfil se dirige. El motor de reglas usa estos criterios
              para decidir a quién le corresponde.
            </p>
            <div className="max-w-2xl">
              <TemplateForm template={template} />
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="text-xl font-semibold">Eliminar la plantilla</h2>
            <p className="mb-6 mt-2 max-w-2xl leading-7 text-muted-foreground">
              Se eliminan también sus días y sus ejercicios. Las rutinas ya
              asignadas son copias y no se ven afectadas.
            </p>
            <DeleteTemplateForm templateId={template.id} />
          </section>
        </>
      ) : (
        <EmptyState className="mt-10" title="Esta plantilla es de solo lectura">
          Puedes consultar las plantillas, pero editarlas es cosa del
          administrador. Pídeselo si algo de esta no encaja con lo que ves en
          consulta.
        </EmptyState>
      )}
    </Workspace>
  );
}
