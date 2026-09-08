import "server-only";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { alertList, type AlertFilters } from "@/lib/routines/alert-list";
const evidenceSchema = z.object({ session_id: z.string(), performed_on: z.string(), pain_level: z.number().nullable(), pain_location: z.string().nullable(), notes: z.string().nullable() });

/**
 * Las alertas que el actor puede ver, paginadas. RLS decide el alcance: el
 * administrador las ve todas y el profesional solo las de sus pacientes.
 *
 * Sin filtros devuelve la página más reciente en orden `created_at desc`, que
 * es lo que exige `docs/11`: la suite abre `/pro/alerts` a secas y busca ahí
 * la alerta que acaba de provocar.
 *
 * `recipientId` no filtra nada: sirve para contar en la base las alertas sin
 * leer de esa persona, en vez de contarlas sobre la lista ya recortada.
 */
export async function clinicalAlerts(filters: AlertFilters = alertList.empty, recipientId?: string) {
  const supabase = await createClient();
  const { from, to } = alertList.range(filters);
  let query = supabase.from("alerts").select(`id, type, severity, read_at, created_at, patient_id, recipient_id, payload,
    patient:profiles!alerts_patient_id_fkey(full_name), recipient:profiles!alerts_recipient_id_fkey(full_name)`, { count: "exact" })
    .order("created_at", { ascending: false });
  if (filters.read === "unread") query = query.is("read_at", null);
  if (filters.read === "read") query = query.not("read_at", "is", null);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.severity) query = query.eq("severity", filters.severity);
  if (filters.patient) query = query.eq("patient_id", filters.patient);
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(`No se pudieron consultar las alertas: ${error.message}`);

  // El conteo sin leer sale de la base, no de la página: con veinte alertas a
  // la vista y doscientas guardadas, contarlo sobre la lista mentía.
  const unread = recipientId
    ? await supabase.from("alerts").select("id", { count: "exact", head: true })
        .is("read_at", null).eq("recipient_id", recipientId)
    : { count: 0, error: null };
  if (unread.error) throw new Error(`No se pudieron contar las alertas sin leer: ${unread.error.message}`);

  const alerts = (data ?? []).map((alert) => {
    const payload = z.record(z.string(), z.unknown()).parse(alert.payload);
    const evidence = Array.isArray(payload.evidence) ? payload.evidence.flat().map((item) => evidenceSchema.parse(item)) : [];
    const exerciseId = typeof payload.exercise_id === "string" ? payload.exercise_id : payload.dimension === "exercise" && typeof payload.value === "string" ? payload.value : null;
    return { ...alert, evidence, exerciseId, zone: payload.dimension === "zone" ? String(payload.value) : null,
      message: typeof payload.message === "string" ? payload.message : typeof payload.notes === "string" ? payload.notes : null };
  });
  const ids = [...new Set(alerts.flatMap((alert) => alert.exerciseId ? [alert.exerciseId] : []))];
  const exercises = ids.length ? await supabase.from("exercises").select("id, name").in("id", ids) : { data: [], error: null };
  if (exercises.error) throw new Error(`No se pudo consultar el contexto: ${exercises.error.message}`);
  const names = new Map(exercises.data?.map((exercise) => [exercise.id, exercise.name]));
  return {
    alerts: alerts.map((alert) => ({ ...alert, exerciseName: alert.exerciseId ? names.get(alert.exerciseId) ?? "Ejercicio" : null })),
    total: count ?? 0,
    pages: alertList.pages(count ?? 0),
    unread: unread.count ?? 0,
  };
}

export type ClinicalAlert = Awaited<ReturnType<typeof clinicalAlerts>>["alerts"][number];
