/**
 * Verifica la sección 4 del slice 4: la vitrina de planes y servicios y su
 * control administrativo. Quién puede definirlos (solo `admin`), que un plan o
 * un servicio desactivado sale de la vitrina, y que desactivar un plan no
 * rompe las membresías que lo referencian.
 *
 * Requiere Supabase local encendido con su semilla y `npm run dev` en marcha.
 * Todo lo que crea lleva una marca y se borra al terminar.
 *
 * Uso:  npm run test:plans
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { decode, httpClient, sql, status } from "./helpers/auth-http.mjs";

const people = {
  admin: { email: "admin@demo.local" },
  professional: { email: "entrenador@demo.local" },
  patient: { email: "paciente@demo.local" },
};
const diego = "00000000-0000-4000-a000-000000000004";
const password = "demo1234";

/** Distingue las filas de esta ejecución de cualquier otra. */
const marca = `oferta-${crypto.randomUUID().slice(0, 8)}`;

const api = () =>
  createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function apiAs(role) {
  const client = api();
  const result = await client.auth.signInWithPassword({
    email: people[role].email,
    password,
  });
  assert.equal(result.error, null, `No inició sesión como ${role}`);
  return client;
}

async function screenAs(role) {
  const client = httpClient();
  const result = await client.request("/login");
  void result;
  const login = await client.submit("/login", {
    email: people[role].email,
    password,
  });
  assert.ok(
    login.response.headers.get("location"),
    `No inició sesión como ${role}`,
  );
  return client;
}

/** El texto plano de una respuesta, sin etiquetas, para buscar nombres. */
const textOf = (html) =>
  decode(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));

test("Planes y servicios: vitrina y control", { timeout: 180_000 }, async (t) => {
  t.after(() => {
    sql(`delete from public.memberships where notes like '%${marca}%'`);
    sql(`delete from public.plans where name like '%${marca}%'`);
    sql(`delete from public.services where name like '%${marca}%'`);
  });

  await t.test("Solo el administrador define planes", async () => {
    const admin = await apiAs("admin");
    const creado = await admin
      .from("plans")
      .insert({
        name: `Plan mensual ${marca}`,
        price: 120000,
        billing_period: "monthly",
        features: ["Sala libre", "Una valoración al mes"],
      })
      .select("id")
      .single();
    assert.equal(creado.error, null, "El admin debe poder crear un plan");

    for (const role of ["professional", "patient"]) {
      const client = await apiAs(role);
      const alta = await client
        .from("plans")
        .insert({ name: `Colado ${marca}`, price: 1, billing_period: "monthly" })
        .select("id");
      assert.notEqual(alta.error, null, `RLS debe rechazar el alta de ${role}`);
    }
    assert.equal(
      sql(`select count(*) from public.plans where name like '%${marca}%'`).trim(),
      "1",
      "Solo debe existir el plan que creó el administrador",
    );
  });

  await t.test("Solo el administrador define servicios adicionales", async () => {
    const admin = await apiAs("admin");
    const creado = await admin
      .from("services")
      .insert({
        name: `Nutrición ${marca}`,
        category: "nutrition",
        description: "Plan de alimentación mensual",
      })
      .select("id")
      .single();
    assert.equal(creado.error, null, "El admin debe poder crear un servicio");

    const pro = await apiAs("professional");
    const alta = await pro
      .from("services")
      .insert({ name: `Colado ${marca}`, category: "physio" })
      .select("id");
    assert.notEqual(alta.error, null, "RLS debe rechazar el alta del profesional");
  });

  await t.test(
    "BACK-011 · el servicio lleva precio y la base rechaza uno negativo",
    async () => {
      const admin = await apiAs("admin");
      const negativo = await admin
        .from("services")
        .insert({
          name: `Precio inválido ${marca}`,
          category: "workshop",
          price: -1,
        })
        .select("id");
      assert.notEqual(
        negativo.error,
        null,
        "La constraint debe rechazar un precio negativo",
      );

      const valido = await admin
        .from("services")
        .insert({
          name: `Servicio con precio ${marca}`,
          category: "physio",
          price: 47000,
        })
        .select("id")
        .single();
      assert.equal(valido.error, null);

      const client = await screenAs("patient");
      const texto = textOf((await client.request("/offer")).html);
      assert.ok(
        texto.includes(`Servicio con precio ${marca}`),
        "El servicio activo aparece en la vitrina",
      );
      assert.ok(
        texto.includes("47.000"),
        "La vitrina muestra el precio del servicio con separador de miles",
      );
    },
  );

  await t.test("La vitrina muestra lo activo y esconde lo inactivo", async () => {
    // Un plan activo y otro inactivo, ambos de esta ejecución.
    sql(
      `insert into public.plans (name, price, billing_period, is_active)
       values ('Plan visible ${marca}', 90000, 'monthly', true),
              ('Plan oculto ${marca}', 80000, 'monthly', false)`,
    );

    const client = await screenAs("patient");
    const { html } = await client.request("/offer");
    const texto = textOf(html);
    assert.ok(
      texto.includes(`Plan visible ${marca}`),
      "El plan activo debe verse en la vitrina",
    );
    assert.ok(
      !texto.includes(`Plan oculto ${marca}`),
      "El plan inactivo no debe verse en la vitrina",
    );
    assert.ok(
      texto.includes("90.000"),
      "El precio se muestra con separador de miles",
    );
  });

  await t.test(
    "Desactivar un plan lo saca de la vitrina y no toca sus membresías",
    async () => {
      const planId = sql(
        `select id from public.plans where name = 'Plan visible ${marca}'`,
      ).trim();

      // Una membresía de Diego con ese plan, escrita saltándose la aplicación.
      sql(
        `insert into public.memberships (patient_id, plan_id, expires_on, amount, notes)
         values ('${diego}'::uuid, '${planId}'::uuid, current_date + 20, 90000, '${marca}')`,
      );

      // El admin lo desactiva por la interfaz.
      const admin = await apiAs("admin");
      const apagado = await admin
        .from("plans")
        .update({ is_active: false })
        .eq("id", planId)
        .select("id")
        .single();
      assert.equal(apagado.error, null, "El admin debe poder desactivar el plan");

      const client = await screenAs("patient");
      const { html } = await client.request("/offer");
      assert.ok(
        !textOf(html).includes(`Plan visible ${marca}`),
        "El plan desactivado ya no debe aparecer en la vitrina",
      );

      // La membresía sigue en pie y el paciente la consulta.
      const patient = await apiAs("patient");
      const suya = await patient
        .from("memberships")
        .select("id, plan_id, expires_on")
        .eq("notes", marca);
      assert.equal(suya.error, null);
      assert.equal(
        suya.data.length,
        1,
        "La membresía que referencia al plan desactivado sigue funcionando",
      );
      assert.equal(suya.data[0].plan_id, planId);
    },
  );

  await t.test("Un plan con membresías no se puede eliminar", async () => {
    const planId = sql(
      `select id from public.plans where name = 'Plan visible ${marca}'`,
    ).trim();
    const admin = await apiAs("admin");
    const borrado = await admin.from("plans").delete().eq("id", planId).select("id");
    assert.notEqual(
      borrado.error,
      null,
      "Borrar un plan con membresías debe fallar por la clave foránea",
    );
    assert.equal(borrado.error.code, "23503");
  });
});
