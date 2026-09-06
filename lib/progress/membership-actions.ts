"use server";

import { revalidatePath } from "next/cache";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  createMembershipSchema,
  membershipFormValues,
  updateMembershipSchema,
  type MembershipState,
} from "@/lib/progress/membership-schemas";

const sinPermiso =
  "Solo el administrador puede registrar o editar las membresías.";

/**
 * Las membresías las escribe únicamente `admin`. RLS es la autorización real,
 * pero una server action es una URL pública: el rol se comprueba aquí también
 * para responder algo legible en vez de un error de base de datos.
 */
async function isAdmin() {
  const profile = await getActiveProfile();
  return profile?.role === "admin";
}

/** Rutas que dependen de una membresía: el panel, la vista propia y la ficha. */
function revalidateMembership(patientId: string) {
  revalidatePath("/memberships");
  revalidatePath("/memberships/me");
  revalidatePath(`/screenings/${patientId}`);
}

export async function createMembership(
  _previous: MembershipState,
  form: FormData,
): Promise<MembershipState> {
  const parsed = createMembershipSchema.safeParse(membershipFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .insert({
      patient_id: values.patientId,
      plan_id: values.planId,
      started_on: values.startedOn,
      expires_on: values.expiresOn,
      amount: values.amount,
      status: values.status,
      notes: values.notes,
    })
    .select("id")
    .maybeSingle();

  // 23503: el paciente o el plan indicados no existen.
  if (error?.code === "23503")
    return { error: "El paciente o el plan seleccionados ya no existen." };
  if (error)
    return { error: `No se pudo registrar la membresía: ${error.message}` };
  if (!data) return { error: sinPermiso };

  revalidateMembership(values.patientId);
  return { success: "Membresía registrada." };
}

export async function updateMembership(
  _previous: MembershipState,
  form: FormData,
): Promise<MembershipState> {
  const parsed = updateMembershipSchema.safeParse(membershipFormValues(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await isAdmin())) return { error: sinPermiso };

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .update({
      patient_id: values.patientId,
      plan_id: values.planId,
      started_on: values.startedOn,
      expires_on: values.expiresOn,
      amount: values.amount,
      status: values.status,
      notes: values.notes,
    })
    .eq("id", values.id)
    .select("id")
    .maybeSingle();

  if (error?.code === "23503")
    return { error: "El paciente o el plan seleccionados ya no existen." };
  if (error)
    return { error: `No se pudo guardar la membresía: ${error.message}` };
  // Sin fila devuelta el `update` no encontró nada que le dejaran tocar: RLS
  // no lanza error, simplemente no afecta a ninguna fila.
  if (!data) return { error: sinPermiso };

  revalidateMembership(values.patientId);
  return { success: "Membresía actualizada." };
}
