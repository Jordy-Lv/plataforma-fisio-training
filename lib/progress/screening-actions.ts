"use server";

import { revalidatePath } from "next/cache";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  createScreeningSchema,
  screeningFormValues,
  type ProgressState,
} from "@/lib/progress/screening-schemas";

const sinPermiso =
  "No puedes registrar tamizajes de este paciente: no lo tienes asignado.";

/**
 * Registra un tamizaje. El IMC no se envía: es una columna generada, para que
 * ninguna vista pueda mostrar un valor distinto del de otra.
 *
 * RLS es la autorización real —solo el administrador y el profesional con
 * asignación vigente insertan—, pero una server action es una URL pública: el
 * rol se comprueba aquí también para responder algo legible.
 */
export async function createScreening(
  _previous: ProgressState,
  form: FormData,
): Promise<ProgressState> {
  const parsed = createScreeningSchema.safeParse(screeningFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const profile = await getActiveProfile();
  if (!profile || profile.role === "patient")
    return { error: "No tienes permiso para registrar tamizajes." };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("screenings")
    .insert({
      patient_id: values.patientId,
      taken_on: values.takenOn,
      weight_kg: values.weightKg,
      height_cm: values.heightCm,
      body_fat_pct: values.bodyFatPct ?? null,
      measurements: values.measurements,
      notes: values.notes || null,
      taken_by: profile.id,
    })
    .select("id")
    .maybeSingle();

  // Sin fila devuelta el `insert` no llegó a escribir: RLS no lanza error
  // cuando la política no se cumple, simplemente no afecta a ninguna fila.
  if (error || !data)
    return {
      error: error
        ? `No se pudo registrar el tamizaje: ${error.message}`
        : sinPermiso,
    };

  revalidatePath("/screenings");
  revalidatePath(`/screenings/${values.patientId}`);
  return { success: "Tamizaje registrado." };
}
