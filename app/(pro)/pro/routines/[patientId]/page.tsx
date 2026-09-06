import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { listExercises } from "@/lib/catalog/queries";
import { exerciseFiltersSchema } from "@/lib/catalog/schemas";
import { labelFor } from "@/lib/catalog/vocabulary";
import { assignmentSchema } from "@/lib/routines/assignment";
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
import { ButtonLink } from "@/components/ui/ButtonLink";

const statusLabels = {
  active: "Activa",
  pending_review: "Pendiente de revisión",
  completed: "Finalizada",
  archived: "Archivada",
};

const fieldClass =
  "min-h-11 w-full rounded-lg border border-input bg-surface px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
        <div className="min-w-60 flex-1 space-y-2">
          <label
            htmlFor={`q-${valor}`}
            className="block text-sm font-semibold"
          >
            Buscar un ejercicio del catálogo
          </label>
          <input
            className={fieldClass}
            id={`q-${valor}`}
            name="q"
            type="search"
            defaultValue={filtros.q ?? ""}
            maxLength={80}
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Sentadilla, plancha, remo…"
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Buscar
        </button>
        <Link
          href={base}
          className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        >
          Cerrar
        </Link>
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
              className="grid gap-2 rounded-xl border border-border p-3"
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
    >
      <Link
        href="/pro/routines"
        className="inline-flex min-h-11 items-center font-medium text-brand"
      >
        Volver a pacientes
      </Link>

      {patient.is_active && <AssignmentForm patientId={patientId} />}

      {conditions.length > 0 && (
        <p className="mt-6 rounded-lg bg-muted p-3 text-sm leading-7">
          Condiciones activas del paciente:{" "}
          {conditions.map((zona) => labelFor(bodyPartLabels, zona)).join(", ")}.
          El motor ya excluyó lo contraindicado al asignar; si añades un
          ejercicio a mano, revisa que no las agrave.
        </p>
      )}

      {!routines.length && (
        <p className="my-6 rounded-2xl border border-dashed border-border p-6 leading-7 text-muted-foreground">
          Aún no hay rutinas. Evalúa el perfil para asignar una propuesta según
          las reglas del equipo.
        </p>
      )}

      <div className="mt-6 grid gap-6">
        {routines.map((routine) => (
          <article
            key={routine.id}
            className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6"
          >
            <p className="text-sm font-medium text-brand">
              {routine.kind === "training" ? "Entrenamiento" : "Rehabilitación"}{" "}
              · {statusLabels[routine.status]}
            </p>
            <h2 className="mt-2 break-words text-2xl font-semibold">
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
                <section key={day.id} className="rounded-2xl border border-border p-4 sm:p-5">
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
                            className="rounded-xl border border-border p-4"
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
                                    <span className="ml-2 inline-flex items-center rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
                                      Ajustado
                                    </span>
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
                                  href={`${base}?item=${item.id}`}
                                  
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
                      <ButtonLink href={`${base}?dia=${day.id}`} >
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
