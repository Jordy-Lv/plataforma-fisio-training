/**
 * Verifica la sección 6 del slice 4: el job de vencimientos de membresías. Que
 * la ruta interna rechaza toda invocación sin el secreto compartido, que la
 * revisión marca las próximas a vencer y las vencidas y genera sus avisos y
 * alertas, que dos ejecuciones seguidas no duplican nada, que el plazo de aviso
 * es configurable, que el correo en español llega al buzón local y que el
 * paciente ve el aviso en su vista.
 *
 * Requiere Supabase local encendido con su semilla, `npm run dev` en marcha y
 * el entorno con CRON_SECRET y SMTP_URL (npm run db:env). Todo lo que crea
 * lleva una marca y se borra al terminar.
 *
 * Uso:  npm run test:memberships:cron
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { httpClient, sql } from "./helpers/auth-http.mjs";

const people = {
  admin: { email: "admin@demo.local" },
  professional: { email: "entrenador@demo.local" },
  patient: { email: "paciente@demo.local" },
};
const diego = "00000000-0000-4000-a000-000000000004";
const elena = "00000000-0000-4000-a000-000000000005";
const password = "demo1234";

const marca = `cron-${crypto.randomUUID().slice(0, 8)}`;
const secret = process.env.CRON_SECRET ?? "local-dev-cron-secret";
const appUrl = process.env.FISIO_TEST_APP_URL ?? "http://localhost:3000";
const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const cronPath = "/api/cron/memberships";

/**
 * Una fecha relativa a hoy en el formato de una columna `date`, anclada a la
 * zona del negocio. El RPC calcula `today_on` como
 * `(now() at time zone 'America/Bogota')::date`; si aquí se usa el día UTC, entre
 * las 19:00 y la medianoche de Bogotá (cuando UTC ya es el día siguiente) la
 * membresía "venció ayer" queda fechada hoy y el job la clasifica como próxima a
 * vencer en vez de vencida.
 */
const dateIn = (days) => {
  const bogotaToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
  }).format(new Date());
  const d = new Date(`${bogotaToday}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

/** Cuenta filas con una consulta `select count(*)`. */
const count = (query) => Number(sql(query).trim());

async function callCron({ authorization } = {}) {
  const headers = { "content-type": "application/json" };
  if (authorization) headers.authorization = authorization;
  const response = await fetch(new URL(cronPath, appUrl), {
    method: "POST",
    headers,
    body: "{}",
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
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

test("Job de vencimientos de membresías", { timeout: 180_000 }, async (t) => {
  sql(
    `insert into public.plans (name, price, billing_period)
     values ('Plan ${marca}', 130000, 'monthly')`,
  );
  const planId = sql(
    `select id from public.plans where name = 'Plan ${marca}'`,
  ).trim();

  // Diego: vence en 3 días (debe pasar a próxima a vencer).
  // Elena: venció ayer (debe pasar a vencida).
  // Diego (segunda): vence en 6 días — fuera del plazo por defecto de 4.
  sql(
    `insert into public.memberships (patient_id, plan_id, started_on, expires_on, status, amount, notes) values
       (${quote(diego)}::uuid, ${quote(planId)}::uuid, ${quote(dateIn(-27))}, ${quote(dateIn(3))},  'active', 130000, 'pronto ${marca}'),
       (${quote(elena)}::uuid, ${quote(planId)}::uuid, ${quote(dateIn(-40))}, ${quote(dateIn(-1))}, 'active', 130000, 'vencida ${marca}'),
       (${quote(diego)}::uuid, ${quote(planId)}::uuid, ${quote(dateIn(-20))}, ${quote(dateIn(6))},  'active', 130000, 'lejana ${marca}')`,
  );

  const originalNoticeDays = sql(
    `select value from public.alert_settings where key = 'membership_expiring_days'`,
  ).trim();

  t.after(() => {
    sql(`update public.alert_settings set value = ${originalNoticeDays} where key = 'membership_expiring_days'`);
    sql(
      `delete from public.alerts where type = 'membership_expiring'
         and (payload->>'membership_id')::uuid in
           (select id from public.memberships where notes like '%${marca}%')`,
    );
    sql(
      `delete from public.membership_notices where membership_id in
         (select id from public.memberships where notes like '%${marca}%')`,
    );
    sql(`delete from public.memberships where notes like '%${marca}%'`);
    sql(`delete from public.plans where name like '%${marca}%'`);
  });

  await t.test("Sin el secreto compartido la ruta no toca nada", async () => {
    const sinSecreto = await callCron();
    assert.equal(sinSecreto.status, 401, "Sin cabecera debe responder 401");

    const secretoMalo = await callCron({ authorization: "Bearer no-es-este" });
    assert.equal(secretoMalo.status, 401, "Con un secreto erróneo debe responder 401");

    const marcadas = count(
      `select count(*) from public.memberships
         where notes like '%${marca}%' and status <> 'active'`,
    );
    assert.equal(marcadas, 0, "Ninguna membresía debió cambiar de estado");
    const avisos = count(
      `select count(*) from public.membership_notices mn
         join public.memberships m on m.id = mn.membership_id
         where m.notes like '%${marca}%'`,
    );
    assert.equal(avisos, 0, "No debió generarse ningún aviso");
  });

  await t.test("Con el secreto marca estados y genera avisos y alertas", async () => {
    const { status: httpStatus, body } = await callCron({
      authorization: `Bearer ${secret}`,
    });
    assert.equal(httpStatus, 200);
    assert.equal(body.transitioned_expiring, 1, "Una próxima a vencer");
    assert.equal(body.transitioned_expired, 1, "Una vencida");

    assert.equal(
      sql(`select status from public.memberships where notes = 'pronto ${marca}'`).trim(),
      "expiring_soon",
    );
    assert.equal(
      sql(`select status from public.memberships where notes = 'vencida ${marca}'`).trim(),
      "expired",
    );
    assert.equal(
      sql(`select status from public.memberships where notes = 'lejana ${marca}'`).trim(),
      "active",
      "La que vence en 6 días queda fuera del plazo de 4",
    );

    const avisos = sql(
      `select mn.kind from public.membership_notices mn
         join public.memberships m on m.id = mn.membership_id
         where m.notes like '%${marca}%' order by mn.kind::text`,
    )
      .trim()
      .split("\n");
    assert.deepEqual(avisos, ["expired", "expiring_soon"]);

    // La de Diego alerta al admin y a sus dos profesionales; la de Elena, solo
    // al admin (nadie la atiende).
    const alertasAdmin = count(
      `select count(*) from public.alerts a
         join public.profiles p on p.id = a.recipient_id
         where a.type = 'membership_expiring' and p.role = 'admin'
           and (a.payload->>'membership_id')::uuid in
             (select id from public.memberships where notes like '%${marca}%')`,
    );
    assert.equal(alertasAdmin, 2, "El admin recibe una alerta por cada membresía");
    const alertasElenaProf = count(
      `select count(*) from public.alerts a
         join public.profiles p on p.id = a.recipient_id
         where a.type = 'membership_expiring' and p.role = 'professional'
           and (a.payload->>'membership_id')::uuid =
             (select id from public.memberships where notes = 'vencida ${marca}')`,
    );
    assert.equal(alertasElenaProf, 0, "Ningún profesional ve la membresía de Elena");
  });

  await t.test("Dos ejecuciones seguidas no duplican avisos ni alertas", async () => {
    const antesAvisos = count(
      `select count(*) from public.membership_notices mn
         join public.memberships m on m.id = mn.membership_id
         where m.notes like '%${marca}%'`,
    );
    const antesAlertas = count(
      `select count(*) from public.alerts a
         where a.type = 'membership_expiring'
           and (a.payload->>'membership_id')::uuid in
             (select id from public.memberships where notes like '%${marca}%')`,
    );

    const { body } = await callCron({ authorization: `Bearer ${secret}` });
    assert.equal(body.new_notices.length, 0, "La segunda pasada no emite avisos nuevos");
    assert.equal(body.transitioned_expiring + body.transitioned_expired, 0);

    assert.equal(
      count(
        `select count(*) from public.membership_notices mn
           join public.memberships m on m.id = mn.membership_id
           where m.notes like '%${marca}%'`,
      ),
      antesAvisos,
      "El número de avisos no cambia",
    );
    assert.equal(
      count(
        `select count(*) from public.alerts a
           where a.type = 'membership_expiring'
             and (a.payload->>'membership_id')::uuid in
               (select id from public.memberships where notes like '%${marca}%')`,
      ),
      antesAlertas,
      "El número de alertas no cambia",
    );
  });

  await t.test("El plazo de aviso es configurable", async () => {
    sql(`update public.alert_settings set value = 7 where key = 'membership_expiring_days'`);

    const { body } = await callCron({ authorization: `Bearer ${secret}` });
    assert.equal(body.notice_days, 7, "La revisión toma el nuevo plazo");
    assert.equal(body.transitioned_expiring, 1, "Ahora entra la que vence en 6 días");
    assert.equal(
      sql(`select status from public.memberships where notes = 'lejana ${marca}'`).trim(),
      "expiring_soon",
    );
  });

  await t.test("El aviso llega por correo en español", async () => {
    let reachable = true;
    try {
      await fetch(new URL("/api/v1/info", mailpitUrl));
    } catch {
      reachable = false;
    }
    if (!reachable) {
      t.diagnostic("Mailpit no responde; se omite la comprobación de correo.");
      return;
    }

    await fetch(new URL("/api/v1/messages", mailpitUrl), { method: "DELETE" });

    // Una membresía más, para provocar un aviso nuevo con su correo.
    sql(
      `insert into public.memberships (patient_id, plan_id, started_on, expires_on, status, amount, notes)
         values (${quote(diego)}::uuid, ${quote(planId)}::uuid, ${quote(dateIn(-25))}, ${quote(dateIn(2))}, 'active', 130000, 'correo ${marca}')`,
    );

    const { body } = await callCron({ authorization: `Bearer ${secret}` });
    assert.ok(body.emailSkipped === false, "El correo debe estar activo (SMTP_URL)");
    assert.ok(body.emailed >= 1, "Al menos un correo enviado");
    assert.deepEqual(body.emailErrors, [], "Sin errores de envío");

    const inboxResponse = await fetch(new URL("/api/v1/messages?limit=50", mailpitUrl));
    const inbox = await inboxResponse.json();
    const message = (inbox.messages ?? []).find((m) =>
      (m.To ?? []).some((addr) => addr.Address === "paciente@demo.local"),
    );
    assert.ok(message, "El correo de aviso aparece en el buzón local");
    assert.match(
      message.Subject,
      /membres[ií]a/i,
      "El asunto habla de la membresía",
    );
    assert.match(message.Subject, /vence/i, "El asunto menciona el vencimiento");

    assert.ok(
      sql(
        `select notified_at is not null from public.membership_notices mn
           join public.memberships m on m.id = mn.membership_id
           where m.notes = 'correo ${marca}'`,
      ).trim() === "t",
      "El aviso queda marcado como notificado",
    );
  });

  await t.test("El paciente ve el aviso en su vista", async () => {
    const patient = await screenAs("patient");
    const { html } = await patient.request("/memberships/me");
    const texto = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    assert.match(
      texto,
      /por vencer|est[aá] vencida/i,
      "La vista del paciente muestra el aviso de vencimiento",
    );
  });
});
