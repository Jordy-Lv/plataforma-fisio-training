import "server-only";

import { today } from "@/lib/progress/vocabulary";
import { createClient } from "@/lib/supabase/server";

/**
 * Lo que la portada del paciente necesita saber de un vistazo: en qué día está,
 * si ya entrenó esta semana, cuántas semanas seguidas lleva y si dejó una sesión
 * a medias.
 *
 * Es la primera pieza de la agregación de la sección 5 del change
 * `improve-frontend-ux`: la ficha del profesional añadirá aquí membresía,
 * condiciones activas y último tamizaje. Se escribe ya con la forma de esa
 * agregación —un solo `Promise.all`, sin ninguna consulta dentro de un `map`—
 * para que crecer sea añadir promesas, no rehacerla.
 */

/** Cuánta historia se lee para calcular la racha. Doce semanas cubren un trimestre. */
const HISTORIA_DIAS = 84;

/**
 * Aritmética de fechas sobre `YYYY-MM-DD`. Se ancla al mediodía UTC porque un
 * `date` de Postgres no lleva hora: sumando desde medianoche, un desplazamiento
 * de zona horaria de una hora bastaría para caer en el día anterior.
 */
function sumarDias(iso: string, dias: number) {
  const fecha = new Date(`${iso}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Día de la semana con el lunes en 0, que es como empieza la semana aquí. */
function diaDeLaSemana(iso: string) {
  return (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/** El lunes de la semana a la que pertenece `iso`. */
export function inicioDeSemana(iso: string) {
  return sumarDias(iso, -diaDeLaSemana(iso));
}

export type WeekDay = {
  /** `YYYY-MM-DD`, la misma forma con la que viaja `sessions.performed_on`. */
  date: string;
  /** Inicial del día —«L», «M», «X»…— para la tira estrecha del teléfono. */
  initial: string;
  /** Número del día del mes, que es lo que ubica al paciente en el calendario. */
  dayOfMonth: number;
  isToday: boolean;
  /** Aún no ha llegado: se pinta apagado, no como un día en el que no entrenó. */
  isFuture: boolean;
  /** Terminó al menos una sesión ese día. */
  hasSession: boolean;
  /** El equipo le registró la visita ese día. */
  hasAttendance: boolean;
};

export type OpenSession = {
  id: string;
  performedOn: string;
  routineName: string;
  dayTitle: string;
};

export type PatientOverview = {
  today: string;
  week: WeekDay[];
  /**
   * Semanas seguidas con al menos una sesión terminada, contando hacia atrás
   * desde la semana en curso.
   *
   * Se cuenta por semanas y no por días a propósito: quien entrena tres veces
   * por semana —que es lo normal— nunca pasaría de una racha de un día, y una
   * cifra que siempre vale 1 no informa de nada. La semana en curso no rompe la
   * racha mientras no termine: si aún no ha entrenado, se empieza a contar
   * desde la anterior.
   */
  streakWeeks: number;
  openSession: OpenSession | null;
};

const iniciales = ["L", "M", "X", "J", "V", "S", "D"];

export async function patientOverview(patientId: string): Promise<PatientOverview> {
  const supabase = await createClient();
  const hoy = today();
  const lunes = inicioDeSemana(hoy);
  const desde = sumarDias(hoy, -HISTORIA_DIAS);

  const [sessions, attendance, open] = await Promise.all([
    supabase
      .from("sessions")
      .select("performed_on")
      .eq("patient_id", patientId)
      .eq("status", "completed")
      .gte("performed_on", desde)
      .order("performed_on", { ascending: false }),
    supabase
      .from("attendance")
      .select("attended_on")
      .eq("patient_id", patientId)
      .gte("attended_on", lunes)
      .lte("attended_on", sumarDias(lunes, 6)),
    supabase
      .from("sessions")
      .select("id, performed_on, routines(name), routine_days(title)")
      .eq("patient_id", patientId)
      .eq("status", "in_progress")
      .order("performed_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (sessions.error)
    throw new Error(`No se pudo consultar tu historial: ${sessions.error.message}`);
  if (attendance.error)
    throw new Error(`No se pudo consultar tu asistencia: ${attendance.error.message}`);
  if (open.error)
    throw new Error(`No se pudo consultar tu sesión en curso: ${open.error.message}`);

  const conSesion = new Set((sessions.data ?? []).map((row) => row.performed_on));
  const conVisita = new Set((attendance.data ?? []).map((row) => row.attended_on));

  const week: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = sumarDias(lunes, i);
    return {
      date,
      initial: iniciales[i],
      dayOfMonth: Number(date.slice(8, 10)),
      isToday: date === hoy,
      isFuture: date > hoy,
      hasSession: conSesion.has(date),
      hasAttendance: conVisita.has(date),
    };
  });

  return {
    today: hoy,
    week,
    streakWeeks: contarSemanas(conSesion, lunes),
    openSession: open.data
      ? {
          id: open.data.id,
          performedOn: open.data.performed_on,
          routineName: open.data.routines?.name ?? "Tu rutina",
          dayTitle: open.data.routine_days?.title ?? "Sesión en curso",
        }
      : null,
  };
}

/**
 * Semanas seguidas con al menos una sesión, hacia atrás desde `lunes`. La
 * historia leída acota el resultado: doce semanas es el techo, y para la
 * portada «12 semanas» ya dice lo que hay que decir.
 */
function contarSemanas(fechas: Set<string>, lunes: string) {
  const semanas = new Set([...fechas].map(inicioDeSemana));
  let racha = 0;
  let cursor = lunes;
  // La semana en curso no cuenta como rota mientras no termine: si todavía no
  // hay sesión, se salta y se sigue contando desde la anterior.
  if (!semanas.has(cursor)) cursor = sumarDias(cursor, -7);
  while (semanas.has(cursor)) {
    racha += 1;
    cursor = sumarDias(cursor, -7);
  }
  return racha;
}
