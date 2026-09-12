import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cn } from "cn";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { listExercises } from "@/lib/catalog/queries";
import {
  catalogChips,
  catalogFiltered,
  catalogHref,
  embeddedCatalogPageSize,
} from "@/lib/catalog/embedded-catalog";
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
import { CatalogPicker } from "@/components/catalog/CatalogPicker";
import { AssignmentForm } from "@/components/routines/AssignmentForm";
import {
  AddRoutineItemButton,
  AddRoutineItemDayPicker,
  RemoveRoutineItemButton,
  ReplaceRoutineItemButton,
  RoutineItemForm,
} from "@/components/routines/RoutineItems";
import { PatientTabs } from "@/components/patients/PatientTabs";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

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

  // El buscador del catálogo es único y permanente. Con `?dia=<dayId>` se
  // enfoca en un día —para añadir— y con `?item=<itemId>` sobre un ejercicio
  // —para sustituirlo—: son las dos URLs que `verify-routine-items` abre
  // literalmente (ver `docs/11`). Sin ninguna, cada resultado elige el día.
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
  const filtros = exerciseFiltersSchema.parse({
    q: query.q,
    muscle: query.muscle,
    equipment: query.equipment,
    environment: query.environment,
    page: query.page,
  });
  const base = `/pro/routines/${patientId}`;
  const calendarParams: Record<string, string> = calendarContext
    ? { calendarDate: calendarContext.date, calendarView: calendarContext.view }
    : {};
  const extra: Record<string, string> = {
    ...calendarParams,
    ...(diaAbierto
      ? { dia: diaAbierto }
      : itemAbierto
        ? { item: itemAbierto }
        : {}),
  };
  const mostrarCatalogo =
    Boolean(diaAbierto || itemAbierto) || catalogFiltered(filtros);
  const { exercises: resultados, pages: paginasCatalogo } = mostrarCatalogo
    ? await listExercises(filtros, { pageSize: embeddedCatalogPageSize })
    : { exercises: [], pages: 1 };

  /** Los días de todas las rutinas del paciente, para el desplegable del buscador. */
  const diasDisponibles = routines.flatMap((routine) =>
    routine.routine_days.map((day) => ({
      id: day.id,
      label: `${routine.name} · Día ${day.day_number}${
        day.title ? ` · ${day.title}` : ""
      }`,
    })),
  );
  const diaEnfocado = diasDisponibles.find((day) => day.id === diaAbierto);
  const itemEnfocado = items.find((item) => item.id === itemAbierto);

  return (
    <Workspace
      title={patient.full_name ?? "Rutinas del paciente"}
      name={actor.fullName}
      actions={
        // Sin precarga (KAN-19): comparten pantalla con los formularios de
        // ajuste de la rutina y precargados corrían en carrera con el envío
        // en curso, abortándolo a medio guardar.
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            href={
              calendarContext?.returnHref ??
              `/pro/routines/${patientId}/calendar`
            }
            prefetch={false}
          >
            Ver calendario
          </ButtonLink>
          <ButtonLink variant="ghost" href="/pro/routines" prefetch={false}>
            Volver a pacientes
          </ButtonLink>
        </div>
      }
    >
      {/*
        Las pestañas van antes del formulario de asignación, que sigue siendo el
        primero de la pantalla con `name="patientId"` —el marcador de
        `verify-routine-assignment`—: son enlaces, no un `<form>`.
      */}
      <PatientTabs patientId={patientId} active="routine" />

      {patient.is_active && (
        <AssignmentForm
          patientId={patientId}
          calendarContext={calendarContext}
          replacesActive={routines.some(
            (routine) => routine.status === "active",
          )}
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

      {Boolean(routines.length) && (
        <CatalogPicker
          action={base}
          filters={filtros}
          hiddenParams={extra}
          heading={
            itemEnfocado
              ? `Sustituir «${itemEnfocado.exercises?.name ?? "ejercicio"}»`
              : diaEnfocado
                ? `Añadir a ${diaEnfocado.label}`
                : "Añadir un ejercicio del catálogo"
          }
          description={
            itemEnfocado
              ? "El resultado que elijas ocupa su sitio y conserva su prescripción."
              : diaEnfocado
                ? "Los resultados se añaden al final del día enfocado."
                : "Busca un ejercicio y elige a qué día de la rutina lo añades."
          }
          closeHref={
            diaAbierto || itemAbierto
              ? catalogHref(base, calendarParams, {})
              : undefined
          }
          closeLabel={itemAbierto ? "Dejar de sustituir" : "Salir del día"}
          chips={catalogChips(base, extra, filtros)}
          clearHref={
            catalogFiltered(filtros) ? catalogHref(base, extra, {}) : undefined
          }
          exercises={resultados}
          pages={paginasCatalogo}
          hrefForPage={(page) => catalogHref(base, extra, { ...filtros, page })}
          emptyHint={
            catalogFiltered(filtros)
              ? "Ningún ejercicio coincide con esa búsqueda. Prueba con otra palabra del nombre."
              : "Escribe el nombre de un ejercicio para buscarlo en el catálogo."
          }
        >
          {(ejercicio) =>
            itemAbierto ? (
              <ReplaceRoutineItemButton
                patientId={patientId}
                itemId={itemAbierto}
                exerciseId={ejercicio.id}
                exerciseName={ejercicio.name}
              />
            ) : diaAbierto ? (
              <AddRoutineItemButton
                patientId={patientId}
                dayId={diaAbierto}
                exerciseId={ejercicio.id}
                exerciseName={ejercicio.name}
              />
            ) : (
              <AddRoutineItemDayPicker
                patientId={patientId}
                days={diasDisponibles}
                exerciseId={ejercicio.id}
                exerciseName={ejercicio.name}
              />
            )
          }
        </CatalogPicker>
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
                        // La prescripción actual en una línea, para leer el día
                        // sin abrir cada ejercicio.
                        const resumen =
                          [
                            item.sets != null && item.reps != null
                              ? `${item.sets} × ${item.reps}`
                              : item.sets != null
                                ? `${item.sets} series`
                                : item.reps != null
                                  ? `${item.reps} repeticiones`
                                  : null,
                            item.target_weight != null
                              ? `${item.target_weight} kg`
                              : null,
                            item.rest_seconds != null
                              ? `${item.rest_seconds} s de descanso`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Sin prescripción todavía";
                        return (
                          <li
                            key={item.id}
                            className={cn(
                              cardVariants({ padding: "sm" }),
                              "rounded-xl",
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="grid gap-1">
                                <p className="break-words font-semibold">
                                  {/* El número es el orden de ejecución, no un
                                      adorno: va pegado al nombre. */}
                                  <span className="text-muted-foreground">
                                    {`${indice + 1}.`}
                                  </span>{" "}
                                  {item.exercises ? (
                                    <Link
                                      href={`/exercises/${item.exercises.id}`}
                                      prefetch={false}
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
                                <p className="text-sm text-muted-foreground">
                                  {resumen}
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
                                arrastra los campos de la prescripción. Queda
                                fuera del `<details>` para no mover ese orden.
                              */}
                              <RemoveRoutineItemButton
                                patientId={patientId}
                                item={item}
                              />
                            </div>

                            {/*
                              La prescripción se pliega: un día de cinco
                              ejercicios pasa de cinco formularios abiertos a
                              cinco líneas. Cerrado, el `<details>` sigue
                              emitiendo su formulario en el HTML del servidor
                              —`verify-routine-items` lo encuentra igual—; se abre
                              cuando se enfoca este ítem para sustituirlo. La
                              sustitución se hace en el buscador permanente de
                              arriba, vía `?item=`.
                            */}
                            <details
                              className="mt-3 rounded-xl border border-border px-4"
                              open={itemAbierto === item.id || undefined}
                            >
                              <summary className="flex min-h-11 cursor-pointer items-center py-3 font-semibold text-brand">
                                Ajustar la prescripción o sustituir
                              </summary>
                              <div className="grid gap-4 pb-4">
                                <RoutineItemForm
                                  patientId={patientId}
                                  item={item}
                                />
                                <div className="border-t border-border pt-4">
                                  <ButtonLink
                                    href={`${catalogHref(base, { ...calendarParams, item: item.id }, {})}#catalogo-buscador`}
                                    prefetch={false}
                                    variant={
                                      itemAbierto === item.id
                                        ? "outline"
                                        : "default"
                                    }
                                  >
                                    {itemAbierto === item.id
                                      ? "Buscando un recambio arriba"
                                      : "Sustituir por otro ejercicio"}
                                  </ButtonLink>
                                </div>
                              </div>
                            </details>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  <div className="mt-5 border-t border-border pt-5">
                    {/* El buscador vive arriba, único y permanente; este enlace
                        solo lo enfoca en este día (`?dia=`). */}
                    <ButtonLink
                      href={`${catalogHref(base, { ...calendarParams, dia: day.id }, {})}#catalogo-buscador`}
                      prefetch={false}
                      variant={diaAbierto === day.id ? "outline" : "default"}
                    >
                      {diaAbierto === day.id
                        ? "Buscando para este día"
                        : "Añadir ejercicios a este día"}
                    </ButtonLink>
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
