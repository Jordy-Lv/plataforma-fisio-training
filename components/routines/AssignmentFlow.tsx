"use client";

import { useActionState, type ReactNode } from "react";
import { confirmRoutineDraft } from "@/lib/routines/assignment-actions";
import type { AssignableTemplate } from "@/lib/routines/assignment-queries";
import type { RoutineActionState } from "@/lib/routines/schemas";
import { FormMessage } from "@/components/auth/FormParts";
import {
  CalendarNote,
  RoutineAssignedNotice,
  RoutineDraftBar,
  type CalendarContext,
} from "@/components/routines/RoutineDraftBar";
import { TemplateChoice } from "@/components/routines/TemplateChoice";

type BoundAction = (state: RoutineActionState, form: FormData) => Promise<RoutineActionState>;

/**
 * Los tres formularios de la asignación —elegir, confirmar y descartar— y sus
 * acuses. Es **un solo componente montado en el mismo sitio en los tres
 * pasos** (la página le da una `key` fija): al terminar una acción el paso
 * cambia y la tarjeta o la barra que envió desaparecen, pero el estado de su
 * `useActionState` sigue aquí y el acuse se ve en el paso siguiente
 * (`docs/11` §5, «Mostrar un acuse que sobreviva a la revalidación»). Vale
 * también sin JavaScript: el servidor encaja el resultado del envío con este
 * mismo componente.
 *
 * Las acciones de elegir y descartar llegan ya ligadas al paciente desde la
 * página (`.bind`); confirmar lleva el paciente como campo oculto porque su
 * formulario es el marcador `name="patientId"` de las suites.
 */
export function AssignmentFlow({
  step,
  patientId,
  createAction,
  discardAction,
  templates,
  filters,
  blocked,
  empty,
  draft,
  calendarContext,
}: {
  step: 1 | 2 | 3;
  patientId: string;
  createAction: BoundAction;
  discardAction: BoundAction;
  /** Paso ①: las plantillas ya filtradas. */
  templates: AssignableTemplate[];
  /** Paso ①: los chips de filtro, pintados en el servidor (son enlaces). */
  filters?: ReactNode;
  /** Paso ①: por qué no se puede elegir (perfil sin terminar, sin acceso…). */
  blocked?: ReactNode;
  /** Paso ①: el estado vacío cuando no hay plantillas que mostrar. */
  empty?: ReactNode;
  /** Paso ②: el borrador abierto. */
  draft?: {
    id: string;
    name: string;
    replacesActive: boolean;
    shortDays: number[];
  };
  calendarContext?: CalendarContext;
}) {
  const [createState, create] = useActionState(createAction, {});
  const [confirmState, confirm] = useActionState(confirmRoutineDraft, {});
  const [discardState, discard] = useActionState(discardAction, {});
  // Solo el acuse de la última acción: los otros dos son de pasos anteriores.
  const latest = Math.max(createState.at ?? 0, confirmState.at ?? 0, discardState.at ?? 0);
  const fresh = (state: RoutineActionState) => (state.at === latest ? state : {});

  // Paso ③: el acuse de confirmar, o el de descartar un borrador que convivía
  // con la rutina activa.
  if (step === 3)
    return fresh(confirmState).success ? (
      <RoutineAssignedNotice state={confirmState} calendarContext={calendarContext} />
    ) : (
      <FormMessage state={fresh(discardState)} />
    );

  if (step === 2 && draft)
    return (
      <div className="grid gap-3">
        {/* «Borrador creado», o por qué el segundo envío no creó otro. */}
        <FormMessage state={fresh(createState)} />
        <RoutineDraftBar
          patientId={patientId}
          routineId={draft.id}
          routineName={draft.name}
          replacesActive={draft.replacesActive}
          shortDays={draft.shortDays}
          calendarContext={calendarContext}
          confirmAction={confirm}
          confirmState={fresh(confirmState)}
          discardAction={discard}
          discardState={fresh(discardState)}
        />
      </div>
    );

  return (
    <section aria-labelledby="choose-template" className="grid gap-4">
      <h2 id="choose-template" className="text-xl font-semibold">
        Elige una plantilla
      </h2>
      <FormMessage state={fresh(discardState)} />
      {calendarContext && (
        <CalendarNote
          context={calendarContext}
          after="Elige la plantilla, revisa el borrador y confírmalo; después vuelve al calendario para programarla."
        />
      )}
      {blocked ?? (
        <>
          <p className="max-w-2xl leading-7 text-muted-foreground">
            Se copia como borrador: el paciente no lo ve hasta que lo confirmes,
            y los ejercicios contraindicados por sus condiciones se quitan al
            crearlo.
          </p>
          {filters}
          <FormMessage state={fresh(createState)} />
          {templates.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">
              {templates.map((template) => (
                <TemplateChoice key={template.id} template={template} action={create} />
              ))}
            </ul>
          ) : (
            empty
          )}
        </>
      )}
    </section>
  );
}
