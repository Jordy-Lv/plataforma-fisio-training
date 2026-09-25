import { notFound, redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listExercises } from "@/lib/catalog/queries";
import {
  catalogChips,
  catalogFiltered,
  catalogHref,
  embeddedCatalogPageSize,
} from "@/lib/catalog/embedded-catalog";
import { exerciseFiltersSchema } from "@/lib/catalog/schemas";
import {
  difficultyLabels,
  environmentLabels,
  labelFor,
  type TemplateKind,
} from "@/lib/catalog/vocabulary";
import { assignmentSchema } from "@/lib/routines/assignment";
import {
  createRoutineDraft,
  discardRoutineDraft,
} from "@/lib/routines/assignment-actions";
import {
  assignableKinds,
  assignableTemplates,
  assignmentPatient,
  patientRoutineSummaries,
} from "@/lib/routines/assignment-queries";
import { calendarDateLabel, calendarHref } from "@/lib/routines/calendar";
import { calendarQuerySchema, templateFiltersSchema } from "@/lib/routines/schemas";
import { activeConditions, editableRoutines } from "@/lib/routines/item-queries";
import { Workspace } from "@/components/auth/Workspace";
import { CatalogPicker } from "@/components/catalog/CatalogPicker";
import { AssignmentFlow } from "@/components/routines/AssignmentFlow";
import { AssignmentSteps, PatientBrief } from "@/components/routines/AssignmentSteps";
import {
  AddRoutineItemButton,
  ReplaceRoutineItemButton,
} from "@/components/routines/RoutineItems";
import { RoutineEditor } from "@/components/routines/RoutineEditor";
import { TemplateFilterLinks, type FilterGroup } from "@/components/routines/TemplateChoice";
import { PatientTabs } from "@/components/patients/PatientTabs";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";

const kindLabels: Record<TemplateKind, string> = {
  training: "Entrenamiento",
  physio: "Rehabilitación",
};
const kindNouns: Record<TemplateKind, string> = {
  training: "entrenamiento",
  physio: "rehabilitación",
};

/** Los días de una rutina con menos de tres ejercicios y al menos uno. */
const shortDaysOf = (days: { day_number: number; routine_items: unknown[] }[]) =>
  days
    .filter((day) => day.routine_items.length > 0 && day.routine_items.length < 3)
    .map((day) => day.day_number);

/**
 * La rutina de un paciente, por pasos (ADR-0009, design D4 de
 * `manual-routine-assignment`):
 *
 * | Estado del tipo en curso                           | Paso                  |
 * |----------------------------------------------------|-----------------------|
 * | hay borrador                                       | ② Ajustar y confirmar |
 * | hay activa, sin borrador, sin `?paso=plantilla`    | ③ Rutina activa       |
 * | lo demás                                           | ① Elegir plantilla    |
 *
 * El tipo en curso es la especialidad del profesional; el admin lo elige con
 * `?tipo=`. El orden de los formularios es contrato (`docs/11` §3): en el paso ②
 * el primero con `name="patientId"` es el de confirmar, antes de cualquier
 * formulario de ejercicio.
 */
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

  const query = await searchParams;
  const filters = templateFiltersSchema.parse({
    dias: query.dias,
    nivel: query.nivel,
    entorno: query.entorno,
    tipo: query.tipo,
    paso: query.paso,
  });

  const [kinds, details, conditions, summaries] = await Promise.all([
    assignableKinds(actor, patientId),
    assignmentPatient(patientId),
    activeConditions(patientId),
    patientRoutineSummaries(patientId),
  ]);
  // El profesional trabaja siempre en su tipo, aunque fuerce `?tipo=`.
  const kind: TemplateKind =
    actor.role === "admin" ? (filters.tipo ?? "training") : (kinds.own ?? "training");
  const otherKind: TemplateKind = kind === "training" ? "physio" : "training";
  const canAssign = kinds.allowed.includes(kind);

  const draft = summaries.find((r) => r.kind === kind && r.status === "pending_review");
  const active = summaries.find((r) => r.kind === kind && r.status === "active");
  const step: 1 | 2 | 3 = draft ? 2 : active && !filters.paso ? 3 : 1;
  const shown = step === 2 ? draft : step === 3 ? active : undefined;
  const otherActive = summaries.find((r) => r.kind === otherKind && r.status === "active");
  const previous = summaries.filter((r) => r.kind === kind && r.status === "completed");

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
  const base = `/pro/routines/${patientId}`;
  // Lo que viaja en cada enlace de la pantalla: el contexto del calendario y,
  // para el admin, el tipo elegido.
  const calendarParams: Record<string, string> = calendarContext
    ? { calendarDate: calendarContext.date, calendarView: calendarContext.view }
    : {};
  const screenParams: Record<string, string> = {
    ...calendarParams,
    ...(actor.role === "admin" && filters.tipo ? { tipo: filters.tipo } : {}),
  };
  const href = (extra: Record<string, string | undefined>) =>
    catalogHref(base, { ...screenParams, ...extra }, {});

  // --- paso ①: plantillas ---------------------------------------------------
  const allTemplates =
    step === 1 && canAssign && patient.is_active && details?.onboarding_step === 3
      ? await assignableTemplates(kind, conditions)
      : [];
  const templates = allTemplates.filter(
    (template) =>
      (!filters.dias || template.days_per_week === filters.dias) &&
      (!filters.nivel || template.level === filters.nivel) &&
      (!filters.entorno || template.environment === filters.entorno),
  );
  const current = {
    dias: filters.dias ? String(filters.dias) : undefined,
    nivel: filters.nivel,
    entorno: filters.entorno,
    paso: filters.paso,
  };
  const filterGroup = (
    label: string,
    key: "dias" | "nivel" | "entorno",
    values: string[],
    name: (value: string) => string,
  ): FilterGroup => ({
    label,
    options: [...new Set(values)].sort().map((value) => ({
      label: name(value),
      selected: current[key] === value,
      href: href({ ...current, [key]: current[key] === value ? undefined : value }),
    })),
  });
  const filterGroups = [
    filterGroup(
      "Días por semana",
      "dias",
      allTemplates.map((t) => String(t.days_per_week)),
      (value) => (value === "1" ? "1 día" : `${value} días`),
    ),
    filterGroup(
      "Nivel",
      "nivel",
      allTemplates.flatMap((t) => (t.level ? [t.level] : [])),
      (value) => labelFor(difficultyLabels, value),
    ),
    filterGroup(
      "Entorno",
      "entorno",
      allTemplates.flatMap((t) => (t.environment ? [t.environment] : [])),
      (value) => labelFor(environmentLabels, value),
    ),
  ];
  const filtered = Boolean(filters.dias || filters.nivel || filters.entorno);

  const blocked = !patient.is_active ? (
    <Notice tone="warning">
      Este paciente está dado de baja: no se le puede preparar una rutina.
    </Notice>
  ) : !canAssign ? (
    <Notice tone="warning">
      {`Solo quien atiende a este paciente en ${kindNouns[kind]} o el administrador puede elegir su rutina de ${kindNouns[kind]}.`}
    </Notice>
  ) : details?.onboarding_step !== 3 ? (
    <Notice tone="warning">
      El paciente aún no termina su registro. Sin sus condiciones no se pueden
      quitar los ejercicios contraindicados: elige su rutina cuando lo complete.
    </Notice>
  ) : undefined;

  // --- pasos ② y ③: la rutina y el buscador ---------------------------------
  const [routine] = shown ? await editableRoutines(patientId, shown.id) : [];
  const items = routine?.routine_days.flatMap((day) => day.routine_items) ?? [];
  const diaAbierto =
    typeof query.dia === "string" && routine?.routine_days.some((day) => day.id === query.dia)
      ? query.dia
      : null;
  const itemAbierto =
    typeof query.item === "string" && items.some((item) => item.id === query.item)
      ? query.item
      : null;
  const exerciseFilters = exerciseFiltersSchema.parse({
    q: query.q,
    muscle: query.muscle,
    equipment: query.equipment,
    environment: query.environment,
    page: query.page,
  });
  // El buscador solo aparece enfocado en un día (`?dia=`) o en un ejercicio
  // (`?item=`): son las dos URLs contrato de `test:routines:items`.
  const catalogParams: Record<string, string> = {
    ...screenParams,
    ...(diaAbierto ? { dia: diaAbierto } : itemAbierto ? { item: itemAbierto } : {}),
  };
  const focused = routine && (diaAbierto || itemAbierto);
  const { exercises: results, pages } = focused
    ? await listExercises(exerciseFilters, { pageSize: embeddedCatalogPageSize })
    : { exercises: [], pages: 1 };
  const focusedDay = routine?.routine_days.find((day) => day.id === diaAbierto);
  const focusedItem = items.find((item) => item.id === itemAbierto);

  const catalog = focused ? (
    <CatalogPicker
      action={base}
      filters={exerciseFilters}
      hiddenParams={catalogParams}
      heading={
        focusedItem
          ? `Sustituir «${focusedItem.exercises?.name ?? "ejercicio"}»`
          : `Añadir al día ${focusedDay?.day_number ?? ""}${focusedDay?.title ? ` · ${focusedDay.title}` : ""}`
      }
      description={
        focusedItem
          ? "El resultado que elijas ocupa su sitio y conserva su prescripción."
          : "Los resultados se añaden al final del día."
      }
      closeHref={href({})}
      closeLabel={itemAbierto ? "Dejar de sustituir" : "Salir del día"}
      chips={catalogChips(base, catalogParams, exerciseFilters)}
      clearHref={
        catalogFiltered(exerciseFilters) ? catalogHref(base, catalogParams, {}) : undefined
      }
      exercises={results}
      pages={pages}
      hrefForPage={(page) => catalogHref(base, catalogParams, { ...exerciseFilters, page })}
      emptyHint={
        catalogFiltered(exerciseFilters)
          ? "Ningún ejercicio coincide con esa búsqueda. Prueba con otra palabra del nombre."
          : "Escribe el nombre de un ejercicio para buscarlo en el catálogo."
      }
    >
      {(exercise) =>
        itemAbierto ? (
          <ReplaceRoutineItemButton
            patientId={patientId}
            itemId={itemAbierto}
            exerciseId={exercise.id}
            exerciseName={exercise.name}
          />
        ) : (
          <AddRoutineItemButton
            patientId={patientId}
            dayId={diaAbierto!}
            exerciseId={exercise.id}
            exerciseName={exercise.name}
          />
        )
      }
    </CatalogPicker>
  ) : undefined;

  return (
    <Workspace
      title={patient.full_name ?? "Rutina del paciente"}
      name={actor.fullName}
      actions={
        // Sin precarga (KAN-19): comparten pantalla con los formularios de la
        // rutina y precargados corrían en carrera con el envío en curso.
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            href={calendarContext?.returnHref ?? `/pro/routines/${patientId}/calendar`}
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
      {/* Enlaces, no formularios: no compiten con el marcador `name="patientId"`. */}
      <PatientTabs patientId={patientId} active="routine" />

      <div className="mt-6 grid gap-4">
        <PatientBrief
          goal={details?.goal ?? null}
          level={details?.level ?? null}
          environment={details?.environment ?? null}
          conditions={conditions}
        />

        {actor.role === "admin" && (
          <nav aria-label="Tipo de rutina" className="flex flex-wrap gap-2">
            {(["training", "physio"] as const).map((option) => (
              <ButtonLink
                key={option}
                href={catalogHref(base, { ...calendarParams, tipo: option }, {})}
                prefetch={false}
                variant={option === kind ? "default" : "outline"}
                aria-current={option === kind ? "page" : undefined}
              >
                {kindLabels[option]}
              </ButtonLink>
            ))}
          </nav>
        )}

        <AssignmentSteps step={step} />

        {otherActive && (
          // Frases en una sola cadena: con varias expresiones JSX, React parte
          // el texto con comentarios y las suites no lo leen seguido.
          <p className="text-sm text-muted-foreground">
            {`También tiene una rutina de ${kindNouns[otherKind]} activa, «${otherActive.name}»${
              actor.role === "admin"
                ? `: elige «${kindLabels[otherKind]}» arriba para verla.`
                : `, que prepara su profesional de ${kindNouns[otherKind]}.`
            }`}
          </p>
        )}
      </div>

      {/*
        Montado en el mismo sitio y con la misma `key` en los tres pasos: guarda
        los estados de elegir, confirmar y descartar, y sus acuses sobreviven al
        cambio de paso. Una `key` que dependiera de los datos lo remontaría.
      */}
      <div className="mt-6">
        <AssignmentFlow
          key="assignment-flow"
          step={step}
          patientId={patientId}
          createAction={createRoutineDraft.bind(null, patientId)}
          discardAction={discardRoutineDraft.bind(null, patientId)}
          templates={templates}
          filters={
            <TemplateFilterLinks
              groups={filterGroups}
              clearHref={filtered ? href({ paso: filters.paso }) : undefined}
            />
          }
          blocked={blocked}
          empty={
            filtered ? (
              <EmptyState
                title="Ninguna plantilla coincide con estos filtros"
                action={
                  <ButtonLink href={href({ paso: filters.paso })} prefetch={false}>
                    Quitar los filtros
                  </ButtonLink>
                }
              >
                Quita algún filtro para ver más plantillas de {kindNouns[kind]}.
              </EmptyState>
            ) : (
              <EmptyState title={`No hay plantillas de ${kindNouns[kind]} activas`}>
                Las plantillas las crea y activa el administrador en Plantillas.
                Cuando haya alguna activa de {kindNouns[kind]}, podrás elegirla aquí.
              </EmptyState>
            )
          }
          draft={
            step === 2 && draft && routine
              ? {
                  id: draft.id,
                  name: draft.name,
                  replacesActive: Boolean(active),
                  shortDays: shortDaysOf(routine.routine_days),
                }
              : undefined
          }
          calendarContext={calendarContext}
        />
      </div>

      {routine && (
        <div className="mt-6">
          <RoutineEditor
            routine={routine}
            patientId={patientId}
            conditions={conditions}
            base={base}
            calendarParams={screenParams}
            diaAbierto={diaAbierto}
            itemAbierto={itemAbierto}
            catalog={catalog}
            footer={
              step === 3 && canAssign ? (
                <ButtonLink href={href({ paso: "plantilla" })} prefetch={false}>
                  Cambiar de plantilla
                </ButtonLink>
              ) : undefined
            }
          />
        </div>
      )}

      {step === 1 && active && (
        <p className="mt-4">
          <ButtonLink variant="ghost" href={href({})} prefetch={false}>
            Volver a la rutina activa
          </ButtonLink>
        </p>
      )}

      {previous.length > 0 && (
        <details className="mt-6">
          <summary className="min-h-11 cursor-pointer py-3 font-medium">
            {`Rutinas anteriores de ${kindNouns[kind]} (${previous.length})`}
          </summary>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            {previous.map((routine) => (
              <li key={routine.id}>
                <span className="font-medium text-foreground">{routine.name}</span>
                {routine.starts_on &&
                  ` · desde el ${calendarDateLabel(routine.starts_on, { day: "numeric", month: "long", year: "numeric" })}`}
                {routine.ends_on &&
                  ` hasta el ${calendarDateLabel(routine.ends_on, { day: "numeric", month: "long", year: "numeric" })}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Workspace>
  );
}
