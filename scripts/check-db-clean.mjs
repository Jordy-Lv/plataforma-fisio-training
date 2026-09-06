#!/usr/bin/env node
/**
 * scripts/check-db-clean.mjs
 *
 * Detector de base de datos sucia: comprueba si la base de datos local de Supabase
 * está limpia o si tiene fixtures huérfanos (usuarios, rutinas, alertas o ejercicios)
 * dejados por suites de prueba interrumpidas antes de su bloque de limpieza (Ctrl+C,
 * timeout, falta de cuota).
 *
 * Valores esperados en base limpia:
 *   - 867 ejercicios: provienen de scripts/seed-exercises.ts (catálogo base
 *     importado desde free-exercise-db a public.exercises).
 *   - 0 ejercicios personalizados (is_custom = true): el seed oficial solo crea
 *     ejercicios base del catálogo; los personalizados son creados por pruebas o en runtime.
 *   - 3 alertas: generadas por scripts/seed-progress-demo.ts al sembrar la membresía
 *     próxima a vencer del paciente demo Marcos Rojas (una alerta membership_expiring
 *     para Ana Jefa admin, una para Beto entrenador y una para Carla fisio).
 *   - 7 usuarios en auth.users: 5 del seed base en supabase/seed.sql (admin@demo.local,
 *     entrenador@demo.local, fisio@demo.local, paciente@demo.local, paciente2@demo.local)
 *     y 2 pacientes de demostración creados por scripts/seed-progress-demo.ts
 *     (laura.perez.demo@demo.local y marcos.rojas.demo@demo.local).
 *
 * Uso:
 *   node scripts/check-db-clean.mjs         # Solo diagnostica. Exit 0 si limpia, 1 si sucia.
 *   node scripts/check-db-clean.mjs --fix   # Limpia huérfanos en orden y valida estado final.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const isFixMode = process.argv.includes("--fix");

// --- 1. Lectura y protección de usuarios oficiales de las semillas ----------

/**
 * Lista blanca de seguridad inviolable.
 * NINGUNO de estos correos puede ser borrado bajo ninguna circunstancia.
 */
const HARDCODED_OFFICIAL_EMAILS = new Set([
  "admin@demo.local",
  "entrenador@demo.local",
  "fisio@demo.local",
  "paciente@demo.local",
  "paciente2@demo.local",
  "laura.perez.demo@demo.local",
  "marcos.rojas.demo@demo.local",
]);

function extractOfficialEmails() {
  const emails = new Set(HARDCODED_OFFICIAL_EMAILS);

  // Leer supabase/seed.sql
  const seedSqlPath = path.join(rootDir, "supabase", "seed.sql");
  if (fs.existsSync(seedSqlPath)) {
    const content = fs.readFileSync(seedSqlPath, "utf8");
    const matches = content.matchAll(/"email":\s*"([^"]+)"/g);
    for (const match of matches) {
      emails.add(match[1]);
    }
  }

  // Leer scripts/seed-progress-demo.ts
  const demoSeedPath = path.join(rootDir, "scripts", "seed-progress-demo.ts");
  if (fs.existsSync(demoSeedPath)) {
    const content = fs.readFileSync(demoSeedPath, "utf8");
    const matches = content.matchAll(/email:\s*"([^"]+)"/g);
    for (const match of matches) {
      emails.add(match[1]);
    }
  }

  return emails;
}

const OFFICIAL_EMAILS = extractOfficialEmails();

// --- 2. Comunicación con PostgreSQL vía Docker -------------------------------

const DOCKER_CONTAINER = "supabase_db_plataforma-fisio-training";

function sql(query) {
  try {
    return execFileSync(
      "docker",
      [
        "exec",
        DOCKER_CONTAINER,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-Atc",
        query,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr).trim() : "";
    throw new Error(
      `No se pudo ejecutar la consulta en Postgres (${DOCKER_CONTAINER}): ${stderr || error.message}`,
    );
  }
}

function verifySupabaseRunning() {
  try {
    const result = execFileSync(
      "docker",
      ["ps", "--filter", `name=${DOCKER_CONTAINER}`, "--format", "{{.Names}}"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
    if (!result.includes(DOCKER_CONTAINER)) {
      console.error(
        `\x1b[31m✗ El contenedor ${DOCKER_CONTAINER} no está corriendo.\x1b[0m`,
      );
      console.error(
        "  Ejecuta 'npm run db:start' para iniciar Supabase antes de comprobar el estado.",
      );
      process.exit(2);
    }
  } catch {
    console.error(
      "\x1b[31m✗ Docker no está respondiendo o no está en marcha.\x1b[0m",
    );
    console.error("  Asegúrate de que Docker Desktop / Colima esté iniciado.");
    process.exit(2);
  }
}

// --- 3. Diagnóstico del estado de la base ------------------------------------

const BASE_EXPECTED = {
  exercises: 867, // Semilla de free-exercise-db (scripts/seed-exercises.ts)
  customExercises: 0, // 0 ejercicios propios; el catálogo inicial no tiene personalizados
  alerts: 3, // 3 alertas para admin, Beto y Carla por la membresía de Marcos Rojas
  users: 7, // 5 de seed.sql + 2 de seed-progress-demo.ts
};

function getCounts() {
  const query = `
    select (select count(*) from public.exercises),
           (select count(*) from public.exercises where is_custom),
           (select count(*) from public.alerts),
           (select count(*) from auth.users);
  `;
  const raw = sql(query).trim();
  const [exercises, customExercises, alerts, users] = raw
    .split("|")
    .map((n) => Number(n.trim()));
  return { exercises, customExercises, alerts, users };
}

function findOrphanUsers() {
  const raw = sql(
    "select id, email, created_at from auth.users order by created_at;",
  ).trim();
  if (!raw) return [];
  const lines = raw.split("\n").filter(Boolean);
  const orphans = [];
  for (const line of lines) {
    const [id, email, createdAt] = line.split("|");
    if (!OFFICIAL_EMAILS.has(email)) {
      orphans.push({ id: id.trim(), email: email.trim(), createdAt: createdAt?.trim() });
    }
  }
  return orphans;
}

function findCustomExercises() {
  const raw = sql(
    "select id, name, is_custom from public.exercises where is_custom = true order by created_at desc;",
  ).trim();
  if (!raw) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, name] = line.split("|");
      return { id: id.trim(), name: name.trim() };
    });
}

function findOrphanAlerts() {
  // Alertas que no pertenecen al caso oficial de Marcos Rojas demo
  const marcosId = sql(
    "select id from auth.users where email = 'marcos.rojas.demo@demo.local';",
  ).trim();
  const query = marcosId
    ? `select id, type, recipient_id, patient_id from public.alerts where patient_id != '${marcosId}' or type != 'membership_expiring';`
    : "select id, type, recipient_id, patient_id from public.alerts;";
  const raw = sql(query).trim();
  if (!raw) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, type, recipientId, patientId] = line.split("|");
      return { id: id.trim(), type: type.trim(), recipientId: recipientId.trim(), patientId: patientId.trim() };
    });
}

function getOrphanDetails(orphanUsers) {
  const details = [];
  for (const user of orphanUsers) {
    const routinesRaw = sql(
      `select id, name from public.routines where patient_id = '${user.id}';`,
    ).trim();
    const routines = routinesRaw
      ? routinesRaw.split("\n").map((r) => r.split("|")[1]?.trim() ?? r.trim())
      : [];

    const alertsCount = Number(
      sql(
        `select count(*) from public.alerts where patient_id = '${user.id}' or recipient_id = '${user.id}';`,
      ).trim() || 0,
    );

    details.push({
      ...user,
      routines,
      alertsCount,
    });
  }
  return details;
}

// --- 4. Limpieza con --fix ---------------------------------------------------

function cleanOrphans(orphanUsers, customExercises, orphanAlerts) {
  console.log("\n\x1b[1m▶ Limpiando fixtures huérfanos (--fix)\x1b[0m");

  // Salvaguarda explícita contra borrado accidental de usuarios oficiales
  for (const user of orphanUsers) {
    if (OFFICIAL_EMAILS.has(user.email)) {
      throw new Error(
        `SEGURIDAD: Se intentó borrar al usuario oficial ${user.email}. Operación abortada.`,
      );
    }
  }

  // 1. Borrar rutinas de usuarios huérfanos primero, luego el usuario de auth.users (cascada para perfiles, asignaciones, etc.)
  for (const user of orphanUsers) {
    console.log(
      `  • Borrando rutinas del usuario huérfano: ${user.email} (${user.id})`,
    );
    sql(`delete from public.routines where patient_id = '${user.id}';`);

    console.log(`  • Borrando usuario huérfano de auth.users: ${user.email}`);
    sql(`delete from auth.users where id = '${user.id}';`);
  }

  // 2. Borrar ejercicios personalizados huérfanos
  if (customExercises.length > 0) {
    console.log(
      `  • Borrando ${customExercises.length} ejercicio(s) personalizado(s) residuales (is_custom = true)...`,
    );
    sql("delete from public.exercises where is_custom = true;");
  }

  // 3. Borrar alertas huérfanas residuales
  if (orphanAlerts.length > 0) {
    console.log(
      `  • Borrando ${orphanAlerts.length} alerta(s) huérfana(s) no oficiales...`,
    );
    for (const alert of orphanAlerts) {
      sql(`delete from public.alerts where id = '${alert.id}';`);
    }
  }

  // 4. Limpiar membresías temporales residuales de tests si las hubiera
  sql(`
    delete from public.membership_notices where membership_id in
      (select id from public.memberships where notes like '%cron-%' or notes like '%pronto cron-%');
    delete from public.memberships where notes like '%cron-%' or notes like '%pronto cron-%';
    delete from public.plans where name like '%Plan cron-%';
  `);

  console.log("\x1b[32m✓ Limpieza completada.\x1b[0m\n");
}

// --- 5. Ejecución principal --------------------------------------------------

function main() {
  verifySupabaseRunning();

  const counts = getCounts();
  const orphanUsers = findOrphanUsers();
  const customExercises = findCustomExercises();
  const orphanAlerts = findOrphanAlerts();

  const isExactBase =
    counts.exercises === BASE_EXPECTED.exercises &&
    counts.customExercises === BASE_EXPECTED.customExercises &&
    counts.alerts === BASE_EXPECTED.alerts &&
    counts.users === BASE_EXPECTED.users;

  const hasOrphans =
    orphanUsers.length > 0 ||
    customExercises.length > 0 ||
    orphanAlerts.length > 0;

  if (isExactBase && !hasOrphans) {
    console.log("\x1b[32m✓ Base de datos limpia.\x1b[0m");
    console.log(
      `  Conteos: ${counts.exercises} ejercicios | ${counts.customExercises} personalizados | ${counts.alerts} alertas | ${counts.users} usuarios oficiales.`,
    );
    process.exit(0);
  }

  // Si hay anomalías o residuos:
  console.log(
    "\x1b[33m⚠ Estado de la base de datos local con desviaciones o residuos:\x1b[0m",
  );
  console.log(
    `  • Ejercicios: ${counts.exercises} (esperados: ${BASE_EXPECTED.exercises} del catálogo base seed-exercises.ts)`,
  );
  console.log(
    `  • Ejercicios personalizados: ${counts.customExercises} (esperados: ${BASE_EXPECTED.customExercises})`,
  );
  console.log(
    `  • Alertas: ${counts.alerts} (esperadas: ${BASE_EXPECTED.alerts} del demo Marcos Rojas)`,
  );
  console.log(
    `  • Usuarios auth: ${counts.users} (esperados: ${BASE_EXPECTED.users} oficiales)`,
  );

  if (orphanUsers.length > 0) {
    const details = getOrphanDetails(orphanUsers);
    console.log(
      `\n\x1b[31m✗ Se encontraron ${orphanUsers.length} usuario(s) huérfano(s):\x1b[0m`,
    );
    for (const u of details) {
      const extra = [];
      if (u.routines.length > 0)
        extra.push(`${u.routines.length} rutina(s) [${u.routines.join(", ")}]`);
      if (u.alertsCount > 0) extra.push(`${u.alertsCount} alerta(s)`);
      const extraStr = extra.length > 0 ? ` — tiene ${extra.join(", ")}` : "";
      console.log(`    - ${u.email} (id: ${u.id})${extraStr}`);
    }
  }

  if (customExercises.length > 0) {
    console.log(
      `\n\x1b[31m✗ Se encontraron ${customExercises.length} ejercicio(s) personalizado(s) residuales:\x1b[0m`,
    );
    for (const ex of customExercises) {
      console.log(`    - "${ex.name}" (id: ${ex.id})`);
    }
  }

  if (orphanAlerts.length > 0) {
    console.log(
      `\n\x1b[31m✗ Se encontraron ${orphanAlerts.length} alerta(s) huérfana(s) no oficiales:\x1b[0m`,
    );
    for (const al of orphanAlerts) {
      console.log(`    - Tipo: ${al.type} (id: ${al.id})`);
    }
  }

  if (isFixMode) {
    cleanOrphans(orphanUsers, customExercises, orphanAlerts);

    // Re-evaluar estado tras --fix
    const postCounts = getCounts();
    const postOrphans = findOrphanUsers();
    const postCustom = findCustomExercises();
    const postAlerts = findOrphanAlerts();

    const postClean =
      postCounts.exercises === BASE_EXPECTED.exercises &&
      postCounts.customExercises === BASE_EXPECTED.customExercises &&
      postCounts.alerts === BASE_EXPECTED.alerts &&
      postCounts.users === BASE_EXPECTED.users &&
      postOrphans.length === 0 &&
      postCustom.length === 0 &&
      postAlerts.length === 0;

    if (postClean) {
      console.log(
        "\x1b[32m✓ La base de datos ha quedado limpia tras aplicar --fix.\x1b[0m",
      );
      console.log(
        `  Conteos: ${postCounts.exercises} ejercicios | ${postCounts.customExercises} personalizados | ${postCounts.alerts} alertas | ${postCounts.users} usuarios oficiales.`,
      );
      process.exit(0);
    } else {
      console.error(
        "\x1b[31m✗ La base de datos aún tiene desviaciones tras aplicar --fix:\x1b[0m",
      );
      console.error(
        `  Conteos actuales: ${postCounts.exercises}|${postCounts.customExercises}|${postCounts.alerts}|${postCounts.users}`,
      );
      console.error(
        `  Esperados: ${BASE_EXPECTED.exercises}|${BASE_EXPECTED.customExercises}|${BASE_EXPECTED.alerts}|${BASE_EXPECTED.users}`,
      );
      process.exit(1);
    }
  } else {
    console.log(
      "\n\x1b[33mSugerencia: ejecuta 'node scripts/check-db-clean.mjs --fix' para sanear la base de datos.\x1b[0m",
    );
    process.exit(1);
  }
}

main();
