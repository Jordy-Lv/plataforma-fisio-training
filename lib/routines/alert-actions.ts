"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readAlertSchema, type RoutineActionState } from "@/lib/routines/schemas";
export async function readAlert(_previous: RoutineActionState, form: FormData): Promise<RoutineActionState> {
  const parsed = readAlertSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("alerts").update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data.alertId).select("id").maybeSingle();
  if (error) return { error: `No se pudo marcar la alerta: ${error.message}` };
  if (!data) return { error: "Esta alerta no está dirigida a ti o ya no tienes acceso." };
  revalidatePath("/pro/alerts");
  return { success: "Alerta marcada como leída para ti." };
}
