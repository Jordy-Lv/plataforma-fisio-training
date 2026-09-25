import { cn } from "cn";
import { calendarDateLabel } from "@/lib/routines/calendar";
import type { RoutineActionState } from "@/lib/routines/schemas";
import { FormMessage } from "@/components/auth/FormParts";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type CalendarContext = { date: string; view: string; returnHref: string };

const joinDays = (days: number[]) =>
  days.length > 1 ? `${days.slice(0, -1).join(", ")} y ${days.at(-1)}` : String(days[0]);

/** «Seleccionaste el …»: la fecha del calendario desde la que se llegó. */
export function CalendarNote({ context, after }: { context: CalendarContext; after: string }) {
  return (
    <p className="text-sm font-medium text-brand">
      Seleccionaste el{" "}
      {calendarDateLabel(context.date, { day: "numeric", month: "long", year: "numeric" })}.{" "}
      {after}
    </p>
  );
}

/**
 * Confirmar y descartar el borrador. Sustituye a `AssignmentForm`.
 *
 * El formulario de confirmar va **antes que cualquier formulario de
 * ejercicio**: es el primero con `name="patientId"` cuando hay borrador, el
 * marcador de `test:routines` y `test:smoke`, y `test:calendar` lo busca por
 * `id="assign-routine"` y lee dentro el enlace de vuelta al calendario
 * (`docs/11` §3). El de descartar lleva el paciente ligado con `.bind`, así
 * que no cumple ese marcador.
 *
 * Los estados de las acciones los guarda `AssignmentFlow`, que sigue montado
 * después de confirmar: así «Rutina asignada…» se ve en el paso siguiente.
 */
export function RoutineDraftBar({
  patientId,
  routineId,
  routineName,
  replacesActive,
  shortDays,
  calendarContext,
  confirmAction,
  confirmState,
  discardAction,
  discardState,
}: {
  patientId: string;
  routineId: string;
  routineName: string;
  replacesActive: boolean;
  shortDays: number[];
  calendarContext?: CalendarContext;
  confirmAction: (form: FormData) => void;
  confirmState: RoutineActionState;
  discardAction: (form: FormData) => void;
  discardState: RoutineActionState;
}) {
  const warnings = [
    replacesActive
      ? "Este paciente ya tiene una rutina activa de este tipo: al confirmar se cierra y conserva su historial de sesiones."
      : null,
    shortDays.length
      ? `${shortDays.length > 1 ? "Los días" : "El día"} ${joinDays(shortDays)} ${shortDays.length > 1 ? "tienen" : "tiene"} menos de tres ejercicios.`
      : null,
  ].filter((text): text is string => Boolean(text));

  return (
    <div className="grid gap-3">
      <form
        action={confirmAction}
        id="assign-routine"
        className={cn(cardVariants({ padding: "lg" }), "grid scroll-mt-24 gap-3")}
      >
        <input type="hidden" name="patientId" value={patientId} />
        <input type="hidden" name="routineId" value={routineId} />
        <h2 className="text-xl font-semibold">Revisa el borrador y confírmalo</h2>
        <p className="max-w-2xl leading-7 text-muted-foreground">
          «{routineName}» es un borrador: el paciente no lo ve. Ajusta los
          ejercicios de abajo y confírmalo cuando esté listo; solo entonces
          aparece en su rutina.
        </p>
        {calendarContext && (
          <CalendarNote
            context={calendarContext}
            after="Después de confirmar la rutina, vuelve al calendario para programar sus ejercicios en esa fecha."
          />
        )}
        {warnings.map((text) => (
          <p key={text} className="text-sm text-warning">
            {text}
          </p>
        ))}
        <FormMessage state={confirmState} />
        {warnings.length ? (
          <ConfirmSubmit
            className="justify-self-start"
            pendingLabel="Asignando…"
            tone="default"
            title="¿Confirmar y asignar la rutina?"
            description={warnings.join(" ")}
            confirmLabel="Confirmar y asignar"
          >
            Confirmar y asignar
          </ConfirmSubmit>
        ) : (
          <SubmitButton className="justify-self-start" pendingLabel="Asignando…">
            Confirmar y asignar
          </SubmitButton>
        )}
        {calendarContext && (
          // Sin precarga (KAN-19): vive dentro de este mismo <form> y
          // precargada corría en carrera con el envío en curso.
          <ButtonLink
            variant="outline"
            className="justify-self-start"
            href={calendarContext.returnHref}
            prefetch={false}
          >
            Volver al calendario para programar
          </ButtonLink>
        )}
      </form>

      <form action={discardAction} className="grid gap-2">
        <input type="hidden" name="routineId" value={routineId} />
        <FormMessage state={discardState} />
        <ConfirmSubmit
          variant="outline"
          className="justify-self-start"
          pendingLabel="Descartando…"
          title="¿Descartar el borrador?"
          description="Se pierden los ajustes de este borrador. El paciente nunca lo vio y su rutina activa, si la tiene, no cambia."
          confirmLabel="Descartar"
        >
          Descartar y elegir otra
        </ConfirmSubmit>
      </form>
    </div>
  );
}

/**
 * El acuse de confirmar, ya en el paso de la rutina activa. Conserva
 * `id="assign-routine"` y el enlace de vuelta al calendario dentro, que es lo
 * que lee `test:calendar` en la respuesta del envío.
 */
export function RoutineAssignedNotice({
  state,
  calendarContext,
}: {
  state: RoutineActionState;
  calendarContext?: CalendarContext;
}) {
  return (
    <section id="assign-routine" className="grid scroll-mt-24 gap-3">
      <FormMessage state={state} />
      {calendarContext && (
        <ButtonLink
          variant="outline"
          className="justify-self-start"
          href={calendarContext.returnHref}
          prefetch={false}
        >
          Volver al calendario para programar
        </ButtonLink>
      )}
    </section>
  );
}
