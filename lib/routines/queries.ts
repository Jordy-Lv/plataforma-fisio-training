import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function patientRoutines(patientId: string, activeOnly = false) {
  const supabase = await createClient();
  let query = supabase.from("routines").select(
    `id, name, kind, status, starts_on, notes,
      routine_days(id, day_number, title,
        routine_items(id, position, sets, reps, target_weight, rest_seconds,
          exercises(name, description, media_url)))`,
  ).eq("patient_id", patientId).order("created_at", { ascending: false });
  if (activeOnly) query = query.eq("status", "active");
  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron consultar las rutinas: ${error.message}`);
  return (data ?? []).map((routine) => ({ ...routine,
    routine_days: routine.routine_days.sort((a, b) => a.day_number - b.day_number)
      .map((day) => ({ ...day, routine_items: day.routine_items.sort((a, b) => a.position - b.position) })),
  }));
}

export type PatientRoutine = Awaited<ReturnType<typeof patientRoutines>>[number];
