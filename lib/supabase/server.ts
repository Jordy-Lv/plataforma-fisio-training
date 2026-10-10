import "server-only";

import type { Database } from "@/lib/db/types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient<Database>(url, anonKey, {
    // Cada enlace de correo (recuperar contraseña, confirmar el alta) lleva el
    // identificador de su flujo PKCE (`sb_flow_id`) y el callback canjea el
    // código con **ese** verificador. Sin esto se usaba «el último guardado»,
    // que no es el del enlace si la persona pidió dos o dejó restos de un
    // intento anterior: el código se rechazaba y el enlace parecía vencido.
    auth: { experimental: { appendPkceFlowIdToRedirects: true } },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !error.message.includes("Cookies can only be modified")
          ) {
            throw error;
          }
          // En Server Components las cookies las persiste el middleware.
        }
      },
    },
  });
}
