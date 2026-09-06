import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const supabase = fileURLToPath(new URL("../node_modules/.bin/supabase", import.meta.url));
const status = JSON.parse(execFileSync(supabase, ["status", "--output", "json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}));

if (status.API_URL !== "http://127.0.0.1:55431") {
  throw new Error("La API resuelta no pertenece a la instancia exclusiva de QA Backend.");
}

const lines = [
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
  "NEXT_PUBLIC_SITE_URL=http://localhost:3107",
  `SUPABASE_URL=${status.API_URL}`,
  `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
  "FISIO_TEST_APP_URL=http://127.0.0.1:3107",
  "MAILPIT_URL=http://127.0.0.1:55434",
  "SMTP_URL=smtp://127.0.0.1:55435",
  "CRON_SECRET=qa-backend-20260906t145640-local-only",
  "QA_BACKEND_PG_URL=postgresql://postgres:postgres@127.0.0.1:55432/postgres",
];

writeFileSync(new URL("../.env.local", import.meta.url), `${lines.join("\n")}\n`, {
  flag: "wx",
  mode: 0o600,
});

console.log("Entorno exclusivo escrito; valores sensibles omitidos de la salida.");
