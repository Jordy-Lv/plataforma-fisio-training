/**
 * Verifica el vídeo de YouTube de la ficha del ejercicio (change
 * add-exercise-video): qué enlaces acepta y cómo los normaliza, que la base
 * rechaza cualquier otra URL aunque se salte la interfaz, quién puede ponerlo
 * y que la ficha lo reproduce dentro sin enlazar a YouTube.
 *
 * Requiere Supabase local encendido y la aplicación en marcha en el 3000. No
 * necesita el catálogo sembrado: crea su propio ejercicio y lo borra al terminar.
 *
 * Uso:  npm run test:catalog:video
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { appUrl, decode, httpClient, sql, status } from "./helpers/auth-http.mjs";
import {
  canonicalYouTubeUrl,
  parseYouTubeUrl,
} from "../lib/catalog/youtube.ts";

const id = "dQw4w9WgXcQ";

test("Enlaces de YouTube: qué se acepta y cómo se guarda", () => {
  const casos = [
    [`https://www.youtube.com/watch?v=${id}`, `https://www.youtube.com/watch?v=${id}`],
    [`https://youtu.be/${id}?si=abc123`, `https://www.youtube.com/watch?v=${id}`],
    [`https://youtu.be/${id}?t=90`, `https://www.youtube.com/watch?v=${id}&t=90s`],
    [`https://m.youtube.com/watch?v=${id}&t=1m30s`, `https://www.youtube.com/watch?v=${id}&t=90s`],
    [`https://www.youtube.com/shorts/${id}`, `https://www.youtube.com/watch?v=${id}`],
    [`https://www.youtube.com/embed/${id}?start=15`, `https://www.youtube.com/watch?v=${id}&t=15s`],
    [`  https://www.youtube.com/watch?v=${id}&list=PL1  `, `https://www.youtube.com/watch?v=${id}`],
  ];
  for (const [entrada, esperado] of casos) {
    const video = parseYouTubeUrl(entrada);
    assert.ok(video, `Debería aceptar ${entrada}`);
    assert.equal(canonicalYouTubeUrl(video), esperado);
  }

  for (const entrada of [
    "https://vimeo.com/123456",
    `https://www.youtube.com.evil.example/watch?v=${id}`,
    "https://www.youtube.com/watch?v=corto",
    "https://www.youtube.com/@canal",
    `javascript:alert(1)//youtu.be/${id}`,
    "no es un enlace",
  ])
    assert.equal(parseYouTubeUrl(entrada), null, `Debería rechazar ${entrada}`);
});

function locationOf(result) {
  const location =
    result.response.headers.get("location") ??
    result.html.match(
      /<meta[^>]*http-equiv="refresh"[^>]*content="[^;]*;url=([^"]+)"/,
    )?.[1];
  assert.ok(location, `Se esperaba una redirección, llegó ${result.response.status}`);
  return new URL(decode(location), appUrl).pathname;
}

const alerta = (html) =>
  decode(html.match(/role="alert"[^>]*>([^<]*)/)?.[1] ?? "");

test("Vídeo de YouTube en la ficha del ejercicio", { timeout: 120_000 }, async (t) => {
  const password = `Test-${crypto.randomUUID()}!`;
  const people = {};
  const ids = [];
  const ejercicioId = sql(
    `with nuevo as (
       insert into public.exercises (name, description, is_custom)
       values ('Vídeo de prueba ${crypto.randomUUID()}', 'Ejercicio importado para la suite de vídeo.', false)
       returning id)
     select id from nuevo`,
  ).trim();
  assert.match(ejercicioId, /^[a-f0-9-]{36}$/);

  t.after(() => {
    sql(`delete from public.exercises where id = '${ejercicioId}'::uuid`);
    for (const personId of ids) {
      assert.match(personId, /^[a-f0-9-]{36}$/);
      sql(`delete from auth.users where id = '${personId}'::uuid`);
    }
  });

  for (const role of ["admin", "professional"]) {
    const email = `video-${role}-${crypto.randomUUID()}@demo.local`;
    const auth = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await auth.auth.signUp({ email, password });
    assert.equal(result.error, null);
    const personId = result.data.user.id;
    ids.push(personId);
    sql(
      role === "admin"
        ? `update public.profiles set role = 'admin' where id = '${personId}'`
        : `update public.profiles set role = 'professional', specialty = 'physio' where id = '${personId}'`,
    );
    await auth.auth.signOut();
    people[role] = { email, id: personId };
  }

  async function signedInAs(role) {
    const client = httpClient();
    const result = await client.submit("/login", { email: people[role].email, password });
    assert.ok(["/admin", "/pro"].includes(locationOf(result)), `No inició sesión como ${role}`);
    return client;
  }

  const videoGuardado = () =>
    sql(`select coalesce(video_url, '') from public.exercises where id = '${ejercicioId}'::uuid`).trim();

  await t.test("El admin pone un vídeo a un ejercicio importado y se normaliza", async () => {
    const client = await signedInAs("admin");
    const result = await client.submit(
      `/exercises/${ejercicioId}`,
      { id: ejercicioId, videoUrl: `https://youtu.be/${id}?t=45` },
      'name="videoUrl"',
    );
    assert.equal(result.response.status, 200);
    assert.equal(videoGuardado(), `https://www.youtube.com/watch?v=${id}&t=45s`, alerta(result.html));
  });

  await t.test("La ficha reproduce el vídeo dentro, sin enlazar a YouTube", async () => {
    const client = await signedInAs("admin");
    const { response, html } = await client.request(`/exercises/${ejercicioId}`);
    assert.equal(response.status, 200);
    assert.match(html, /aria-label="Reproducir el vídeo de /);
    assert.match(html, new RegExp(`i\\.ytimg\\.com/vi/${id}/`));
    assert.doesNotMatch(html, /<a\b[^>]*href="https:\/\/(www\.)?youtu/, "No debe haber enlaces que saquen a YouTube");
    const csp = response.headers.get("content-security-policy") ?? "";
    assert.match(csp, /frame-src https:\/\/www\.youtube-nocookie\.com/);
  });

  await t.test("Un enlace que no es de YouTube se rechaza y no cambia nada", async () => {
    const client = await signedInAs("admin");
    const result = await client.submit(
      `/exercises/${ejercicioId}`,
      { id: ejercicioId, videoUrl: "https://vimeo.com/123456" },
      'name="videoUrl"',
    );
    assert.match(alerta(result.html), /enlace de YouTube/);
    assert.equal(videoGuardado(), `https://www.youtube.com/watch?v=${id}&t=45s`);
  });

  await t.test("La base rechaza una URL ajena aunque se salte la interfaz", () => {
    assert.throws(() =>
      sql(`update public.exercises set video_url = 'https://evil.example/x' where id = '${ejercicioId}'::uuid`),
    );
    assert.equal(videoGuardado(), `https://www.youtube.com/watch?v=${id}&t=45s`);
  });

  await t.test("El profesional no cambia el vídeo de un ejercicio importado", async () => {
    const client = await signedInAs("professional");
    const { html } = await client.request(`/exercises/${ejercicioId}`);
    assert.doesNotMatch(html, /name="videoUrl"/, "No debe ver el formulario");
    assert.match(html, /aria-label="Reproducir el vídeo de /, "Sí debe poder verlo");

    const api = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await api.auth.signInWithPassword({ email: people.professional.email, password });
    const { data } = await api
      .from("exercises")
      .update({ video_url: null })
      .eq("id", ejercicioId)
      .select("id");
    assert.deepEqual(data, []);
    assert.equal(videoGuardado(), `https://www.youtube.com/watch?v=${id}&t=45s`);
  });

  await t.test("Dejar el campo vacío quita el vídeo", async () => {
    const client = await signedInAs("admin");
    const result = await client.submit(
      `/exercises/${ejercicioId}`,
      { id: ejercicioId, videoUrl: "" },
      'name="videoUrl"',
    );
    assert.equal(result.response.status, 200);
    assert.equal(videoGuardado(), "", alerta(result.html));
  });
});
