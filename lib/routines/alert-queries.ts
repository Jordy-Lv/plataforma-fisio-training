import "server-only";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
const evidenceSchema = z.object({ session_id: z.string(), performed_on: z.string(), pain_level: z.number().nullable(), pain_location: z.string().nullable(), notes: z.string().nullable() });
export async function clinicalAlerts() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("alerts").select(`id, type, severity, read_at, created_at, patient_id, recipient_id, payload,
    patient:profiles!alerts_patient_id_fkey(full_name), recipient:profiles!alerts_recipient_id_fkey(full_name)`)
    .order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(`No se pudieron consultar las alertas: ${error.message}`);
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
  return alerts.map((alert) => ({ ...alert, exerciseName: alert.exerciseId ? names.get(alert.exerciseId) ?? "Ejercicio" : null }));
}
