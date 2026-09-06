/**
 * Verifica el alta y la edición de ejercicios propios y el etiquetado clínico:
 * quién puede escribir el catálogo, qué rechaza la validación y qué impide RLS
 * cuando se salta la interfaz.
 *
 * Requiere Supabase local encendido y `npm run dev` en marcha. No necesita el
 * catálogo sembrado: crea sus propios ejercicios y los borra al terminar.
 *
 * Uso:  npm run test:catalog:custom
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { appUrl, decode, httpClient, sql, status } from "./helpers/auth-http.mjs";

const bucket = "exercise-media";

/** PNG de 1×1 real: el bucket comprueba el tipo declarado, no el contenido. */
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const imagen = (nombre = "movimiento.png") =>
  new File([pngBytes], nombre, { type: "image/png" });

const fichaValida = {
  description:
    "De pie, con los pies al ancho de las caderas, baja la cadera controlando el descenso y vuelve a subir sin bloquear las rodillas.",
  muscleGroups: ["glutes", "quadriceps"],
  equipment: ["bands"],
  environments: ["home"],
  difficulty: "beginner",
};

function locationOf(result) {
  const location =
    result.response.headers.get("location") ??
    result.html.match(
      /<meta[^>]*http-equiv="refresh"[^>]*content="[^;]*;url=([^"]+)"/,
    )?.[1];
  assert.ok(
    location,
    `Se esperaba una redirección, llegó ${result.response.status}`,
  );
  return new URL(decode(location), appUrl).pathname;
}

/** Reconstruye el cuerpo de un formulario ajeno: sus campos ocultos y nada más. */
function camposOcultos(html, marker) {
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
    .map((match) => match[0])
    .find((value) => value.includes(marker));
  assert.ok(form, `No se encontró el formulario ${marker}`);
  const body = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const attrs = Object.fromEntries(
      [...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [
        m[1],
        decode(m[2]),
      ]),
    );
    if (attrs.type === "hidden" && attrs.name)
      body.append(attrs.name, attrs.value ?? "");
  }
  return body;
}

const alerta = (html) =>
  decode(html.match(/role="alert"[^>]*>([^<]*)/)?.[1] ?? "");

test("Ejercicios propios y etiquetado clínico", { timeout: 180_000 }, async (t) => {
  const password = `Test-${crypto.randomUUID()}!`;
  const people = {};
  const ids = [];
  const creados = [];

  t.after(() => {
    for (const id of creados) {
      assert.match(id, /^[a-f0-9-]{36}$/);
      sql(`delete from public.exercises where id = '${id}'::uuid`);
    }
    for (const id of ids) {
      assert.match(id, /^[a-f0-9-]{36}$/);
      sql(`delete from auth.users where id = '${id}'::uuid`);
    }
  });

  for (const role of ["admin", "professional", "professional2", "patient"]) {
    const email = `custom-${role}-${crypto.randomUUID()}@demo.local`;
    const auth = createClient(status.API_URL, status.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await auth.auth.signUp({ email, password });
    assert.equal(result.error, null);
    const id = result.data.user.id;
    assert.match(id, /^[a-f0-9-]{36}$/);
    ids.push(id);
    if (role === "admin")
      sql(`update public.profiles set role = 'admin' where id = '${id}'`);
    if (role.startsWith("professional"))
      sql(
        `update public.profiles set role = 'professional', specialty = 'training' where id = '${id}'`,
      );
    await auth.auth.signOut();
    people[role] = { email, id };
  }

  async function signedInAs(role) {
    const client = httpClient();
    const result = await client.submit("/login", {
      email: people[role].email,
      password,
    });
    assert.ok(
      ["/admin", "/pro", "/patient"].includes(locationOf(result)),
      `No inició sesión como ${role}`,
    );
    return client;
  }

  const fila = (id, columna) =>
    sql(
      `select ${columna} from public.exercises where id = '${id}'::uuid`,
    ).trim();

  await t.test("El paciente no llega al alta ni a la ficha", async () => {
    const client = await signedInAs("patient");
    assert.match(locationOf(await client.request("/exercises/new")), /^\/patient/);
  });

  let ejercicioId;

  await t.test("El profesional crea un ejercicio propio con imagen", async () => {
    const client = await signedInAs("professional");
    const name = `Sentadilla con banda ${crypto.randomUUID()}`;
    const result = await client.submit(
      "/exercises/new",
      { ...fichaValida, name, contraindications: ["knee"], media: imagen() },
      'name="name"',
    );
    const destino = locationOf(result);
    assert.match(destino, /^\/exercises\/[0-9a-f-]{36}$/, alerta(result.html));

    ejercicioId = destino.split("/").pop();
    creados.push(ejercicioId);

    assert.equal(fila(ejercicioId, "name"), name);
    assert.equal(fila(ejercicioId, "is_custom"), "t");
    assert.equal(fila(ejercicioId, "contraindications"), "{knee}");
    assert.equal(fila(ejercicioId, "environments"), "{home}");
    assert.match(
      fila(ejercicioId, "media_url"),
      new RegExp(`/${bucket}/custom/[0-9a-f-]+\\.png$`),
      "La imagen debe quedar en el bucket propio, separada de las importadas",
    );

    const publica = await fetch(fila(ejercicioId, "media_url"));
    assert.equal(publica.status, 200, "La imagen subida no se sirve");
  });

  await t.test("Un ejercicio sin imagen se rechaza", async () => {
    const client = await signedInAs("professional");
    const name = `Sin imagen ${crypto.randomUUID()}`;
    const result = await client.submit(
      "/exercises/new",
      { ...fichaValida, name },
      'name="name"',
    );
    assert.equal(result.response.status, 200);
    assert.match(alerta(result.html), /imagen o un GIF/);
    assert.equal(
      sql(`select count(*) from public.exercises where name = '${name}'`).trim(),
      "0",
    );
  });

  await t.test("Un ejercicio sin grupo muscular se rechaza", async () => {
    const client = await signedInAs("professional");
    const name = `Sin músculo ${crypto.randomUUID()}`;
    const result = await client.submit(
      "/exercises/new",
      { ...fichaValida, name, muscleGroups: [], media: imagen() },
      'name="name"',
    );
    assert.match(alerta(result.html), /grupo muscular/);
    assert.equal(
      sql(`select count(*) from public.exercises where name = '${name}'`).trim(),
      "0",
    );
  });

  await t.test(
    "BACK-006 · el profesional edita el ejercicio propio que creó",
    async () => {
      const client = await signedInAs("professional");
      const { response, html } = await client.request(
        `/exercises/${ejercicioId}`,
      );
      assert.equal(response.status, 200);
      assert.ok(html.includes("Ejercicio propio del negocio"));
      assert.ok(
        html.includes("Guardar etiquetado clínico"),
        "El autor debe ver el formulario de etiquetado de su ejercicio",
      );
      assert.ok(
        !html.includes("Esta ficha es de solo lectura"),
        "El autor no debe ver el aviso de solo lectura",
      );

      const name = `Sentadilla del profesional ${crypto.randomUUID()}`;
      const result = await client.submit(
        `/exercises/${ejercicioId}`,
        { ...fichaValida, name, difficulty: "intermediate" },
        'name="name"',
      );
      assert.equal(result.response.status, 200);
      assert.ok(
        result.html.includes("Ejercicio actualizado"),
        alerta(result.html) || "No confirmó el guardado",
      );
      assert.equal(fila(ejercicioId, "name"), name);
      assert.equal(fila(ejercicioId, "difficulty"), "intermediate");
      assert.equal(
        fila(ejercicioId, "contraindications"),
        "{knee}",
        "Guardar la ficha no puede borrar el etiquetado clínico",
      );
    },
  );

  await t.test(
    "BACK-006 · otro profesional no edita un ejercicio ajeno",
    async () => {
      const otro = await signedInAs("professional2");
      const { html } = await otro.request(`/exercises/${ejercicioId}`);
      assert.ok(
        html.includes("Esta ficha es de solo lectura"),
        "Al profesional que no lo creó hay que decirle por qué no puede editar",
      );
      assert.ok(
        !html.includes("Guardar etiquetado clínico"),
        "Un profesional ajeno no debe ver el formulario de etiquetado",
      );

      const original = fila(ejercicioId, "name");
      // Se salta la interfaz: reenvía el formulario del admin con su sesión.
      const admin = await signedInAs("admin");
      const body = camposOcultos(
        (await admin.request(`/exercises/${ejercicioId}`)).html,
        'name="name"',
      );
      body.set("name", "Nombre cambiado sin permiso");
      body.set("description", fichaValida.description);
      body.set("muscleGroups", "glutes");
      body.set("equipment", "bands");
      body.set("environments", "home");
      body.set("difficulty", "beginner");
      const result = await otro.request(`/exercises/${ejercicioId}`, {
        method: "POST",
        body,
      });
      assert.equal(result.response.status, 200);
      assert.equal(fila(ejercicioId, "name"), original);

      // Contra la API directa: RLS tampoco deja tocar la fila ajena.
      const api = createClient(status.API_URL, status.ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const sesion = await api.auth.signInWithPassword({
        email: people.professional2.email,
        password,
      });
      assert.equal(sesion.error, null);
      const intento = await api
        .from("exercises")
        .update({ name: "Intervenido por API" })
        .eq("id", ejercicioId)
        .select("id");
      assert.equal(intento.error, null);
      assert.deepEqual(intento.data, [], "RLS no debe dejar tocar la fila ajena");
      assert.equal(fila(ejercicioId, "name"), original);
    },
  );

  await t.test("El admin edita la ficha y reemplaza la imagen", async () => {
    const client = await signedInAs("admin");
    const anterior = fila(ejercicioId, "media_url");
    const name = `Sentadilla revisada ${crypto.randomUUID()}`;
    const result = await client.submit(
      `/exercises/${ejercicioId}`,
      {
        ...fichaValida,
        name,
        environments: ["home", "gym"],
        difficulty: "intermediate",
        media: imagen("revisada.png"),
      },
      'name="name"',
    );
    assert.equal(result.response.status, 200);
    assert.ok(
      result.html.includes("Ejercicio actualizado"),
      alerta(result.html) || "No confirmó el guardado",
    );
    assert.equal(fila(ejercicioId, "name"), name);
    assert.equal(fila(ejercicioId, "environments"), "{home,gym}");
    assert.equal(fila(ejercicioId, "difficulty"), "intermediate");

    const actual = fila(ejercicioId, "media_url");
    assert.notEqual(actual, anterior, "La imagen no se reemplazó");
    assert.equal((await fetch(actual)).status, 200);
    assert.equal(
      (await fetch(anterior)).status,
      400,
      "La imagen reemplazada debe retirarse del bucket",
    );

    assert.equal(
      fila(ejercicioId, "contraindications"),
      "{knee}",
      "Guardar la ficha no puede borrar el etiquetado clínico",
    );
  });

  await t.test("El admin edita el etiquetado clínico", async () => {
    const client = await signedInAs("admin");
    const result = await client.submit(
      `/exercises/${ejercicioId}`,
      { contraindications: ["knee", "lower_back"] },
      "Guardar etiquetado clínico",
    );
    assert.ok(
      result.html.includes("Etiquetado clínico guardado"),
      alerta(result.html) || "No confirmó el guardado",
    );
    assert.equal(fila(ejercicioId, "contraindications"), "{knee,lower_back}");
  });

  await t.test("Una zona fuera del vocabulario se rechaza", async () => {
    const client = await signedInAs("admin");
    const result = await client.submit(
      `/exercises/${ejercicioId}`,
      { contraindications: ["rodilla"] },
      "Guardar etiquetado clínico",
    );
    assert.match(alerta(result.html), /vocabulario clínico/);
    assert.equal(
      fila(ejercicioId, "contraindications"),
      "{knee,lower_back}",
      "Un valor inválido no puede dejar el etiquetado a medias",
    );
  });

  await t.test("El etiquetado se puede vaciar a propósito", async () => {
    const client = await signedInAs("admin");
    const result = await client.submit(
      `/exercises/${ejercicioId}`,
      {},
      "Guardar etiquetado clínico",
    );
    assert.ok(result.html.includes("ya no tiene contraindicaciones"));
    assert.equal(fila(ejercicioId, "contraindications"), "{}");
    sql(
      `update public.exercises set contraindications = '{knee}' where id = '${ejercicioId}'::uuid`,
    );
  });

  await t.test(
    "Contra la API, el paciente no escribe el catálogo ni el bucket",
    async () => {
      const client = createClient(status.API_URL, status.ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const sesion = await client.auth.signInWithPassword({
        email: people.patient.email,
        password,
      });
      assert.equal(sesion.error, null);

      const alta = await client
        .from("exercises")
        .insert({ name: "Ejercicio del paciente", is_custom: true })
        .select("id");
      assert.ok(alta.error, "El paciente no puede crear ejercicios");

      const edicion = await client
        .from("exercises")
        .update({ name: "Ejercicio intervenido" })
        .eq("id", ejercicioId)
        .select("id");
      assert.equal(edicion.error, null);
      assert.deepEqual(edicion.data, [], "RLS no debe dejarle editar ninguno");

      const etiquetado = await client
        .from("exercises")
        .update({ contraindications: [] })
        .eq("id", ejercicioId)
        .select("id");
      assert.deepEqual(etiquetado.data, []);
      assert.equal(fila(ejercicioId, "contraindications"), "{knee}");

      const subida = await client.storage
        .from(bucket)
        .upload(`custom/${crypto.randomUUID()}.png`, pngBytes, {
          contentType: "image/png",
        });
      assert.ok(subida.error, "El paciente no puede subir al bucket");

      await client.auth.signOut();
    },
  );
});
