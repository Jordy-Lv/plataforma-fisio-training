"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ReviewResult } from "@/lib/progress/membership-review";

/** Lo que devuelve el disparo manual de la revisión. */
export type ReviewActionState = { error?: string; summary?: string };

/** La clave de `alert_settings` que fija el plazo de aviso de vencimiento. */
const NOTICE_DAYS_KEY = "membership_expiring_days";

const noticeDaysSchema = z.coerce
  .number({ error: "Indica el plazo de aviso en días." })
  .int("El plazo de aviso se cuenta en días enteros.")
  .min(1, "El plazo de aviso debe ser de al menos un día.")
  .max(90, "Un plazo mayor de 90 días no tiene sentido para un aviso.");

/**
 * Dispara la revisión de vencimientos desde el panel de administración. No hace
 * el trabajo aquí: llama a la misma ruta interna que usa pg_cron, con el
 * secreto compartido, para que la clave de servicio siga viviendo en un solo
 * sitio.
 */
export async function triggerMembershipReview(): Promise<ReviewActionState> {
  const profile = await getActiveProfile();
  if (profile?.role !== "admin") {
    return { error: "Solo el administrador puede lanzar la revisión." };
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return {
      error:
        "Falta configurar CRON_SECRET. Sin él la revisión no se puede disparar.",
    };
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let response: Response;
  try {
    response = await fetch(`${base}/api/cron/memberships`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: "{}",
      cache: "no-store",
    });
  } catch {
    return { error: "No se pudo contactar con la ruta de revisión." };
  }

  const data = (await response.json().catch(() => null)) as
    | (ReviewResult & { error?: string })
    | null;

  if (!response.ok || !data) {
    return {
      error: data?.error ?? `La revisión respondió ${response.status}.`,
    };
  }

  revalidatePath("/memberships");
  revalidatePath("/memberships/me");

  return { summary: describeReview(data) };
}

function describeReview(data: ReviewResult): string {
  const nuevos = data.transitioned_expiring + data.transitioned_expired;
  const partes = [
    `Plazo de aviso: ${data.notice_days} días.`,
    nuevos === 0
      ? "Ninguna membresía cambió de estado."
      : `${data.transitioned_expiring} próximas a vencer y ${data.transitioned_expired} vencidas.`,
  ];
  if (data.emailSkipped) {
    partes.push("Correo desactivado (sin SMTP_URL).");
  } else if (data.emailErrors.length > 0) {
    partes.push(`${data.emailed} correos enviados, ${data.emailErrors.length} con error.`);
  } else if (data.emailed > 0) {
    partes.push(`${data.emailed} correos enviados.`);
  }

  return partes.join(" ");
}

/** El plazo de aviso vigente, en días. Cae a 4 si la fila no existe. */
export async function getMembershipNoticeDays(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alert_settings")
    .select("value")
    .eq("key", NOTICE_DAYS_KEY)
    .maybeSingle();
  if (error) {
    throw new Error(`No se pudo consultar el plazo de aviso: ${error.message}`);
  }
  return data ? Number(data.value) : 4;
}

/**
 * Ajusta el plazo con que se avisa un vencimiento próximo. Lo escribe en
 * `alert_settings`; RLS solo deja hacerlo a `admin`. Las revisiones siguientes
 * —la diaria y la manual— usan el nuevo valor.
 */
export async function setMembershipNoticeDays(
  _previous: ReviewActionState,
  form: FormData,
): Promise<ReviewActionState> {
  const parsed = noticeDaysSchema.safeParse(form.get("noticeDays"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const profile = await getActiveProfile();
  if (profile?.role !== "admin") {
    return { error: "Solo el administrador puede cambiar el plazo de aviso." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alert_settings")
    .update({ value: parsed.data })
    .eq("key", NOTICE_DAYS_KEY)
    .select("key")
    .maybeSingle();
  if (error) {
    return { error: `No se pudo guardar el plazo de aviso: ${error.message}` };
  }
  if (!data) {
    return { error: "Solo el administrador puede cambiar el plazo de aviso." };
  }

  revalidatePath("/memberships");
  return { summary: `Plazo de aviso guardado: ${parsed.data} días.` };
}
