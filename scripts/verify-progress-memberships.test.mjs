/**
 * Verifica la sección 5 del slice 4: el control de mensualidades. Quién puede
 * escribirlas (solo `admin`), que el paciente consulta la suya y solo la suya
 * sin poder modificarla, que el profesional ve el estado de sus asignados y no
 * el de otros, y que el panel del administrador separa las próximas a vencer
 * de las vencidas.
 *
 * Requiere Supabase local encendido con su semilla y `npm run dev` en marcha.
 * Todo lo que crea lleva una marca y se borra al terminar.
 *
 * Uso:  npm run test:memberships
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
const elena = "00000000-0000-4000-a000-000000000005";
const password = "demo1234";

const marca = `membresia-${crypto.randomUUID().slice(0, 8)}`;

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

const textOf = (html) =>
  decode(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));

/** Una fecha relativa a hoy en el formato de una columna `date`. */
const dateIn = (days) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

test("Membresías: alta, consulta y aislamiento", { timeout: 180_000 }, async (t) => {
  sql(
    `insert into public.plans (name, price, billing_period)
     values ('Plan ${marca}', 100000, 'monthly')`,
  );
  const planId = sql(
    `select id from public.plans where name = 'Plan ${marca}'`,
  ).trim();

  t.after(() => {
    sql(`delete from public.memberships where notes like '%${marca}%'`);
    sql(`delete from public.plans where name like '%${marca}%'`);
  });

  await t.test("Solo el administrador registra y edita membresías", async () => {
    const admin = await apiAs("admin");
    const alta = await admin
      .from("memberships")
      .insert({
        patient_id: diego,
        plan_id: planId,
        started_on: dateIn(-10),
        expires_on: dateIn(20),
        amount: 100000,
        status: "active",
        notes: marca,
      })
      .select("id")
      .single();
    assert.equal(alta.error, null, "El admin debe poder registrar la membresía");

    const edicion = await admin
      .from("memberships")
      .update({ amount: 110000 })
      .eq("id", alta.data.id)
      .select("id");
    assert.equal(edicion.error, null, "El admin debe poder editarla");

    for (const role of ["professional", "patient"]) {
      const client = await apiAs(role);
      const intento = await client
        .from("memberships")
        .insert({
          patient_id: diego,
          plan_id: planId,
          started_on: dateIn(0),
          expires_on: dateIn(30),
          notes: `colado ${marca}`,
        })
        .select("id");
      assert.notEqual(intento.error, null, `RLS debe rechazar el alta de ${role}`);
    }
  });

  await t.test("El paciente consulta la suya y no puede modificarla", async () => {
    const patient = await apiAs("patient");
    const suyas = await patient
      .from("memberships")
      .select("id, patient_id, amount");
    assert.equal(suyas.error, null);
    assert.ok(suyas.data.length >= 1, "Diego lee su propia membresía");
    assert.deepEqual(
      [...new Set(suyas.data.map((row) => row.patient_id))],
      [diego],
      "No debe llegarle ninguna membresía de otro paciente",
    );

    const cambio = await patient
      .from("memberships")
      .update({ amount: 1 })
      .eq("id", suyas.data[0].id)
      .select("id");
    assert.equal(
      (cambio.data ?? []).length,
      0,
      "El paciente no puede modificar su membresía",
    );

    const pantalla = await screenAs("patient");
    const { html } = await pantalla.request("/memberships/me");
    const texto = textOf(html);
    assert.ok(texto.includes(`Plan ${marca}`), "Ve el nombre de su plan");
    assert.ok(texto.includes("Vencimiento"), "Ve su fecha de vencimiento");
  });

  await t.test("El profesional ve el estado de sus asignados y no el de otros", async () => {
    // Elena, a quien nadie atiende, con una membresía propia.
    sql(
      `insert into public.memberships (patient_id, plan_id, started_on, expires_on, amount, status, notes)
       values ('${elena}'::uuid, '${planId}'::uuid, '${dateIn(-5)}', '${dateIn(25)}', 100000, 'active', 'otra ${marca}')`,
    );

    const client = await apiAs("professional");
    const visibles = await client.from("memberships").select("patient_id");
    assert.equal(visibles.error, null);
    assert.ok(
      !visibles.data.some((row) => row.patient_id === elena),
      "Beto no debe ver la membresía de Elena",
    );

    const pantalla = await screenAs("professional");
    const { html } = await pantalla.request("/memberships");
    const texto = textOf(html);
    assert.ok(texto.includes("Diego"), "Ve a su paciente asignado");
    assert.ok(!texto.includes("Elena"), "No ve a un paciente que no atiende");
  });

  await t.test("El panel del administrador separa próximas a vencer y vencidas", async () => {
    sql(
      `insert into public.memberships (patient_id, plan_id, started_on, expires_on, amount, status, notes)
       values ('${diego}'::uuid, '${planId}'::uuid, '${dateIn(-40)}', '${dateIn(3)}', 100000, 'expiring_soon', 'pronto ${marca}'),
              ('${elena}'::uuid, '${planId}'::uuid, '${dateIn(-60)}', '${dateIn(-5)}', 100000, 'expired', 'vencida ${marca}')`,
    );

    const client = await screenAs("admin");
    const { html } = await client.request("/memberships");
    const texto = textOf(html);
    assert.ok(texto.includes("Próximas a vencer"), "Falta la sección de próximas a vencer");
    assert.ok(texto.includes("Vencidas"), "Falta la sección de vencidas");
    assert.ok(
      texto.includes("vence en 3 días"),
      "El plazo restante se muestra en la tarjeta",
    );
  });
});

/** El profesional Beto de `supabase/seed.sql`: un perfil que no es paciente. */
const beto = "00000000-0000-4000-a000-000000000002";

test("Membresías: la base rechaza datos imposibles (BACK-005)", { timeout: 120_000 }, async (t) => {
  sql(
    `insert into public.plans (name, price, billing_period, is_active)
     values ('Plan activo ${marca}', 100000, 'monthly', true),
            ('Plan inactivo ${marca}', 100000, 'monthly', false)`,
  );
  const planActivo = sql(
    `select id from public.plans where name = 'Plan activo ${marca}'`,
  ).trim();
  const planInactivo = sql(
    `select id from public.plans where name = 'Plan inactivo ${marca}'`,
  ).trim();

  t.after(() => {
    sql(`delete from public.memberships where notes like '%${marca}%'`);
    sql(`delete from public.plans where name like '%${marca}%'`);
  });

  const admin = await apiAs("admin");
  const base = {
    patient_id: diego,
    plan_id: planActivo,
    started_on: dateIn(-10),
    expires_on: dateIn(20),
    amount: 100000,
    status: "active",
    notes: marca,
  };
  const alta = (extra) =>
    admin.from("memberships").insert({ ...base, ...extra }).select("id");

  await t.test("Una membresía válida sí entra", async () => {
    const ok = await alta({ notes: `válida ${marca}` });
    assert.equal(ok.error, null, "La membresía correcta debe seguir funcionando");
  });

  await t.test("Monto negativo", async () => {
    assert.notEqual((await alta({ amount: -1, notes: `monto ${marca}` })).error, null);
  });

  await t.test("Vencimiento anterior al inicio", async () => {
    assert.notEqual(
      (await alta({ started_on: dateIn(20), expires_on: dateIn(-10), notes: `fechas ${marca}` }))
        .error,
      null,
    );
  });

  await t.test("Plan inactivo", async () => {
    assert.notEqual(
      (await alta({ plan_id: planInactivo, notes: `plan ${marca}` })).error,
      null,
    );
  });

  await t.test("Titular que no es paciente", async () => {
    assert.notEqual(
      (await alta({ patient_id: beto, notes: `titular ${marca}` })).error,
      null,
    );
  });
});
