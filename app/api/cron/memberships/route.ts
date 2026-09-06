import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runMembershipReview } from "@/lib/progress/membership-review";
import { noticeDaysSchema } from "@/lib/progress/membership-schemas";

/**
 * Revisión diaria de vencimientos de membresías. La invoca pg_cron con el
 * secreto compartido; el panel de administración la dispara a mano con el mismo
 * secreto. Sin el secreto correcto no se toca ninguna membresía.
 *
 * Necesita el runtime de Node: usa la clave de servicio y abre un socket SMTP.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const provided = bearer ?? request.headers.get("x-cron-secret");
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  let noticeDays: number | undefined;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Cuerpo vacío o no-JSON: se usa el plazo configurado en alert_settings.
    body = null;
  }
  if (body != null && typeof body === "object" && "noticeDays" in body) {
    const raw = (body as { noticeDays: unknown }).noticeDays;
    // `null` explícito = "usa el plazo configurado", igual que omitirlo.
    if (raw !== null) {
      const parsed = noticeDaysSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0].message },
          { status: 400, headers: { "cache-control": "no-store" } },
        );
      }
      noticeDays = parsed.data;
    }
  }

  try {
    const result = await runMembershipReview(noticeDays);
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
