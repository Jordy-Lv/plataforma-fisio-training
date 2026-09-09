import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  mergeCalendarEvents,
  type CalendarRecord,
  type CalendarSession,
} from "@/lib/routines/calendar";

type DaySummary = {
  title: string | null;
  day_number: number;
  routines: { name: string; kind: "training" | "physio" } | null;
};
function record(
  id: string,
  dayId: string,
  date: string,
  day: DaySummary | null,
): CalendarRecord {
  return {
    id,
    dayId,
    date,
    title: day?.title || `Día ${day?.day_number ?? "de rutina"}`,
    routineName: day?.routines?.name ?? "Rutina",
    kind: day?.routines?.kind ?? "training",
  };
}

export async function patientCalendar(
  patientId: string,
  start: string,
  end: string,
  today: string,
) {
  const supabase = await createClient();
  // Paginación dentro del intervalo: el límite de la API no recorta el historial.
  async function schedules() {
    const rows: CalendarRecord[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase
        .from("routine_schedules")
        .select(
          "id, routine_day_id, scheduled_on, routine_days(title, day_number, routines(name, kind))",
        )
        .eq("patient_id", patientId)
        .is("cancelled_at", null)
        .gte("scheduled_on", start)
        .lte("scheduled_on", end)
        .order("id")
        .range(offset, offset + 499);
      if (error)
        throw new Error(`No se pudo cargar la programación: ${error.message}`);
      rows.push(
        ...data.map((row) =>
          record(
            row.id,
            row.routine_day_id,
            row.scheduled_on,
            row.routine_days,
          ),
        ),
      );
      if (data.length < 500) return rows;
    }
  }
  async function sessions() {
    const rows: (CalendarRecord & { status: CalendarSession["status"] })[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "id, routine_day_id, performed_on, status, routine_days(title, day_number, routines(name, kind))",
        )
        .eq("patient_id", patientId)
        .gte("performed_on", start)
        .lte("performed_on", end)
        .order("id")
        .range(offset, offset + 499);
      if (error)
        throw new Error(
          `No se pudo cargar el historial del calendario: ${error.message}`,
        );
      rows.push(
        ...data.map((row) => ({
          ...record(
            row.id,
            row.routine_day_id,
            row.performed_on,
            row.routine_days,
          ),
          status: row.status,
        })),
      );
      if (data.length < 500) return rows;
    }
  }
  const [planned, performed] = await Promise.all([schedules(), sessions()]);
  return mergeCalendarEvents(planned, performed, today);
}

export async function schedulableDays(patientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .select("name, routine_days(id, title, day_number)")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .order("created_at");
  if (error)
    throw new Error(
      `No se pudieron consultar los días de rutina: ${error.message}`,
    );
  return data.flatMap((routine) =>
    [...routine.routine_days]
      .sort((a, b) => a.day_number - b.day_number)
      .map((day) => ({
        id: day.id,
        label: `${routine.name} · ${day.title || `Día ${day.day_number}`}`,
      })),
  );
}

export async function calendarRoutineDay(dayId: string, patientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_days")
    .select(
      `id, title, day_number, routines!inner(name, kind, status),
      routine_items(id, position, sets, reps, target_weight, rest_seconds, notes, exercises(name, description))`,
    )
    .eq("id", dayId)
    .eq("routines.patient_id", patientId)
    .maybeSingle();
  if (error)
    throw new Error(`No se pudo consultar el día de rutina: ${error.message}`);
  return data;
}
