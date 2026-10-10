import "server-only";

import { addDays, startOfWeek, weeklyGoal } from "@/lib/routines/calendar";
import type { CalendarEvent } from "@/lib/routines/calendar";
import { patientCalendar } from "@/lib/routines/calendar-queries";
import { createClient } from "@/lib/supabase/server";

/** Cuántos días hacia delante se busca la próxima sesión en un día de descanso. */
const NEXT_SESSION_HORIZON_DAYS = 14;

/** Cuántas sesiones próximas lista la portada, debajo de la semana. */
const UPCOMING_LIMIT = 3;

/** Cuántos ejercicios de hoy se adelantan en la tarjeta de hoy. */
const EXERCISE_PREVIEW_LIMIT = 4;

export type AgendaDay = Pick<
  CalendarEvent,
  "dayId" | "date" | "title" | "routineName" | "kind"
>;

/** Un ejercicio de hoy, como se adelanta en la portada: nombre y volumen. */
export type ExercisePreview = {
  name: string;
  sets: number | null;
  reps: number | null;
};

export type PatientAgenda = {
  /**
   * Lo programado para hoy que aún no se terminó; `null` si no hay nada
   * pendiente. `exercises` trae solo los primeros, en orden; `exerciseCount`
   * es el total del día.
   */
  today:
    | (AgendaDay & { exerciseCount: number; exercises: ExercisePreview[] })
    | null;
  /** Hoy había algo programado y ya está terminado. */
  isTodayDone: boolean;
  /** La próxima sesión programada después de hoy, en las dos semanas siguientes. */
  next: AgendaDay | null;
  /** Las próximas sesiones programadas después de hoy, como mucho tres. */
  upcoming: AgendaDay[];
  /** Días de esta semana y de la siguiente con sesión programada (`YYYY-MM-DD`). */
  plannedDates: string[];
  /** Meta de la semana: sesiones programadas y cuántas se completaron. */
  goal: { total: number; completed: number; percent: number };
};

function toDay(event: CalendarEvent): AgendaDay {
  return {
    dayId: event.dayId,
    date: event.date,
    title: event.title,
    routineName: event.routineName,
    kind: event.kind,
  };
}

/**
 * La agenda que la portada del paciente necesita: qué le toca hoy, su meta de
 * la semana y la próxima sesión. Sale del mismo calendario que
 * `/routine/calendar` (`patientCalendar`), leído una sola vez desde el lunes de
 * esta semana hasta dos semanas después de hoy, más los ejercicios del día de
 * hoy cuando lo hay (una sola consulta: el conteo sale de la misma lista).
 */
export async function patientAgenda(
  patientId: string,
  today: string,
): Promise<PatientAgenda> {
  const weekStart = startOfWeek(today);
  // Esta semana y la siguiente: la cabecera de escritorio enseña catorce días.
  const plannedEnd = addDays(weekStart, 13);
  const events = await patientCalendar(
    patientId,
    weekStart,
    addDays(today, NEXT_SESSION_HORIZON_DAYS),
    today,
  );

  const isDone = (event: CalendarEvent) =>
    event.sessions.some((session) => session.status === "completed");
  const todays = events.filter((event) => event.date === today);
  const pending = todays.find((event) => !isDone(event)) ?? null;
  const upcoming = events
    .filter((event) => event.date > today && event.scheduleId)
    .slice(0, UPCOMING_LIMIT);
  const next = upcoming[0] ?? null;

  let exercises: ExercisePreview[] = [];
  let exerciseCount = 0;
  if (pending) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("routine_items")
      .select("position, sets, reps, exercises(name)")
      .eq("routine_day_id", pending.dayId)
      .order("position");
    if (error)
      throw new Error(`No se pudieron consultar los ejercicios de hoy: ${error.message}`);
    exerciseCount = data.length;
    exercises = data.slice(0, EXERCISE_PREVIEW_LIMIT).map((item) => ({
      name: item.exercises?.name ?? "Ejercicio",
      sets: item.sets,
      reps: item.reps,
    }));
  }

  const goal = weeklyGoal(events, today);
  return {
    today: pending ? { ...toDay(pending), exerciseCount, exercises } : null,
    isTodayDone: todays.length > 0 && !pending,
    next: next ? toDay(next) : null,
    upcoming: upcoming.map(toDay),
    plannedDates: events
      .filter(
        (event) =>
          event.scheduleId && event.date >= weekStart && event.date <= plannedEnd,
      )
      .map((event) => event.date),
    goal: {
      total: goal.total,
      completed: goal.completed,
      percent: goal.percent,
    },
  };
}

export type SessionExercise = ExercisePreview & {
  /** Lo que marcó en esta sesión, o `null` si aún no lo ha hecho. */
  status: "done" | "skipped" | "modified" | null;
};

export type OpenSessionProgress = {
  exercises: SessionExercise[];
  /** Ejercicios ya marcados (hechos, saltados o modificados). */
  logged: number;
  total: number;
};

/**
 * Por dónde va la sesión que dejó a medias: los ejercicios del día, en orden,
 * con lo que ya marcó. Los ejercicios salen de la rutina **actual** del
 * paciente (`routine_items`), así que si su profesional cambia el día —añade,
 * quita, sustituye o ajusta un ejercicio— la portada lo refleja en la siguiente
 * carga; lo ya registrado conserva lo que se prescribió en su momento
 * (`session_logs.prescribed_*`).
 *
 * Dos lecturas en paralelo, con la RLS del paciente.
 */
export async function openSessionProgress(
  sessionId: string,
  dayId: string,
): Promise<OpenSessionProgress> {
  const supabase = await createClient();
  const [items, logs] = await Promise.all([
    supabase
      .from("routine_items")
      .select("id, position, sets, reps, exercises(name)")
      .eq("routine_day_id", dayId)
      .order("position"),
    supabase
      .from("session_logs")
      .select("routine_item_id, status")
      .eq("session_id", sessionId),
  ]);
  if (items.error)
    throw new Error(`No se pudieron consultar los ejercicios de tu sesión: ${items.error.message}`);
  if (logs.error)
    throw new Error(`No se pudo consultar tu avance en la sesión: ${logs.error.message}`);

  const statusOf = new Map(logs.data.map((log) => [log.routine_item_id, log.status]));
  const exercises = items.data.map((item) => ({
    name: item.exercises?.name ?? "Ejercicio",
    sets: item.sets,
    reps: item.reps,
    status: statusOf.get(item.id) ?? null,
  }));
  return {
    exercises,
    logged: exercises.filter((exercise) => exercise.status !== null).length,
    total: exercises.length,
  };
}
