"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  cancelScheduleSchema,
  scheduleRoutineSchema,
  type RoutineActionState,
} from "@/lib/routines/schemas";

function refreshCalendar(patientId: string) {
  revalidatePath("/routine/calendar");
  revalidatePath(`/pro/routines/${patientId}/calendar`);
}

export async function scheduleRoutineDay(
  _previous: RoutineActionState,
  form: FormData,
): Promise<RoutineActionState> {
  const parsed = scheduleRoutineSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { patientId, dayId, scheduledOn } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("routine_schedules").insert({
    patient_id: patientId,
    routine_day_id: dayId,
    scheduled_on: scheduledOn,
  });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "Este día de rutina ya está programado para esa fecha. Selecciona otra fecha."
          : `No se pudo programar la rutina: ${error.message}`,
    };
  refreshCalendar(patientId);
  return {
    success: "Sesión programada. El paciente ya puede verla en su calendario.",
  };
}

export async function cancelRoutineSchedule(
  _previous: RoutineActionState,
  form: FormData,
): Promise<RoutineActionState> {
  const parsed = cancelScheduleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_schedules")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", parsed.data.scheduleId)
    .eq("patient_id", parsed.data.patientId)
    .is("cancelled_at", null)
    .select("id")
    .maybeSingle();
  if (error)
    return { error: `No se pudo cancelar la programación: ${error.message}` };
  if (!data)
    return {
      error: "La programación ya se canceló o no tienes acceso a ella.",
    };
  refreshCalendar(parsed.data.patientId);
  return { success: "Programación cancelada. Su historial se conserva." };
}
