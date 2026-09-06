// Tarea 1.1 del slice 2: el bucket exercise-media y sus políticas.
//
// Se comprueba contra la API de Storage, no contra la base: lo que importa es
// que la imagen que sube el equipo se sirva a un paciente sin sesión y que
// nadie fuera del equipo pueda escribir en el bucket. Requiere Supabase local
// encendido y la semilla aplicada (`npm run db:reset`).
//
// QA backend · BACK-007: el profesional solo administra objetos propios y solo
// bajo `custom/`; cualquier otro prefijo es del admin.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = fileURLToPath(new URL("../", import.meta.url));

const BUCKET = "exercise-media";
const RUTA = `custom/pixel-${crypto.randomUUID()}.png`;
const RUTA_AJENA = `custom/ajeno-${crypto.randomUUID()}.png`;

// PNG de 1x1 transparente: basta para comprobar el camino completo de subida
// y de entrega sin arrastrar un archivo binario al repositorio.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
// Otro contenido, para distinguir un sobrescrito de lo original.
const OTRO = Buffer.from(
  "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64",
);

test("El contenido visual del catálogo se sirve públicamente y solo lo escribe su dueño", { timeout: 120_000 }, async (t) => {
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
  const carla = await sesion("fisio@demo.local");
  const diego = await sesion("paciente@demo.local");
  const ana = await sesion("admin@demo.local");

  t.after(async () => {
    await ana.storage.from(BUCKET).remove([RUTA, RUTA_AJENA, "imported/beto.png", "imported/ana.png"]);
  });

  await t.test("un profesional sube una imagen propia bajo custom/", async () => {
    const { error } = await beto.storage
      .from(BUCKET)
      .upload(RUTA, PIXEL, { contentType: "image/png", upsert: true });
    assert.equal(error, null, `el profesional debe poder subir su contenido: ${error?.message}`);
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
      .upload(`custom/paciente-${crypto.randomUUID()}.png`, PIXEL, { contentType: "image/png" });
    assert.notEqual(error, null, "el catálogo lo escribe el equipo, no el paciente");
  });

  await t.test("un profesional no sobrescribe el objeto de otro (BACK-007)", async () => {
    const alta = await ana.storage
      .from(BUCKET)
      .upload(RUTA_AJENA, PIXEL, { contentType: "image/png" });
    assert.equal(alta.error, null, `preparación: el admin sube el objeto ajeno: ${alta.error?.message}`);

    const intento = await carla.storage
      .from(BUCKET)
      .upload(RUTA_AJENA, OTRO, { contentType: "image/gif", upsert: true });
    assert.notEqual(intento.error, null, "otro profesional no debe poder cambiar los bytes");

    const bytes = Buffer.from(
      await fetch(anonimo.storage.from(BUCKET).getPublicUrl(RUTA_AJENA).data.publicUrl).then((r) =>
        r.arrayBuffer(),
      ),
    );
    assert.deepEqual(bytes, PIXEL, "el contenido original debe quedar intacto");
  });

  await t.test("un profesional no escribe fuera de custom/ (BACK-007)", async () => {
    const { error } = await beto.storage
      .from(BUCKET)
      .upload("imported/beto.png", PIXEL, { contentType: "image/png" });
    assert.notEqual(error, null, "el prefijo `imported/` está reservado al admin");
  });

  await t.test("el admin sí escribe en cualquier prefijo", async () => {
    const { error } = await ana.storage
      .from(BUCKET)
      .upload("imported/ana.png", PIXEL, { contentType: "image/png" });
    assert.equal(error, null, `el admin gestiona todo el bucket: ${error?.message}`);
  });

  await t.test("el profesional borra su propio objeto de custom/ (BACK-007)", async () => {
    const { error } = await beto.storage.from(BUCKET).remove([RUTA]);
    assert.equal(error, null, `el dueño limpia su propia subida: ${error?.message}`);
    const respuesta = await fetch(anonimo.storage.from(BUCKET).getPublicUrl(RUTA).data.publicUrl);
    assert.notEqual(respuesta.status, 200, "el objeto propio debe quedar borrado");
  });

  await t.test("un profesional no borra el objeto de otro", async () => {
    await carla.storage.from(BUCKET).remove([RUTA_AJENA]);
    const respuesta = await fetch(anonimo.storage.from(BUCKET).getPublicUrl(RUTA_AJENA).data.publicUrl);
    assert.equal(respuesta.status, 200, "borrar el objeto ajeno debe fallar en silencio y no afectarlo");
  });
});
