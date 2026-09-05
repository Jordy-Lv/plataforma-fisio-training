"use server";

import { revalidatePath } from "next/cache";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  attendanceFormValues,
  registerAttendanceSchema,
  type ProgressState,
} from "@/lib/progress/attendance-schemas";
import { today } from "@/lib/progress/vocabulary";

const sinPermiso =
  "No puedes registrar la asistencia de este paciente: no lo tienes asignado.";

/** El código de Postgres para una restricción de unicidad violada. */
const duplicado = "23505";

/**
 * Registra la asistencia de un paciente en una fecha. La unicidad la sostiene
 * la base de datos —`unique (patient_id, attended_on)`—, no una comprobación
 * previa: dos personas registrando a la vez en el mostrador la esquivarían.
 *
 * RLS es la autorización real —solo el administrador y el profesional con
 * asignación vigente insertan—, pero una server action es una URL pública: el
 * rol se comprueba aquí también para responder algo legible.
 */
export async function registerAttendance(
  _previous: ProgressState,
  form: FormData,
): Promise<ProgressState> {
  const parsed = registerAttendanceSchema.safeParse(attendanceFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const profile = await getActiveProfile();
  if (!profile || profile.role === "patient")
    return { error: "No tienes permiso para registrar asistencia." };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .insert({
      patient_id: values.patientId,
      attended_on: values.attendedOn,
      // La hora solo se conoce cuando se registra en el momento. De un día
      // pasado queda la fecha y nada más: inventar una hora sería falsearla.
      check_in_at:
        values.attendedOn === today() ? new Date().toISOString() : null,
      notes: values.notes || null,
      registered_by: profile.id,
    })
    .select("id")
    .maybeSingle();

  if (error?.code === duplicado)
    return { error: "Ese paciente ya tiene la asistencia registrada ese día." };

  // Sin fila devuelta el `insert` no llegó a escribir: RLS no lanza error
  // cuando la política no se cumple, simplemente no afecta a ninguna fila.
  if (error || !data)
    return {
      error: error
        ? `No se pudo registrar la asistencia: ${error.message}`
        : sinPermiso,
    };

  revalidatePath("/attendance");
  revalidatePath(`/attendance/${values.patientId}`);
  revalidatePath("/attendance/me");
  return { success: "Asistencia registrada." };
}
