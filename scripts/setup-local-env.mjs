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

try {
  writeFileSync(
    ".env.local",
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log(".env.local creado con las credenciales públicas del entorno local.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(".env.local ya existe: se conserva su contenido. Revisa npm run db:status si necesitas actualizarlo.");
}
