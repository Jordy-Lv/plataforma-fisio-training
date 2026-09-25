/**
 * Credenciales de administración para los scripts de siembra.
 *
 * La clave de servicio salta RLS: solo pueden usarla los scripts de siembra y
 * el job de pg_cron. Si aparece en cualquier otro lugar del proyecto, el PR se
 * rechaza.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("../../", import.meta.url));

export function entornoLocal() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && clave) return { url, clave };

  // Sin variables de entorno se asume el Supabase local, igual que db:env.
  const estado = JSON.parse(
    execFileSync(process.execPath, [path.join(raiz, "node_modules/supabase/dist/supabase.js"), "status", "--output", "json"], {
      cwd: raiz,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  ) as { API_URL?: string; SERVICE_ROLE_KEY?: string };

  if (!estado.API_URL || !estado.SERVICE_ROLE_KEY) {
    throw new Error(
      "Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, o enciende Supabase local con npm run db:start.",
    );
  }
  return { url: estado.API_URL, clave: estado.SERVICE_ROLE_KEY };
}
