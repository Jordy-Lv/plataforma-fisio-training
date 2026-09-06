// Tarea 1.1 del slice 2: el bucket exercise-media y sus políticas.
//
// Se comprueba contra la API de Storage, no contra la base: lo que importa es
// que la imagen que sube el equipo se sirva a un paciente sin sesión y que
// nadie fuera del equipo pueda escribir en el bucket. Requiere Supabase local
// encendido y la semilla aplicada (`npm run db:reset`).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = fileURLToPath(new URL("../", import.meta.url));

const BUCKET = "exercise-media";
const RUTA = "verificacion/pixel.png";

// PNG de 1x1 transparente: basta para comprobar el camino completo de subida
// y de entrega sin arrastrar un archivo binario al repositorio.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("El contenido visual del catálogo se sirve públicamente y solo lo escribe el equipo", { timeout: 120_000 }, async (t) => {
  const status = JSON.parse(
    execFileSync(path.join(root, "node_modules/.bin/supabase"), ["status", "--output", "json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname));

  const sesion = async (email) => {
    const cliente = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await cliente.auth.signInWithPassword({ email, password: "demo1234" });
    assert.equal(error, null, `no se pudo iniciar sesión como ${email}: ${error?.message}`);
    return cliente;
  };

  const anonimo = createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const beto = await sesion("entrenador@demo.local");
  const diego = await sesion("paciente@demo.local");
  const ana = await sesion("admin@demo.local");

  t.after(async () => {
    await ana.storage.from(BUCKET).remove([RUTA]);
  });

  await t.test("un profesional sube una imagen del catálogo", async () => {
    const { error } = await beto.storage
      .from(BUCKET)
      .upload(RUTA, PIXEL, { contentType: "image/png", upsert: true });
    assert.equal(error, null, `el equipo debe poder subir contenido: ${error?.message}`);
  });

  await t.test("la imagen se sirve sin sesión", async () => {
    const { data } = anonimo.storage.from(BUCKET).getPublicUrl(RUTA);
    const respuesta = await fetch(data.publicUrl);
    assert.equal(respuesta.status, 200, "el paciente abre la imagen desde el teléfono, sin URL firmada");
    assert.equal(respuesta.headers.get("content-type"), "image/png");
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    assert.deepEqual(bytes, PIXEL, "lo que se sirve debe ser lo que se subió");
  });

  await t.test("un paciente no puede subir contenido", async () => {
    const { error } = await diego.storage
      .from(BUCKET)
      .upload("verificacion/paciente.png", PIXEL, { contentType: "image/png" });
    assert.notEqual(error, null, "el catálogo lo escribe el equipo, no el paciente");
  });

  await t.test("un paciente no puede borrar contenido", async () => {
    await diego.storage.from(BUCKET).remove([RUTA]);
    const { data } = anonimo.storage.from(BUCKET).getPublicUrl(RUTA);
    const respuesta = await fetch(data.publicUrl);
    assert.equal(respuesta.status, 200, "borrar una imagen deja sin contenido visual a las rutinas asignadas");
  });

  await t.test("un profesional tampoco borra: el borrado es del admin", async () => {
    await beto.storage.from(BUCKET).remove([RUTA]);
    const { data } = anonimo.storage.from(BUCKET).getPublicUrl(RUTA);
    assert.equal((await fetch(data.publicUrl)).status, 200);
  });
});
