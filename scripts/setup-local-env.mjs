import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const status = JSON.parse(
  execFileSync(fileURLToPath(new URL("../node_modules/.bin/supabase", import.meta.url)), ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
if (!status.API_URL || !status.ANON_KEY) {
  throw new Error("Inicia Supabase local con npm run db:start antes de configurar el entorno.");
}

// La clave de servicio salta RLS: solo la usan la semilla y la ruta interna de
// la revisión de vencimientos (app/api/cron/memberships). CRON_SECRET protege
// esa ruta y tiene que coincidir con private.job_config del pg_cron local.
// SMTP_URL es opcional: sin él, el aviso de vencimiento no manda correo.
const lines = [
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
  `NEXT_PUBLIC_SITE_URL=http://localhost:3000`,
  `SUPABASE_URL=${status.API_URL}`,
  `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY ?? ""}`,
  `CRON_SECRET=local-dev-cron-secret`,
  `SMTP_URL=smtp://127.0.0.1:54325`,
];

try {
  writeFileSync(".env.local", `${lines.join("\n")}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  console.log(".env.local creado con las credenciales del entorno local.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(".env.local ya existe: se conserva su contenido. Revisa npm run db:status si necesitas actualizarlo.");
}
