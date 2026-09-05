import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import {
  status,
  sql,
  httpClient,
  expectRedirect,
} from "./helpers/auth-http.mjs";

const api = () =>
  createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const password = `Test-${crypto.randomUUID()}!`;
const condition = {
  body_part: "knee",
  severity: "moderate",
  notes: "Molestia al bajar escaleras",
};

async function login(email, pass = password) {
  const client = api();
  const result = await client.auth.signInWithPassword({
    email,
    password: pass,
  });
  assert.equal(result.error, null);
  return client;
}

async function createAuthorized(actor, role, specialty = null) {
  const email = `people-${crypto.randomUUID()}@demo.local`;
  const reservation = await actor.rpc("prepare_person_registration", {
    person_email: email,
    person_name: `Prueba ${role}`,
    person_phone: "3001234567",
    person_role: role,
    person_specialty: specialty,
  });
  assert.equal(reservation.error, null);
  const client = api();
  const signup = await client.auth.signUp({
    email,
    password,
    options: { data: { registration_token: reservation.data, role: "admin" } },
  });
  assert.equal(signup.error, null);
  return { id: signup.data.user.id, email, client, token: reservation.data };
}

test(
  "Personas y onboarding contra Next.js y la API local",
  { timeout: 180_000 },
  async (t) => {
    const ids = [];
    const admin = await login("admin@demo.local", "demo1234");
    const outsider = await login("entrenador@demo.local", "demo1234");
    t.after(() => {
      for (const id of ids.reverse()) {
        assert.match(id, /^[a-f0-9-]{36}$/);
        sql(
          `delete from public.person_registrations where created_by = '${id}'; delete from auth.users where id = '${id}'`,
        );
      }
    });
    let pro, patient;

    await t.test(
      "Admin crea profesional, quien inicia sesión y crea paciente con vínculo automático",
      async () => {
        pro = await createAuthorized(admin, "professional", "physio");
        ids.push(pro.id);
        pro.client = await login(pro.email);
        const profile = await pro.client
          .from("profiles")
          .select("role, specialty")
          .eq("id", pro.id)
          .single();
        assert.deepEqual(profile.data, {
          role: "professional",
          specialty: "physio",
        });
        patient = await createAuthorized(pro.client, "patient");
        ids.push(patient.id);
        patient.client = await login(patient.email);
        const assignment = await pro.client
          .from("care_assignments")
          .select("patient_id, kind")
          .eq("patient_id", patient.id)
          .single();
        assert.deepEqual(assignment.data, {
          patient_id: patient.id,
          kind: "physio",
        });
        assert.equal(
          (await outsider.from("profiles").select("id").eq("id", patient.id))
            .data.length,
          0,
        );
        assert.equal(
          (
            await patient.client
              .from("profiles")
              .select("role")
              .eq("id", patient.id)
              .single()
          ).data.role,
          "patient",
        );
      },
    );

    await t.test(
      "Altas sin permiso, lectura de autorizaciones, robo y reutilización de token se rechazan",
      async () => {
        const input = {
          person_email: `denied-${crypto.randomUUID()}@demo.local`,
          person_name: "No autorizado",
          person_phone: "",
          person_role: "professional",
          person_specialty: "physio",
        };
        assert.ok(
          (await pro.client.rpc("prepare_person_registration", input)).error,
        );
        assert.ok(
          (
            await patient.client.rpc("prepare_person_registration", {
              ...input,
              person_role: "patient",
              person_specialty: null,
            })
          ).error,
        );
        assert.ok(
          (await api().rpc("prepare_person_registration", input)).error,
        );
        assert.ok(
          (await patient.client.from("person_registrations").select("token"))
            .error,
        );
        assert.ok(
          (
            await api().auth.signUp({
              email: input.person_email,
              password,
              options: { data: { registration_token: patient.token } },
            })
          ).error,
        );
        const ownAssignment = await outsider
          .from("care_assignments")
          .insert({
            patient_id: patient.id,
            professional_id: "00000000-0000-4000-a000-000000000002",
            kind: "training",
          });
        assert.ok(ownAssignment.error);
      },
    );

    const browser = httpClient();
    await t.test(
      "Paciente nuevo queda bloqueado y retoma cada paso guardado",
      async () => {
        expectRedirect(
          await browser.submit("/login", { email: patient.email, password }),
          "/patient",
        );
        for (const route of [
          "/patient",
          "/admin",
          "/pro",
          "/patient/profile",
          `/people/${patient.id}`,
        ])
          expectRedirect(await browser.request(route), "/patient/onboarding");
        const wrong = await browser.submit(
          "/patient/onboarding",
          { step: "1", goal: "bad", level: "beginner" },
          'name="step"',
        );
        assert.ok(wrong.html.includes("Selecciona tu objetivo."));
        expectRedirect(
          await browser.submit(
            "/patient/onboarding",
            { step: "1", goal: "rehab", level: "beginner" },
            'name="step"',
          ),
          "/patient/onboarding",
        );
        assert.ok(
          (await browser.request("/patient/onboarding")).html.includes(
            "¿Con qué cuentas?",
          ),
        );
        const saved = await patient.client
          .from("patient_details")
          .select("goal, level, onboarding_step")
          .eq("profile_id", patient.id)
          .single();
        assert.deepEqual(saved.data, {
          goal: "rehab",
          level: "beginner",
          onboarding_step: 1,
        });
        expectRedirect(
          await browser.submit(
            "/patient/onboarding",
            { step: "2", environment: "home", equipment: ["bands"] },
            'name="step"',
          ),
          "/patient/onboarding",
        );
        const resumed = await browser.request("/patient/onboarding");
        assert.ok(
          resumed.html.replaceAll(/<!--.*?-->/g, "").includes("Paso 3 de 3"),
        );
      },
    );

    await t.test(
      "Condiciones inválidas fallan en servidor y API; el cierre es atómico e idempotente",
      async () => {
        const invalid = await browser.submit(
          "/patient/onboarding",
          {
            step: "3",
            conditions: JSON.stringify([
              { ...condition, body_part: "invalid" },
            ]),
          },
          'name="step"',
        );
        assert.ok(invalid.html.includes("Parte del cuerpo inválida."));
        const rpc = await patient.client.rpc("finish_patient_onboarding", {
          patient_id: patient.id,
          conditions: [condition, { ...condition, body_part: "invalid" }],
        });
        assert.ok(rpc.error);
        assert.equal(
          (
            await patient.client
              .from("patient_conditions")
              .select("id")
              .eq("patient_id", patient.id)
          ).data.length,
          0,
        );
        assert.ok(
          (
            await patient.client
              .from("patient_details")
              .update({ equipment: ["invalid"] })
              .eq("profile_id", patient.id)
          ).error,
        );
        expectRedirect(
          await browser.submit(
            "/patient/onboarding",
            { step: "3", conditions: JSON.stringify([condition]) },
            'name="step"',
          ),
          "/patient",
        );
        assert.equal(
          (
            await patient.client.rpc("finish_patient_onboarding", {
              patient_id: patient.id,
              conditions: [condition],
            })
          ).error,
          null,
        );
        assert.equal(
          (
            await patient.client
              .from("patient_conditions")
              .select("id")
              .eq("patient_id", patient.id)
          ).data.length,
          1,
        );
        assert.equal((await browser.request("/patient")).response.status, 200);
        expectRedirect(
          await browser.request("/patient/onboarding"),
          "/patient",
        );
      },
    );

    await t.test(
      "Perfil y condición editables por asignado; otro profesional no puede leer ni escribir",
      async () => {
        assert.equal(
          (
            await pro.client
              .from("patient_details")
              .update({ equipment: ["bands", "dumbbells"] })
              .eq("profile_id", patient.id)
              .select("profile_id")
              .single()
          ).error,
          null,
        );
        assert.deepEqual(
          (
            await outsider
              .from("patient_details")
              .update({ goal: "performance" })
              .eq("profile_id", patient.id)
              .select("profile_id")
          ).data,
          [],
        );
        assert.ok(
          (
            await outsider
              .from("patient_conditions")
              .insert({ ...condition, patient_id: patient.id })
          ).error,
        );
        const current = (
          await pro.client
            .from("patient_conditions")
            .select("id")
            .eq("patient_id", patient.id)
            .single()
        ).data;
        assert.deepEqual(
          (
            await outsider
              .from("patient_conditions")
              .update({ is_active: false })
              .eq("id", current.id)
              .select("id")
          ).data,
          [],
        );
        assert.equal(
          (
            await pro.client
              .from("patient_conditions")
              .update({ is_active: false })
              .eq("id", current.id)
              .select("id")
              .single()
          ).error,
          null,
        );
        assert.equal(
          (
            await patient.client
              .from("patient_conditions")
              .select("is_active")
              .eq("id", current.id)
              .single()
          ).data.is_active,
          false,
        );
        const stranger = httpClient();
        await stranger.submit("/login", {
          email: "entrenador@demo.local",
          password: "demo1234",
        });
        const hidden = await stranger.request(`/people/${patient.id}`);
        assert.ok(
          hidden.response.status === 404 ||
            hidden.html.includes('name="robots" content="noindex"'),
        );
        assert.ok(!hidden.html.includes("Molestia al bajar escaleras"));
      },
    );

    await t.test(
      "Segundo profesional distinto permitido; duplicado y especialidad falsa rechazados",
      async () => {
        const input = {
          patient_id: patient.id,
          professional_id: "00000000-0000-4000-a000-000000000002",
          kind: "training",
        };
        assert.equal(
          (await admin.from("care_assignments").insert(input)).error,
          null,
        );
        assert.ok((await admin.from("care_assignments").insert(input)).error);
        assert.ok(
          (
            await admin
              .from("care_assignments")
              .insert({ ...input, kind: "physio" })
          ).error,
        );
        assert.equal(
          (
            await patient.client
              .from("care_assignments")
              .select("id")
              .eq("patient_id", patient.id)
              .is("ended_at", null)
          ).data.length,
          2,
        );
      },
    );

    await t.test(
      "Baja de paciente impide acceso y conserva historial para su profesional",
      async () => {
        assert.ok(
          (
            await pro.client.rpc("deactivate_person", {
              person_id: patient.id,
              expected_assignments: 0,
            })
          ).error,
        );
        assert.equal(
          (
            await admin.rpc("deactivate_person", {
              person_id: patient.id,
              expected_assignments: 0,
            })
          ).error,
          null,
        );
        expectRedirect(await browser.request("/patient"), "/login");
        assert.equal(
          (
            await pro.client
              .from("patient_conditions")
              .select("id")
              .eq("patient_id", patient.id)
          ).data.length,
          1,
        );
        assert.equal(
          (
            await pro.client
              .from("profiles")
              .select("is_active")
              .eq("id", patient.id)
              .single()
          ).data.is_active,
          false,
        );
      },
    );

    await t.test(
      "Baja de profesional exige confirmar el número vigente y cierra sus vínculos",
      async () => {
        assert.ok(
          (
            await admin.rpc("deactivate_person", {
              person_id: pro.id,
              expected_assignments: 0,
            })
          ).error,
        );
        assert.equal(
          (
            await admin.rpc("deactivate_person", {
              person_id: pro.id,
              expected_assignments: 1,
            })
          ).error,
          null,
        );
        assert.equal(
          (
            await admin
              .from("care_assignments")
              .select("id")
              .eq("professional_id", pro.id)
              .is("ended_at", null)
          ).data.length,
          0,
        );
        assert.ok(
          (
            await pro.client.rpc("prepare_person_registration", {
              person_email: `inactive-${crypto.randomUUID()}@demo.local`,
              person_name: "No permitido",
              person_phone: "",
              person_role: "patient",
            })
          ).error,
        );
      },
    );
  },
);

test(
  "Camino 1 completo por formularios y acciones del servidor",
  { timeout: 120_000 },
  async (t) => {
    const adminBrowser = httpClient();
    const proBrowser = httpClient();
    const patientBrowser = httpClient();
    const marker = crypto.randomUUID();
    const proEmail = `form-pro-${marker}@demo.local`;
    const patientEmail = `form-patient-${marker}@demo.local`;
    const ids = [];
    t.after(() => {
      for (const id of ids.reverse())
        sql(
          `delete from public.person_registrations where created_by = '${id}'; delete from auth.users where id = '${id}'`,
        );
    });
    expectRedirect(
      await adminBrowser.submit("/login", {
        email: "admin@demo.local",
        password: "demo1234",
      }),
      "/admin",
    );
    const professional = await adminBrowser.submit(
      "/admin",
      {
        fullName: `Profesional ${marker}`,
        email: proEmail,
        phone: "",
        password,
        role: "professional",
        specialty: "physio",
      },
      'name="fullName"',
    );
    assert.ok(
      professional.html.includes("Persona creada."),
      professional.html.match(/role="alert"[^>]*>([^<]*)/)?.[1],
    );
    const proApi = await login(proEmail);
    const proId = (await proApi.auth.getUser()).data.user.id;
    ids.push(proId);
    assert.ok(
      (await adminBrowser.request("/admin")).html.includes("Personas y equipo"),
    );
    expectRedirect(
      await proBrowser.submit("/login", { email: proEmail, password }),
      "/pro",
    );
    const patient = await proBrowser.submit(
      "/pro",
      {
        fullName: `Paciente ${marker}`,
        email: patientEmail,
        phone: "",
        password,
        role: "patient",
      },
      'name="fullName"',
    );
    assert.ok(
      patient.html.includes("Persona creada."),
      patient.html.match(/role="alert"[^>]*>([^<]*)/)?.[1],
    );
    const patientApi = await login(patientEmail);
    const patientId = (await patientApi.auth.getUser()).data.user.id;
    ids.push(patientId);
    assert.ok(
      (await proBrowser.request("/pro")).html.includes(`Paciente ${marker}`),
    );
    expectRedirect(
      await patientBrowser.submit("/login", { email: patientEmail, password }),
      "/patient",
    );
    expectRedirect(
      await patientBrowser.request("/patient"),
      "/patient/onboarding",
    );
    expectRedirect(
      await patientBrowser.submit(
        "/patient/onboarding",
        { step: "1", goal: "rehab", level: "beginner" },
        'name="step"',
      ),
      "/patient/onboarding",
    );
    expectRedirect(
      await patientBrowser.submit(
        "/patient/onboarding",
        { step: "2", environment: "home", equipment: ["bands"] },
        'name="step"',
      ),
      "/patient/onboarding",
    );
    expectRedirect(
      await patientBrowser.submit(
        "/patient/onboarding",
        { step: "3", conditions: JSON.stringify([condition]) },
        'name="step"',
      ),
      "/patient",
    );
    const details = (
      await patientApi
        .from("patient_details")
        .select("goal, level, environment, equipment, onboarding_step")
        .eq("profile_id", patientId)
        .single()
    ).data;
    assert.deepEqual(details, {
      goal: "rehab",
      level: "beginner",
      environment: "home",
      equipment: ["bands"],
      onboarding_step: 3,
    });
    const other = await login("entrenador@demo.local", "demo1234");
    assert.equal(
      (await other.from("profiles").select("id").eq("id", patientId)).data
        .length,
      0,
    );
    const edit = await proBrowser.submit(
      `/people/${patientId}`,
      {
        patientId,
        goal: "rehab",
        level: "beginner",
        environment: "home",
        equipment: ["bands", "dumbbells"],
      },
      'name="goal"',
    );
    assert.ok(edit.html.includes("Perfil actualizado."));
    const conditionRow = (
      await patientApi
        .from("patient_conditions")
        .select("id")
        .eq("patient_id", patientId)
        .single()
    ).data;
    const resolve = await proBrowser.submit(
      `/people/${patientId}`,
      { patientId, conditionId: conditionRow.id, ...condition },
      'name="conditionId"',
    );
    assert.ok(resolve.html.includes("Condición guardada."));
    assert.equal(
      (
        await patientApi
          .from("patient_conditions")
          .select("is_active")
          .eq("id", conditionRow.id)
          .single()
      ).data.is_active,
      false,
    );
    const noConfirmation = await adminBrowser.submit(
      "/admin",
      { personId: proId, expectedAssignments: 1 },
      `value="${proId}"`,
    );
    assert.ok(noConfirmation.html.includes("Confirma la baja para continuar."));
    const deactivate = await adminBrowser.submit(
      "/admin",
      { personId: proId, expectedAssignments: 1, confirmation: "yes" },
      `value="${proId}"`,
    );
    assert.ok(deactivate.html.includes("Persona dada de baja."));
    expectRedirect(await proBrowser.request("/pro"), "/login");
  },
);
