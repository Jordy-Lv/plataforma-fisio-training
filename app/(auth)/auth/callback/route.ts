import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/supabase/public-url";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  // El identificador del flujo PKCE que viaja en el enlace (`lib/supabase/server.ts`):
  // elige el verificador de esta solicitud y no el último guardado.
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error)
      // Sin datos de la persona: solo el motivo, para leerlo en los logs de Railway.
      console.error(
        `[auth/callback] No se pudo canjear el código: ${error.code ?? error.name} — ${error.message}`,
      );
    if (!error && data.user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileError || !profile?.is_active) {
        const { error: signOutError } = await supabase.auth.signOut({
          scope: "local",
        });
        if (signOutError) {
          return NextResponse.json(
            {
              error:
                "Tu acceso está bloqueado. No se pudo cerrar la sesión; inténtalo de nuevo.",
            },
            { status: 503, headers: { "Cache-Control": "private, no-store" } },
          );
        }
        return NextResponse.redirect(
          publicUrl("/login?error=inactive", request),
          {
            headers: { "Cache-Control": "private, no-store" },
          },
        );
      }
      return NextResponse.redirect(
        publicUrl("/actualizar-contrasena", request),
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  if (!code)
    console.error(
      `[auth/callback] Llegó sin código: ${request.nextUrl.searchParams.get("error_code") ?? "sin error_code"}`,
    );
  return NextResponse.redirect(publicUrl("/recuperar?error=link", request), {
    headers: { "Cache-Control": "no-store" },
  });
}
