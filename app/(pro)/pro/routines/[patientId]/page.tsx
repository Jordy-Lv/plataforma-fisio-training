import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cn } from "cn";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { listExercises } from "@/lib/catalog/queries";
import { exerciseFiltersSchema } from "@/lib/catalog/schemas";
import { labelFor } from "@/lib/catalog/vocabulary";
import { assignmentSchema } from "@/lib/routines/assignment";
import { calendarHref } from "@/lib/routines/calendar";
import { calendarQuerySchema } from "@/lib/routines/schemas";
import {
  activeConditions,
  editableRoutines,
  type EditableRoutineItem,
} from "@/lib/routines/item-queries";
import { Workspace } from "@/components/auth/Workspace";
import { AssignmentForm } from "@/components/routines/AssignmentForm";
import {
  AddRoutineItemButton,
  RemoveRoutineItemButton,
  ReplaceRoutineItemButton,
  RoutineItemForm,
} from "@/components/routines/RoutineItems";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";

const statusLabels = {
  active: "Activa",
  pending_review: "Pendiente de revisión",
  completed: "Finalizada",
  archived: "Archivada",
};

/** El estado de la rutina no es un error del sistema: solo el que pide revisión avisa. */
const statusVariants = {
  active: "success",
  pending_review: "warning",
  completed: "neutral",
  archived: "neutral",
} as const;

/** Cuántos ejercicios se ofrecen al buscar: los que caben sin sepultar el día. */
const maxResultados = 8;

/** Las condiciones del paciente que este ejercicio agrava. */
const clashes = (item: EditableRoutineItem, conditions: string[]) =>
  conditions.filter((condition) =>
    (item.exercises?.contraindications ?? []).includes(condition),
  );

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/routine");
  const values = assignmentSchema.safeParse(await params);
  if (!values.success) notFound();
  const { patientId } = values.data;

  const supabase = await createClient();
  const { data: patient, error } = await supabase
    .from("profiles")
    .select("id, full_name, is_active")
    .eq("id", patientId)
    .eq("role", "patient")
    .maybeSingle();
  if (error) throw new Error("No se pudo consultar el paciente.");
  if (!patient) notFound();

  const [routines, conditions] = await Promise.all([
    editableRoutines(patientId),
    activeConditions(patientId),
  ]);

  // El buscador del catálogo se abre dentro de un día —para añadir— o sobre un
  // ejercicio concreto —para sustituirlo—. La URL es su estado, así que el
  // botón de retroceso lo cierra.
  const query = await searchParams;
  const calendarQuery = calendarQuerySchema.safeParse({
    date: query.calendarDate,
    view: query.calendarView,
  });
  const calendarContext =
    calendarQuery.success && calendarQuery.data.date
      ? {
          date: calendarQuery.data.date,
          view: calendarQuery.data.view,
          returnHref: `${calendarHref(`/pro/routines/${patientId}/calendar`, calendarQuery.data.date, calendarQuery.data.view)}#calendar-schedule`,
        }
      : undefined;
  const items = routines.flatMap((routine) =>
    routine.routine_days.flatMap((day) => day.routine_items),
  );
  const diaAbierto =
    typeof query.dia === "string" &&
    routines.some((routine) =>
      routine.routine_days.some((day) => day.id === query.dia),
    )
      ? query.dia
      : null;
  const itemAbierto =
    typeof query.item === "string" &&
    items.some((item) => item.id === query.item)
      ? query.item
      : null;
  const filtros = exerciseFiltersSchema.parse({ q: query.q });
  const resultados =
    diaAbierto || itemAbierto
      ? (await listExercises(filtros)).exercises.slice(0, maxResultados)
      : [];

  const base = `/pro/routines/${patientId}`;
  const editorParams = new URLSearchParams();
  if (calendarContext) {
    editorParams.set("calendarDate", calendarContext.date);
    editorParams.set("calendarView", calendarContext.view);
  }
  const editorHref = (filter?: { name: "dia" | "item"; value: string }) => {
    const parameters = new URLSearchParams(editorParams);
    if (filter) parameters.set(filter.name, filter.value);
    const search = parameters.toString();
    return search ? `${base}?${search}` : base;
  };

  /** El buscador del catálogo, compartido por añadir y sustituir. */
  const buscador = (
    campo: "dia" | "item",
    valor: string,
    accion: (ejercicio: { id: string; name: string }) => React.ReactNode,
  ) => (
    <>
      <form
        method="get"
        action={base}
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name={campo} value={valor} />
        {[...editorParams].map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
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
        <ButtonLink variant="ghost" href={editorHref()}>
          Cerrar
        </ButtonLink>
      </form>

      {resultados.length === 0 ? (
        <p className="mt-4 leading-7 text-muted-foreground">
          Ningún ejercicio coincide con esa búsqueda. Prueba con otra palabra
          del nombre.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {resultados.map((ejercicio) => (
            <li
              key={ejercicio.id}
              className={cn(
                cardVariants({ padding: "none" }),
                "grid gap-2 rounded-xl p-3",
              )}
            >
              <p className="text-sm font-medium">{ejercicio.name}</p>
              {accion(ejercicio)}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <Workspace
      title={patient.full_name ?? "Rutinas del paciente"}
      name={actor.fullName}
      actions={
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            variant="default"
            href={
              calendarContext?.returnHref ??
              `/pro/routines/${patientId}/calendar`
            }
          >
            Ver calendario
          </ButtonLink>
          <ButtonLink variant="ghost" href="/pro/routines">
            Volver a pacientes
          </ButtonLink>
        </div>
      }
    >
      {patient.is_active && (
        <AssignmentForm
          patientId={patientId}
          calendarContext={calendarContext}
        />
      )}

      {conditions.length > 0 && (
        <p className="mt-6 rounded-lg bg-warning-soft p-3 text-sm leading-7 text-warning">
          Condiciones activas del paciente:{" "}
          {conditions.map((zona) => labelFor(bodyPartLabels, zona)).join(", ")}.
          El motor ya excluyó lo contraindicado al asignar; si añades un
          ejercicio a mano, revisa que no las agrave.
        </p>
      )}

      {!routines.length && (
        <EmptyState className="my-6" title="Este paciente aún no tiene rutinas">
          Evalúa el perfil con el botón de arriba para asignarle una propuesta
          según las reglas del equipo.
        </EmptyState>
      )}

      <div className="mt-6 grid gap-6">
        {routines.map((routine) => (
          <article
            key={routine.id}
            className={cn(cardVariants({ padding: "lg" }), "min-w-0")}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="brand">
                {routine.kind === "training"
                  ? "Entrenamiento"
                  : "Rehabilitación"}
              </Badge>
              <Badge variant={statusVariants[routine.status]}>
                {statusLabels[routine.status]}
              </Badge>
            </div>
            <h2 className="mt-3 break-words text-2xl font-semibold">
              {routine.name}
            </h2>

            {routine.notes && (
              <details className="mt-4">
                <summary className="min-h-11 cursor-pointer py-3 font-medium">
                  Por qué se asignó y qué se excluyó
                </summary>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  {routine.notes}
                </p>
              </details>
            )}

            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
              Lo que ajustes aquí afecta solo a esta persona. La plantilla de
              origen y las rutinas de los demás pacientes no cambian.
            </p>

            <div className="mt-5 grid gap-6">
              {routine.routine_days.map((day) => (
                <section
                  key={day.id}
                  id={`routine-day-${day.id}`}
                  className={cn(
                    cardVariants({ padding: "sm" }),
                    "scroll-mt-24 sm:p-5",
                  )}
                >
                  <h3 className="text-lg font-semibold">
                    Día {day.day_number}
                    {day.title ? ` · ${day.title}` : ""}
                  </h3>

                  {!day.routine_items.length ? (
                    <p className="mt-4 leading-7 text-muted-foreground">
                      Este día se quedó sin ejercicios. Añádele al menos uno
                      antes de que el paciente lo abra.
                    </p>
                  ) : (
                    <ol className="mt-4 grid gap-4">
                      {day.routine_items.map((item, indice) => {
                        const choques = clashes(item, conditions);
                        return (
                          <li
                            key={item.id}
                            className={cn(
                              cardVariants({ padding: "sm" }),
                              "rounded-xl",
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="grid gap-2">
                                <p className="break-words font-semibold">
                                  {/* El número es el orden de ejecución, no un
                                      adorno: va pegado al nombre. */}
                                  <span className="text-muted-foreground">
                                    {`${indice + 1}.`}
                                  </span>{" "}
                                  {item.exercises ? (
                                    <Link
                                      href={`/exercises/${item.exercises.id}`}
                                      className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                                    >
                                      {item.exercises.name}
                                    </Link>
                                  ) : (
                                    "Ejercicio"
                                  )}
                                  {item.was_modified && (
                                    <Badge variant="brand" className="ml-2">
                                      Ajustado
                                    </Badge>
                                  )}
                                </p>
                                {choques.length > 0 && (
                                  <p className="text-xs text-destructive">
                                    Contraindicado para{" "}
                                    {choques
                                      .map((zona) =>
                                        labelFor(bodyPartLabels, zona),
                                      )
                                      .join(" y ")}
                                    , una condición activa de este paciente.
                                  </p>
                                )}
                              </div>

                              {/*
                                El formulario de quitar va antes que el de la
                                prescripción a propósito:
                                `scripts/verify-routine-items.test.mjs` toma el
                                primer formulario del ítem y comprueba que no
                                arrastra los campos de la prescripción.
                              */}
                              <RemoveRoutineItemButton
                                patientId={patientId}
                                item={item}
                              />
                            </div>

                            <div className="mt-4 border-t border-border pt-4">
                              <RoutineItemForm
                                patientId={patientId}
                                item={item}
                              />
                            </div>

                            <div className="mt-4 border-t border-border pt-4">
                              {itemAbierto === item.id ? (
                                buscador("item", item.id, (ejercicio) => (
                                  <ReplaceRoutineItemButton
                                    patientId={patientId}
                                    itemId={item.id}
                                    exerciseId={ejercicio.id}
                                    exerciseName={ejercicio.name}
                                  />
                                ))
                              ) : (
                                <ButtonLink
                                  href={editorHref({
                                    name: "item",
                                    value: item.id,
                                  })}
                                >
                                  Sustituir por otro ejercicio
                                </ButtonLink>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  <div className="mt-5 border-t border-border pt-5">
                    {diaAbierto === day.id ? (
                      buscador("dia", day.id, (ejercicio) => (
                        <AddRoutineItemButton
                          patientId={patientId}
                          dayId={day.id}
                          exerciseId={ejercicio.id}
                          exerciseName={ejercicio.name}
                        />
                      ))
                    ) : (
                      <ButtonLink
                        href={editorHref({ name: "dia", value: day.id })}
                      >
                        Añadir ejercicios a este día
                      </ButtonLink>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Workspace>
  );
}
