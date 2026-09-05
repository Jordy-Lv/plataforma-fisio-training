import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
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
          new URL("/login?error=inactive", request.url),
          {
            headers: { "Cache-Control": "private, no-store" },
          },
        );
      }
      return NextResponse.redirect(
        new URL("/actualizar-contrasena", request.url),
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  return NextResponse.redirect(new URL("/recuperar?error=link", request.url), {
    headers: { "Cache-Control": "no-store" },
  });
}
