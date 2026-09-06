// Regresión de BACK-001: un JWT emitido antes de una baja no debe conservar
// acceso a PostgREST. Se firma como un paciente sembrado, se le da de baja por
// SQL (equivale a `deactivate_person` sin el RPC) y se comprueba que el mismo
// cliente —con el token anterior— ya no lee ni escribe lo suyo. `t.after` lo
// reactiva para no ensuciar la semilla.
//
// El lado del profesional inactivo (crear ejercicio, subir a Storage) lo cubre
// el cambio de `current_role()`, que devuelve NULL para un usuario inactivo, y
// lo ejercitan de rebote `test:catalog:custom` y `test:storage` con un
// profesional activo. Requiere `npm run db:reset` + semilla.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = fileURLToPath(new URL("../", import.meta.url));

// Diego: paciente sembrado, asignado pero sin rutina ni datos clínicos.
const DIEGO = "00000000-0000-4000-a000-000000000004";
const CONTENEDOR = "supabase_db_plataforma-fisio-training";

function sql(consulta) {
  return execFileSync(
    "docker",
    ["exec", CONTENEDOR, "psql", "-U", "postgres", "-d", "postgres", "-tA", "-v", "ON_ERROR_STOP=1", "-c", consulta],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

test("BACK-001 — la baja revoca el acceso del token ya emitido", { timeout: 120_000 }, async (t) => {
  const status = JSON.parse(
    execFileSync(path.join(root, "node_modules/.bin/supabase"), ["status", "--output", "json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname));

  const diego = createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: loginError } = await diego.auth.signInWithPassword({
    email: "paciente@demo.local",
    password: "demo1234",
  });
  assert.equal(loginError, null, `no se pudo iniciar sesión: ${loginError?.message}`);

  t.after(() => sql(`update public.profiles set is_active = true where id = '${DIEGO}';`));

  // Control positivo: mientras está activo, ve su perfil.
  const antes = await diego.from("profiles").select("id, full_name").eq("id", DIEGO);
  assert.equal(antes.error, null);
  assert.equal(antes.data.length, 1, "estando activo, Diego debe ver su perfil");

  // Baja: solo se toca `is_active`; el token de Diego sigue vigente.
  sql(`update public.profiles set is_active = false where id = '${DIEGO}';`);

  await t.test("ya no lee su propio perfil", async () => {
    const { data, error } = await diego.from("profiles").select("id").eq("id", DIEGO);
    assert.equal(error, null);
    assert.equal(data.length, 0);
  });

  await t.test("ya no lee sus datos de paciente", async () => {
    const { data, error } = await diego
      .from("patient_details")
      .select("profile_id")
      .eq("profile_id", DIEGO);
    assert.equal(error, null);
    assert.equal(data.length, 0);
  });

  await t.test("ya no edita su propio perfil", async () => {
    const { data, error } = await diego
      .from("profiles")
      .update({ full_name: "Cambiado tras la baja" })
      .eq("id", DIEGO)
      .select("id");
    assert.equal(error, null); // RLS no da error: filtra las filas.
    assert.equal(data?.length ?? 0, 0);
    const guardado = sql(`select full_name from public.profiles where id = '${DIEGO}';`);
    assert.notEqual(guardado, "Cambiado tras la baja");
  });
});
