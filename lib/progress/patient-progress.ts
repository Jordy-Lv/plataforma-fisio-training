import "server-only";

import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { addDays, startOfWeek } from "@/lib/routines/calendar";
import { patientCalendar } from "@/lib/routines/calendar-queries";
import { createClient } from "@/lib/supabase/server";

/** Semanas que dibuja la constancia: un trimestre. */
const WEEKS = 12;
/** Días hacia atrás que cuentan para la adherencia al calendario. */
const ADHERENCE_DAYS = 28;
/** Ventana del dolor medio; se compara con la ventana anterior del mismo largo. */
const PAIN_WINDOW_DAYS = 30;
/** Sesiones más recientes que dibuja la gráfica de dolor y esfuerzo. */
const PAIN_SESSIONS = 12;
/** Cuántas zonas de dolor se listan, de la más reportada a la menos. */
const PAIN_ZONES = 5;

export type WeekCount = {
  /** Lunes de la semana, `YYYY-MM-DD`. */
  weekStart: string;
  completed: number;
  isCurrent: boolean;
};

export type SessionPain = {
  sessionId: string;
  performedOn: string;
  /** Media de lo registrado en la sesión, o `null` si no registró nada. */
  pain: number | null;
  effort: number | null;
};

export type PatientProgress = {
  weeks: WeekCount[];
  /** Sesiones terminadas en las doce semanas. */
  completedTotal: number;
  /** Programadas y terminadas en los últimos 28 días; `scheduled` 0 si no hubo. */
  adherence: { scheduled: number; completed: number };
  /** Dolor medio (0–10) en los últimos 30 días y en los 30 anteriores. */
  pain: { current: number | null; previous: number | null };
  sessions: SessionPain[];
  /** Zonas con dolor registrado en las doce semanas, de la más a la menos repetida. */
  painZones: { label: string; count: number }[];
};

function average(values: number[]) {
  return values.length === 0
    ? null
    : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

/**
 * Lo que el paciente necesita para ver su progreso en «Mi evolución»: su
 * constancia semana a semana, cuánto cumple de lo programado, cómo evoluciona
 * su dolor y su esfuerzo, y dónde le duele más. El peso, las medidas y las
 * cargas salen de las consultas que ya usa la evolución del equipo.
 *
 * Tres lecturas en paralelo, sin ninguna dentro de un bucle: las sesiones
 * terminadas, los registros con dolor o esfuerzo (con la fecha de su sesión) y
 * el calendario de las últimas cuatro semanas. Todo se agrega aquí: al
 * navegador solo llegan las cifras que se pintan.
 */
export async function patientProgress(
  patientId: string,
  today: string,
): Promise<PatientProgress> {
  const supabase = await createClient();
  const firstWeek = addDays(startOfWeek(today), -7 * (WEEKS - 1));

  const [sessions, logs, calendar] = await Promise.all([
    supabase
      .from("sessions")
      .select("performed_on")
      .eq("patient_id", patientId)
      .eq("status", "completed")
      .gte("performed_on", firstWeek),
    supabase
      .from("session_logs")
      .select("session_id, pain_level, perceived_effort, pain_location, sessions!inner (performed_on)")
      .eq("patient_id", patientId)
      .gte("sessions.performed_on", firstWeek),
    patientCalendar(patientId, addDays(today, -(ADHERENCE_DAYS - 1)), today, today),
  ]);
  if (sessions.error)
    throw new Error(`No se pudieron consultar tus sesiones: ${sessions.error.message}`);
  if (logs.error)
    throw new Error(`No se pudieron consultar tus registros: ${logs.error.message}`);

  const weeks: WeekCount[] = Array.from({ length: WEEKS }, (_, index) => ({
    weekStart: addDays(firstWeek, index * 7),
    completed: 0,
    isCurrent: index === WEEKS - 1,
  }));
  for (const session of sessions.data) {
    const week = weeks.find((entry) => entry.weekStart === startOfWeek(session.performed_on));
    if (week) week.completed += 1;
  }

  const scheduled = calendar.filter((event) => event.scheduleId);
  const adherence = {
    scheduled: scheduled.length,
    completed: scheduled.filter((event) =>
      event.sessions.some((session) => session.status === "completed"),
    ).length,
  };

  // Una entrada por sesión con la media de lo registrado en sus ejercicios.
  const bySession = new Map<string, { on: string; pain: number[]; effort: number[] }>();
  const zones = new Map<string, number>();
  for (const log of logs.data) {
    const entry = bySession.get(log.session_id) ?? {
      on: log.sessions.performed_on,
      pain: [],
      effort: [],
    };
    if (log.pain_level !== null) entry.pain.push(log.pain_level);
    if (log.perceived_effort !== null) entry.effort.push(log.perceived_effort);
    bySession.set(log.session_id, entry);
    if (log.pain_location && (log.pain_level ?? 0) > 0)
      zones.set(log.pain_location, (zones.get(log.pain_location) ?? 0) + 1);
  }

  const sessionPain = [...bySession]
    .map(([sessionId, entry]) => ({
      sessionId,
      performedOn: entry.on,
      pain: average(entry.pain),
      effort: average(entry.effort),
    }))
    .filter((entry) => entry.pain !== null || entry.effort !== null)
    .sort((a, b) => a.performedOn.localeCompare(b.performedOn));

  const windowStart = addDays(today, -(PAIN_WINDOW_DAYS - 1));
  const previousStart = addDays(windowStart, -PAIN_WINDOW_DAYS);
  const painIn = (from: string, to: string) =>
    average(
      sessionPain
        .filter((entry) => entry.performedOn >= from && entry.performedOn <= to)
        .flatMap((entry) => (entry.pain === null ? [] : [entry.pain])),
    );

  return {
    weeks,
    completedTotal: sessions.data.length,
    adherence,
    pain: {
      current: painIn(windowStart, today),
      previous: painIn(previousStart, addDays(windowStart, -1)),
    },
    sessions: sessionPain.slice(-PAIN_SESSIONS),
    painZones: [...zones]
      .sort((a, b) => b[1] - a[1])
      .slice(0, PAIN_ZONES)
      .map(([zone, count]) => ({
        label: bodyPartLabels[zone as keyof typeof bodyPartLabels] ?? zone,
        count,
      })),
  };
}

/**
 * Sesiones terminadas en el mes de `date` (`YYYY-MM-DD`): la cifra «en el mes»
 * del calendario del paciente, del mes que está mirando. Solo el conteo.
 */
export async function monthSessionCount(patientId: string, date: string): Promise<number> {
  const supabase = await createClient();
  const [year, month] = date.split("-").map(Number);
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const { count, error } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("status", "completed")
    .gte("performed_on", `${date.slice(0, 7)}-01`)
    .lt("performed_on", next);
  if (error) throw new Error(`No se pudieron contar tus sesiones del mes: ${error.message}`);
  return count ?? 0;
}
