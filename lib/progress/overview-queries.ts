import "server-only";

import { createClient } from "@/lib/supabase/server";
import { monthStart, today } from "@/lib/progress/vocabulary";

/** Las tres cifras que el panel de administración resume del mes en curso. */
export type BusinessOverview = {
  /** Cuántos pacientes están activos hoy, sin acotar al mes. */
  activePatients: number;
  compliance: Compliance;
  attendance: AttendanceOverview;
};

export type Compliance = {
  /** Ejercicios cumplidos sobre los registrados, entre 0 y 1, o `null`. */
  rate: number | null;
  done: number;
  logged: number;
  /** Sesiones del mes de las que salen esos registros. */
  sessions: number;
};

export type AttendanceOverview = {
  /** Días de asistencia sumados de todos los pacientes activos. */
  visits: number;
  /** Cuántos de esos pacientes vinieron al menos una vez. */
  attended: number;
};

/*
  Cumplimiento: de los ejercicios que el paciente registró en las sesiones del
  mes, cuántos hizo. Cuentan como cumplidos los marcados `done` y los
  `modified` —el paciente hizo el trabajo, con una sustitución acordada— y no
  cuentan los `skipped`, que son los que dejó sin hacer. La regla vive ahora en
  `public.business_overview`, en la misma migración que la crea.

  No se mide sobre las sesiones cerradas ni sobre los ejercicios prescritos:
  lo primero premia al que abandona una sesión a la mitad, porque la sesión
  abierta no resta; lo segundo castiga al paciente que todavía la tiene en
  curso, porque lo que aún no ha registrado contaría como incumplido.
*/

/**
 * El panorama del negocio. RLS decide el alcance: el administrador lo ve de
 * todo el negocio y el profesional, de los pacientes que acompaña.
 *
 * **Las cinco cifras se agregan en la base**, en una sola consulta. Antes se
 * traían las sesiones del mes con sus registros embebidos y se contaba aquí,
 * y PostgREST corta la respuesta en `max_rows`: pasada esa marca el porcentaje
 * se calculaba sobre un subconjunto truncado y salía mal **sin ningún aviso**.
 * Es el número que responde el primer punto ciego del negocio y uno de los tres
 * KPI de la portada, así que un número inventado ahí es peor que no tenerlo.
 */
export async function getBusinessOverview(): Promise<BusinessOverview> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("business_overview", { since: monthStart() })
    .single();

  if (error)
    throw new Error(
      `No se pudo consultar el panorama del negocio: ${error.message}`,
    );

  const logged = Number(data.logged);
  const done = Number(data.done);

  return {
    activePatients: Number(data.active_patients),
    compliance: {
      // Sin un solo registro no hay porcentaje que dar: `null` es «todavía no
      // se sabe», que la pantalla explica, y no un 0 % que acusa a nadie.
      rate: logged === 0 ? null : done / logged,
      done,
      logged,
      sessions: Number(data.sessions),
    },
    attendance: {
      visits: Number(data.visits),
      attended: Number(data.attended),
    },
  };
}

/**
 * Lo que el panel del personal tiene que atender ahora mismo, no el resumen
 * del mes: alertas clínicas sin leer, sesiones con fecha de hoy, membresías en
 * su ventana de vencimiento y pacientes activos que aún no tienen tamizaje.
 *
 * Es la contraparte de trabajo de `getBusinessOverview` y sigue la misma
 * forma que la agregación de la ficha del paciente (`patientOverview`): un
 * solo `Promise.all`, conteos con `head: true` y ninguna consulta por fila.
 * RLS decide el alcance —el administrador ve todo el negocio; el profesional,
 * solo a quien acompaña—.
 */
export type StaffWorkboard = {
  /** Alertas clínicas sin marcar como leídas. */
  unreadAlerts: number;
  /** Sesiones con `performed_on` de hoy, en curso o cerradas. */
  todaySessions: number;
  /** Membresías en estado «próxima a vencer». */
  expiringMemberships: number;
  /** Pacientes activos sin ningún tamizaje registrado. */
  pendingScreenings: number;
};

export async function getStaffWorkboard(): Promise<StaffWorkboard> {
  const supabase = await createClient();
  const day = today();

  const [alerts, sessions, memberships, patients] = await Promise.all([
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("performed_on", day),
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "expiring_soon"),
    // «Pendiente» es quien no tiene ningún tamizaje. Se cuenta en la base con
    // un `not exists`: traer todos los perfiles con su tamizaje embebido para
    // contar los que venían vacíos tenía el mismo tope de `max_rows` que
    // falseaba el cumplimiento.
    supabase.rpc("pending_screenings"),
  ]);

  if (alerts.error)
    throw new Error(
      `No se pudieron contar las alertas sin leer: ${alerts.error.message}`,
    );
  if (sessions.error)
    throw new Error(
      `No se pudieron contar las sesiones de hoy: ${sessions.error.message}`,
    );
  if (memberships.error)
    throw new Error(
      `No se pudieron contar las membresías por vencer: ${memberships.error.message}`,
    );
  if (patients.error)
    throw new Error(
      `No se pudieron consultar los tamizajes pendientes: ${patients.error.message}`,
    );

  return {
    unreadAlerts: alerts.count ?? 0,
    todaySessions: sessions.count ?? 0,
    expiringMemberships: memberships.count ?? 0,
    pendingScreenings: Number(patients.data ?? 0),
  };
}
