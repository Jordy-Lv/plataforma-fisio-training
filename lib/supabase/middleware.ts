import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseConfig();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (data?.claims.sub) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.claims.sub)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "No se pudo verificar tu acceso. Inténtalo de nuevo." },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    if (!profile?.is_active) {
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
      const destination = new URL("/login?error=inactive", request.url);
      const denied = NextResponse.redirect(
        destination,
        request.method === "GET" ? 307 : 303,
      );
      response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie));
      denied.headers.set("Cache-Control", "private, no-store");
      return denied;
    }
    response.headers.set("Cache-Control", "private, no-store");
  }

  const forwarded = NextResponse.next({ request });
  forwarded.headers.forEach((value, name) => response.headers.set(name, value));
  return response;
}
