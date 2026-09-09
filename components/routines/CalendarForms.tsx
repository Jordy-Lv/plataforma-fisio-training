"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/auth/FormParts";
import { useFormValidation } from "@/lib/auth/use-form-validation";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  calendarAssignmentHref,
  isSchedulingDate,
  schedulingRange,
  type CalendarView,
} from "@/lib/routines/calendar";
import {
  cancelRoutineSchedule,
  scheduleRoutineDay,
} from "@/lib/routines/calendar-actions";
import {
  calendarDateSchema,
  scheduleRoutineSchema,
} from "@/lib/routines/schemas";

export function CalendarScheduleForm({
  patientId,
  days,
  date,
  today,
  view,
}: {
  patientId: string;
  days: { id: string; label: string }[];
  date: string;
  today: string;
  view: CalendarView;
}) {
  const [state, action, pending] = useActionState(scheduleRoutineDay, {});
  const validation = useFormValidation(scheduleRoutineSchema);
  const initialDate = isSchedulingDate(date, today) ? date : today;
  const [scheduledOn, setScheduledOn] = useState(initialDate);
  const { min, max } = schedulingRange(today);
  const assignmentDate =
    calendarDateSchema.safeParse(scheduledOn).success &&
    isSchedulingDate(scheduledOn, today)
      ? scheduledOn
      : initialDate;
  return (
    <form
      action={action}
      onSubmit={validation.onSubmit}
      className="grid gap-4"
      data-calendar-schedule
    >
      <input type="hidden" name="patientId" value={patientId} />
      <h2 className="text-lg font-semibold">Programar una sesión</h2>
      <p className="text-sm text-muted-foreground">
        Elige qué día de su rutina realizará el paciente y en qué fecha.
      </p>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Día de rutina">
          <Select name="dayId" required defaultValue="">
            <option value="" disabled>
              Selecciona un día de rutina
            </option>
            {days.map((day) => (
              <option key={day.id} value={day.id}>
                {day.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha">
          <Input
            name="scheduledOn"
            type="date"
            required
            min={min}
            max={max}
            value={scheduledOn}
            onChange={(event) => setScheduledOn(event.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Programando…" : "Programar sesión"}
      </Button>
      <ButtonLink
        variant="outline"
        className="w-full sm:w-fit"
        href={calendarAssignmentHref(patientId, assignmentDate, view)}
      >
        Crear o asignar otra rutina
      </ButtonLink>
      <FormMessage
        state={{ ...state, error: validation.error ?? state.error }}
      />
    </form>
  );
}

export function CancelCalendarSchedule({
  patientId,
  scheduleId,
}: {
  patientId: string;
  scheduleId: string;
}) {
  const [state, action, pending] = useActionState(cancelRoutineSchedule, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Cancelando…" : "Cancelar programación"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
