import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { isMailEnabled, sendMail } from "@/lib/progress/mailer";
import { formatDate } from "@/lib/progress/vocabulary";

/**
 * Orquesta la revisión de vencimientos: llama a `review_membership_expiry` en la
 * base de datos y envía el correo de aviso de los que sean nuevos.
 *
 * Este archivo, la semilla y el job de pg_cron son los únicos lugares del
 * proyecto que pueden usar la clave de servicio. Aquí hace falta porque la
 * revisión corre sin sesión de usuario: la dispara pg_cron o el administrador
 * desde el panel, y tiene que ver y modificar las membresías de todos.
 */

/** Un aviso recién emitido, tal como lo devuelve la función de base de datos. */
type NewNotice = {
  notice_id: string;
  membership_id: string;
  patient_id: string;
  patient_name: string | null;
  patient_email: string | null;
  plan_name: string | null;
  kind: "expiring_soon" | "expired";
  expires_on: string;
};

type ReviewPayload = {
  notice_days: number;
  today_on: string;
  transitioned_expiring: number;
  transitioned_expired: number;
  new_notices: NewNotice[];
};

export type ReviewResult = ReviewPayload & {
  emailed: number;
  emailSkipped: boolean;
  emailErrors: string[];
  /**
   * `notice_id` de avisos cuyo correo sí salió pero cuyo `notified_at` no se
   * pudo escribir. Como `review_membership_expiry` solo devuelve avisos recién
   * insertados, estos no reaparecen en la siguiente revisión: quedan aquí para
   * que el panel/cron lo reporte y se puedan reconciliar a mano.
   */
  unmarked: string[];
};

function serviceClient() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    throw new Error(
      "Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para ejecutar la revisión de vencimientos.",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Asunto y cuerpo del aviso, en español y accionables. */
function composeNotice(notice: NewNotice) {
  const plan = notice.plan_name ?? "tu plan";
  const vence = formatDate(notice.expires_on);
  const saludo = notice.patient_name ? `Hola, ${notice.patient_name}:` : "Hola:";

  if (notice.kind === "expired") {
    return {
      subject: `Tu membresía venció el ${vence}`,
      text: `${saludo}

Tu membresía de ${plan} venció el ${vence}. Para seguir asistiendo, acércate a
recepción o escríbenos para renovarla.

Si ya la renovaste, ignora este mensaje.`,
    };
  }

  return {
    subject: `Tu membresía vence el ${vence}`,
    text: `${saludo}

Te recordamos que tu membresía de ${plan} vence el ${vence}. Renuévala antes de
esa fecha en recepción para no interrumpir tus sesiones.

Si ya la renovaste, ignora este mensaje.`,
  };
}

/**
 * Ejecuta la revisión y envía los correos de los avisos nuevos. El correo es
 * best-effort: un fallo de envío se acumula en `emailErrors` y no interrumpe el
 * resto. Marca `notified_at` en los avisos que sí salieron.
 */
export async function runMembershipReview(
  noticeDays?: number,
): Promise<ReviewResult> {
  const supabase = serviceClient();

  const { data, error } = await supabase.rpc("review_membership_expiry", {
    notice_days: noticeDays,
  });
  if (error) {
    throw new Error(`No se pudo revisar los vencimientos: ${error.message}`);
  }

  const payload = data as unknown as ReviewPayload;
  const emailSkipped = !isMailEnabled();
  const emailErrors: string[] = [];
  const unmarked: string[] = [];
  let emailed = 0;

  if (!emailSkipped) {
    for (const notice of payload.new_notices) {
      if (!notice.patient_email) continue;
      const { subject, text } = composeNotice(notice);
      try {
        await sendMail({ to: notice.patient_email, subject, text });
      } catch (sendError) {
        const reason =
          sendError instanceof Error ? sendError.message : String(sendError);
        emailErrors.push(`${notice.patient_email}: ${reason}`);
        continue;
      }
      // El correo salió. Si el marcado falla, el aviso no se reintenta solo:
      // se registra en `unmarked` para que quien dispara la revisión lo vea.
      emailed += 1;
      const { error: markError } = await supabase
        .from("membership_notices")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", notice.notice_id);
      if (markError) unmarked.push(notice.notice_id);
    }
  }

  return { ...payload, emailed, emailSkipped, emailErrors, unmarked };
}
