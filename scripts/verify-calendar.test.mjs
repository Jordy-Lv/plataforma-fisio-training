/**
 * Verifica el calendario de programación y seguimiento semanal: programar,
 * mover, ejecutar y conservar el historial, y el aislamiento entre pacientes
 * y profesionales ajenos.
 *
 * Requiere Supabase local encendido con la semilla base (`npm run db:reset`)
 * y `npm run dev` en marcha. No necesita catálogo, plantillas ni reglas
 * sembradas: usa la cuenta `admin@demo.local` de la semilla base y crea sus
 * propias personas, ejercicios y plantillas, y los borra al terminar. La
 * asignación va por el ciclo de ADR-0009: elegir plantilla y confirmar.
 *
 * Uso:  npm run test:calendar
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { JSDOM } from "jsdom";
import {
  status,
  sql,
  httpClient,
  expectRedirect,
} from "./helpers/auth-http.mjs";
import { addDays, todayInBogota } from "../lib/routines/calendar.ts";

const api = () =>
  createClient(status.API_URL, status.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

test(
  "Calendario: programación, ejecución, conservación e aislamiento",
  { timeout: 180000 },
  async (t) => {
    const password = `Calendario-${randomUUID()}`;
    const users = [];
    const admin = api();
    const adminLogin = await admin.auth.signInWithPassword({
      email: "admin@demo.local",
      password: "demo1234",
    });
    assert.equal(adminLogin.error, null);
    const routineId = randomUUID(),
      otherRoutineId = randomUUID(),
      dayId = randomUUID(),
      otherDayId = randomUUID();
    const exerciseId = randomUUID(),
      itemId = randomUUID();
    const templateId = randomUUID();
    const today = todayInBogota();
    const tomorrow = addDays(today, 1);
    t.after(async () => {
      sql(`delete from public.routine_schedules where routine_day_id in ('${dayId}','${otherDayId}')
        or routine_day_id in (select d.id from public.routine_days d join public.routines r on r.id=d.routine_id where r.source_template_id='${templateId}');
      delete from public.routines where id in ('${routineId}','${otherRoutineId}') or source_template_id='${templateId}';
      delete from public.routine_templates where id='${templateId}';
      delete from public.exercises where id='${exerciseId}';`);
      for (const user of users) {
        await user.client.auth.signOut();
        sql(
          `delete from public.person_registrations where created_by='${user.id}'; delete from auth.users where id='${user.id}'`,
        );
      }
      await admin.auth.signOut();
    });
    async function person(role) {
      const email = `calendar-${randomUUID()}@demo.local`;
      const reservation = await admin.rpc("prepare_person_registration", {
        person_email: email,
        person_name: `Prueba calendario ${role}`,
        person_phone: "",
        person_role: role,
        person_specialty: role === "professional" ? "training" : undefined,
      });
      assert.equal(reservation.error, null);
      const client = api();
      const signup = await client.auth.signUp({
        email,
        password,
        options: { data: { registration_token: reservation.data } },
      });
      assert.equal(signup.error, null);
      const user = { client, email, id: signup.data.user.id };
      users.push(user);
      return user;
    }
    const patient = await person("patient"),
      other = await person("patient");
    const pro = await person("professional"),
      outsider = await person("professional");
    sql(`insert into public.patient_details(profile_id,goal,level,environment,equipment,onboarding_step)
      values('${patient.id}','general_health','beginner','home','{none}',3),('${other.id}','general_health','beginner','home','{none}',3);
    insert into public.care_assignments(patient_id,professional_id,kind) values('${patient.id}','${pro.id}','training'),('${other.id}','${outsider.id}','training');
    insert into public.exercises(id,name) values('${exerciseId}','Ejercicio de prueba del calendario');
    insert into public.routines(id,patient_id,kind,name,assigned_by) values('${routineId}','${patient.id}','training','Rutina de calendario','${pro.id}'),('${otherRoutineId}','${other.id}','training','Rutina ajena','${outsider.id}');
    insert into public.routine_days(id,routine_id,day_number,title) values('${dayId}','${routineId}',1,'Día de prueba del calendario'),('${otherDayId}','${otherRoutineId}',1,'Día ajeno');
    insert into public.routine_items(id,routine_day_id,exercise_id,position,sets,reps,notes) values('${itemId}','${dayId}','${exerciseId}',0,3,10,'Indicación personalizada de prueba');
    insert into public.routine_templates(id,name,kind) values('${templateId}','Plantilla de recorrido completo','training');
    insert into public.template_days(template_id,day_number,title) values('${templateId}',1,'Primera sesión');
    insert into public.template_items(template_day_id,exercise_id,position,sets,reps)
      select id,'${exerciseId}',position,3,12 from public.template_days cross join generate_series(1,3) position where template_id='${templateId}';`);
    const web = httpClient();
    expectRedirect(
      await web.submit("/login", { email: pro.email, password }),
      "/pro",
    );
    const route = `/pro/routines/${patient.id}/calendar`;
    let scheduleId;
    await t.test(
      "Días vacíos abren programación para el equipo con la fecha seleccionada",
      async () => {
        const page = await web.request(`${route}?date=${tomorrow}&view=week`);
        const document = new JSDOM(page.html).window.document;
        assert.equal(
          document
            .querySelector(
              `[data-calendar-create][data-calendar-date="${tomorrow}"]`,
            )
            ?.getAttribute("href"),
          `${route}?date=${tomorrow}&view=week#calendar-schedule`,
        );
        assert.equal(
          document.querySelector('[name="scheduledOn"]')?.getAttribute("value"),
          tomorrow,
        );
        assert.ok(document.querySelector("#calendar-schedule"));
        const createHref = `/pro/routines/${patient.id}?calendarDate=${tomorrow}&calendarView=week#assign-routine`;
        assert.ok(
          [...document.querySelectorAll("a")].some(
            (link) => link.getAttribute("href") === createHref,
          ),
        );
        for (const invalidDate of [addDays(today, -1), addDays(today, 367)]) {
          const outside = await web.request(`${route}?date=${invalidDate}`);
          assert.equal(
            new JSDOM(outside.html).window.document.querySelector(
              `[data-calendar-create][data-calendar-date="${invalidDate}"]`,
            ),
            null,
          );
        }
        const adminWeb = httpClient();
        expectRedirect(
          await adminWeb.submit("/login", {
            email: "admin@demo.local",
            password: "demo1234",
          }),
          "/admin",
        );
        const adminPage = await adminWeb.request(
          `${route}?date=${tomorrow}&view=week`,
        );
        assert.ok(
          new JSDOM(adminPage.html).window.document.querySelector(
            `[data-calendar-create][data-calendar-date="${tomorrow}"]`,
          ),
        );
      },
    );
    await t.test(
      "El profesional programa por server action y el cliente ve el resultado",
      async () => {
        const result = await web.submit(
          route,
          { patientId: patient.id, dayId, scheduledOn: today },
          "data-calendar-schedule",
        );
        assert.match(result.html, /Sesión programada/);
        const rows = await patient.client
          .from("routine_schedules")
          .select("id,created_by")
          .eq("patient_id", patient.id);
        assert.equal(rows.error, null);
        assert.equal(rows.data.length, 1);
        scheduleId = rows.data[0].id;
        assert.equal(rows.data[0].created_by, pro.id);
        assert.equal(
          (
            await admin
              .from("routine_schedules")
              .select("id")
              .eq("id", scheduleId)
          ).data.length,
          1,
        );
        const duplicate = await pro.client.from("routine_schedules").insert({
          patient_id: patient.id,
          routine_day_id: dayId,
          scheduled_on: today,
        });
        assert.equal(duplicate.error?.code, "23505");
        const invalid = await web.submit(
          route,
          { patientId: patient.id, dayId, scheduledOn: "2026-02-30" },
          "data-calendar-schedule",
        );
        assert.match(invalid.html, /fecha válida/);
      },
    );
    await t.test(
      "El editor conserva fecha y vista al abrir, buscar y cerrar el catálogo",
      async () => {
        for (const view of ["week", "month"]) {
          const calendar = await web.request(
            `${route}?date=${today}&view=${view}`,
          );
          const calendarDocument = new JSDOM(calendar.html).window.document;
          const routineHref = calendarDocument
            .querySelector(`[data-calendar-date="${today}"] a[title]`)
            ?.getAttribute("href");
          assert.ok(routineHref, "La rutina debe abrirse desde la cuadrícula.");
          const editorUrl = new URL(routineHref, "http://localhost");
          assert.equal(editorUrl.searchParams.get("calendarDate"), today);
          assert.equal(editorUrl.searchParams.get("calendarView"), view);
          assert.equal(editorUrl.hash, `#routine-day-${dayId}`);
          const editor = await web.request(routineHref);
          const editorDocument = new JSDOM(editor.html).window.document;
          for (const label of [
            "Añadir ejercicios a este día",
            "Sustituir por otro ejercicio",
          ]) {
            const searchHref = [...editorDocument.querySelectorAll("a")]
              .find((link) => link.textContent.trim() === label)
              ?.getAttribute("href");
            assert.ok(searchHref);
            const searchPage = await web.request(searchHref);
            const searchWindow = new JSDOM(searchPage.html).window;
            const form =
              searchWindow.document.querySelector(
                'form[method="get"][aria-label="Buscar en el catálogo"]',
              );
            assert.ok(form);
            form.querySelector('[name="q"]').value = "Ejercicio de prueba";
            const parameters = new URLSearchParams(
              new searchWindow.FormData(form),
            );
            assert.equal(parameters.get("calendarDate"), today);
            assert.equal(parameters.get("calendarView"), view);
            const results = await web.request(
              `${form.getAttribute("action")}?${parameters}`,
            );
            assert.equal(results.response.status, 200);
            const resultsDocument = new JSDOM(results.html).window.document;
            const closeHref = [...resultsDocument.querySelectorAll("a")]
              .find(
                (link) =>
                  link.textContent.trim() ===
                  (label === "Añadir ejercicios a este día"
                    ? "Salir del día"
                    : "Dejar de sustituir"),
              )
              ?.getAttribute("href");
            assert.ok(closeHref);
            // Salir del catálogo conserva la fecha y la vista, y deja la
            // pantalla sin buscador: desde `manual-routine-assignment` solo
            // aparece enfocado en un día o un ejercicio (design D4).
            const closedUrl = new URL(closeHref, "http://localhost");
            assert.equal(closedUrl.searchParams.get("dia"), null);
            assert.equal(closedUrl.searchParams.get("item"), null);
            assert.equal(closedUrl.searchParams.get("calendarDate"), today);
            assert.equal(closedUrl.searchParams.get("calendarView"), view);
            const closed = await web.request(closeHref);
            const closedDocument = new JSDOM(closed.html).window.document;
            assert.equal(
              closedDocument.querySelector(
                'form[method="get"][aria-label="Buscar en el catálogo"]',
              ),
              null,
              "Sin foco no queda ningún buscador del catálogo.",
            );
            // La vuelta al calendario es el botón «Ver calendario» de la
            // cabecera: `#assign-routine` solo existe con un borrador.
            assert.equal(
              [...closedDocument.querySelectorAll("a")]
                .find((link) => link.textContent.trim() === "Ver calendario")
                ?.getAttribute("href"),
              `${route}?date=${today}&view=${view}#calendar-schedule`,
            );
          }
        }
      },
    );
    await t.test(
      "RLS rechaza accesos ajenos, pacientes escritores y relaciones falsificadas",
      async () => {
        for (const client of [other.client, outsider.client]) {
          const rows = await client
            .from("routine_schedules")
            .select("id")
            .eq("patient_id", patient.id);
          assert.equal(rows.error, null);
          assert.equal(rows.data.length, 0);
        }
        for (const client of [patient.client, outsider.client]) {
          assert.ok(
            (
              await client.from("routine_schedules").insert({
                patient_id: patient.id,
                routine_day_id: dayId,
                scheduled_on: tomorrow,
              })
            ).error,
          );
        }
        assert.ok(
          (
            await admin.from("routine_schedules").insert({
              patient_id: patient.id,
              routine_day_id: otherDayId,
              scheduled_on: tomorrow,
            })
          ).error,
        );
        assert.ok(
          (
            await pro.client
              .from("routine_schedules")
              .update({ patient_id: other.id })
              .eq("id", scheduleId)
          ).error,
        );
        assert.ok(
          (
            await pro.client
              .from("routine_schedules")
              .delete()
              .eq("id", scheduleId)
          ).error,
        );
        assert.ok(
          (
            await pro.client.from("routine_schedules").insert({
              patient_id: patient.id,
              routine_day_id: dayId,
              scheduled_on: addDays(today, -1),
            })
          ).error,
        );
        assert.ok(
          (
            await pro.client.from("routine_schedules").insert({
              patient_id: patient.id,
              routine_day_id: dayId,
              scheduled_on: addDays(today, 367),
            })
          ).error,
        );
      },
    );
    await t.test(
      "Paciente ve mes, semana, ejercicios y completa la sesión real",
      async () => {
        const patientWeb = httpClient();
        expectRedirect(
          await patientWeb.submit("/login", { email: patient.email, password }),
          "/patient",
        );
        const month = await patientWeb.request(
          `/routine/calendar?date=${today}&view=month`,
        );
        assert.equal(month.response.status, 200);
        assert.match(month.html, /Día de prueba del calendario/);
        assert.doesNotMatch(month.html, /data-calendar-schedule/);
        assert.equal(
          new JSDOM(month.html).window.document.querySelector(
            "[data-calendar-create]",
          ),
          null,
        );
        const week = await patientWeb.request(
          `/routine/calendar?date=${today}&view=week`,
        );
        assert.equal(
          new JSDOM(week.html).window.document.querySelectorAll(
            "[data-calendar-date]",
          ).length,
          7,
        );
        const dayRoute = `/routine/calendar/days/${dayId}?date=${today}`;
        const detail = await patientWeb.request(dayRoute);
        assert.match(detail.html, /Ejercicio de prueba del calendario/);
        assert.match(detail.html, /Indicación personalizada de prueba/);
        const future = await patientWeb.request(
          `/routine/calendar/days/${dayId}?date=${tomorrow}`,
        );
        assert.doesNotMatch(future.html, /name="dayId"/);
        const started = await patientWeb.submit(
          dayRoute,
          { dayId },
          'name="dayId"',
        );
        const location = started.response.headers.get("location");
        assert.match(location, /^\/routine\/sessions\//);
        const sessionId = location.split("/").at(-1);
        assert.ok(
          (
            await pro.client
              .from("routine_schedules")
              .update({ cancelled_at: new Date().toISOString() })
              .eq("id", scheduleId)
          ).error,
        );
        const logged = await patientWeb.submit(
          location,
          {
            sessionId,
            itemId,
            status: "done",
            actualSets: "3",
            actualReps: "10",
            actualWeight: "0",
            painLevel: "0",
            painLocation: "",
            perceivedEffort: "4",
            notes: "",
            replacedByExerciseId: "",
          },
          'name="itemId"',
        );
        assert.match(logged.html, /Registro guardado/);
        const closed = await patientWeb.submit(
          location,
          { sessionId },
          "Terminar sesión",
        );
        assert.match(closed.html, /Sesión completada|Completada/);
        const complete = await patientWeb.request(
          `/routine/calendar?date=${today}`,
        );
        const goal = new JSDOM(complete.html).window.document.querySelector(
          "[data-calendar-goal]",
        ).textContent;
        assert.match(goal, /1 de 1 completadas/);
        const second = await patient.client.rpc("start_routine_session", {
          target_day: dayId,
        });
        assert.equal(second.error, null);
        const repeated = await patientWeb.request(
          `/routine/calendar?date=${today}`,
        );
        assert.match(
          new JSDOM(repeated.html).window.document.querySelector(
            "[data-calendar-goal]",
          ).textContent,
          /1 de 1 completadas/,
        );
        const otherWeb = httpClient();
        await otherWeb.submit("/login", { email: other.email, password });
        const forbidden = await otherWeb.request(
          `/routine/calendar/days/${dayId}`,
        );
        assert.ok(
          forbidden.response.status === 404 ||
            forbidden.html.includes('name="robots" content="noindex"'),
        );
      },
    );
    await t.test(
      "Cancelación lógica, autoría y cierre de rutina conservan lo realizado",
      async () => {
        const planned = await pro.client
          .from("routine_schedules")
          .insert({
            patient_id: patient.id,
            routine_day_id: dayId,
            scheduled_on: tomorrow,
            created_by: adminLogin.data.user.id,
          })
          .select("id,created_by")
          .single();
        assert.equal(planned.error, null);
        assert.equal(planned.data.created_by, pro.id);
        const cancelled = await web.submit(
          `${route}?date=${tomorrow}`,
          { patientId: patient.id, scheduleId: planned.data.id },
          'name="scheduleId"',
        );
        assert.match(cancelled.html, /Programación cancelada/);
        assert.ok(
          (
            await pro.client
              .from("routine_schedules")
              .select("cancelled_at")
              .eq("id", planned.data.id)
              .single()
          ).data.cancelled_at,
        );
        assert.ok(
          (
            await pro.client
              .from("routine_schedules")
              .update({ cancelled_at: null })
              .eq("id", planned.data.id)
          ).error,
        );
        const next = await pro.client
          .from("routine_schedules")
          .insert({
            patient_id: patient.id,
            routine_day_id: dayId,
            scheduled_on: tomorrow,
          })
          .select("id")
          .single();
        assert.equal(next.error, null);
        const close = await pro.client
          .from("routines")
          .update({ status: "completed" })
          .eq("id", routineId);
        assert.equal(close.error, null);
        assert.ok(
          (
            await pro.client
              .from("routine_schedules")
              .select("cancelled_at")
              .eq("id", next.data.id)
              .single()
          ).data.cancelled_at,
        );
        assert.equal(
          (
            await pro.client
              .from("routine_schedules")
              .select("cancelled_at")
              .eq("id", scheduleId)
              .single()
          ).data.cancelled_at,
          null,
        );
        assert.ok(
          (
            await pro.client.from("routine_schedules").insert({
              patient_id: patient.id,
              routine_day_id: dayId,
              scheduled_on: addDays(today, 2),
            })
          ).error,
        );
        const empty = await web.request(`${route}?date=${tomorrow}&view=week`);
        const createHref = new JSDOM(empty.html).window.document
          .querySelector(
            `[data-calendar-create][data-calendar-date="${tomorrow}"]`,
          )
          ?.getAttribute("href");
        assert.equal(
          createHref,
          `/pro/routines/${patient.id}?calendarDate=${tomorrow}&calendarView=week#assign-routine`,
        );
        // ADR-0009: sin rutina activa, la pantalla abre en «Elegir plantilla»;
        // `#assign-routine` aparece con el borrador.
        await web.submit(createHref.split("#")[0], {}, `value="${templateId}"`);
        const assignment = await web.request(createHref.split("#")[0]);
        const assignmentDocument = new JSDOM(assignment.html).window.document;
        assert.ok(assignmentDocument.querySelector("#assign-routine"));
        assert.match(
          assignmentDocument.querySelector("#assign-routine").textContent,
          /Seleccionaste el/,
        );
        assert.equal(
          assignmentDocument
            .querySelector("#assign-routine a")
            ?.getAttribute("href"),
          `${route}?date=${tomorrow}&view=week#calendar-schedule`,
        );
      },
    );
    await t.test(
      "Cerrar el vínculo y desactivar usuarios retira el acceso",
      async () => {
        sql(
          `update public.care_assignments set ended_at=now() where professional_id='${pro.id}'`,
        );
        assert.equal(
          (
            await pro.client
              .from("routine_schedules")
              .select("id")
              .eq("patient_id", patient.id)
          ).data.length,
          0,
        );
        sql(
          `update public.care_assignments set ended_at=null where professional_id='${pro.id}'; update public.profiles set is_active=false where id='${pro.id}'`,
        );
        assert.equal(
          (
            await pro.client
              .from("routine_schedules")
              .select("id")
              .eq("patient_id", patient.id)
          ).data.length,
          0,
        );
        sql(
          `update public.profiles set is_active=true where id='${pro.id}'; update public.profiles set is_active=false where id='${patient.id}'`,
        );
        assert.equal(
          (
            await patient.client
              .from("routine_schedules")
              .select("id")
              .eq("patient_id", patient.id)
          ).data.length,
          0,
        );
        const inactive = await web.request(`${route}?date=${tomorrow}`);
        assert.equal(
          new JSDOM(inactive.html).window.document.querySelector(
            "[data-calendar-create]",
          ),
          null,
        );
        sql(
          `update public.profiles set is_active=true where id='${patient.id}'`,
        );
      },
    );
    await t.test(
      "Recorrido completo: día vacío, asignación, programación y primera sesión completada",
      async () => {
        const newcomer = await person("patient");
        sql(`insert into public.patient_details(profile_id,goal,level,environment,equipment,onboarding_step)
          values('${newcomer.id}','general_health','beginner','home','{none}',3);
        insert into public.care_assignments(patient_id,professional_id,kind) values('${newcomer.id}','${pro.id}','training');`);

        const calendarRoute = `/pro/routines/${newcomer.id}/calendar`;
        const empty = await web.request(
          `${calendarRoute}?date=${today}&view=week`,
        );
        const emptyDocument = new JSDOM(empty.html).window.document;
        assert.equal(
          emptyDocument.querySelector("[data-calendar-schedule]"),
          null,
        );
        const createHref = emptyDocument
          .querySelector(
            `[data-calendar-create][data-calendar-date="${today}"]`,
          )
          ?.getAttribute("href");
        assert.ok(createHref);
        // ADR-0009: primero se elige la plantilla, que crea el borrador; el
        // formulario `#assign-routine` es el de confirmarlo.
        await web.submit(createHref, {}, `value="${templateId}"`);
        const assigned = await web.submit(
          createHref,
          { patientId: newcomer.id },
          'id="assign-routine"',
        );
        assert.match(
          assigned.html,
          /Rutina asignada\. El paciente ya puede consultarla/,
        );
        const returnHref = new JSDOM(assigned.html).window.document
          .querySelector("#assign-routine a")
          ?.getAttribute("href");
        assert.equal(
          returnHref,
          `${calendarRoute}?date=${today}&view=week#calendar-schedule`,
        );

        const scheduling = await web.request(returnHref);
        const schedulingDocument = new JSDOM(scheduling.html).window.document;
        assert.equal(
          schedulingDocument
            .querySelector('[name="scheduledOn"]')
            ?.getAttribute("value"),
          today,
        );
        const assignedDayId = schedulingDocument
          .querySelector('[name="dayId"] option[value]:not([value=""])')
          ?.getAttribute("value");
        assert.ok(assignedDayId);
        const scheduled = await web.submit(
          returnHref,
          {
            patientId: newcomer.id,
            dayId: assignedDayId,
            scheduledOn: today,
          },
          "data-calendar-schedule",
        );
        assert.match(scheduled.html, /Sesión programada/);

        const patientWeb = httpClient();
        expectRedirect(
          await patientWeb.submit("/login", {
            email: newcomer.email,
            password,
          }),
          "/patient",
        );
        const calendar = await patientWeb.request(
          `/routine/calendar?date=${today}&view=week`,
        );
        const calendarDocument = new JSDOM(calendar.html).window.document;
        assert.match(
          calendarDocument.querySelector("[data-calendar-goal]").textContent,
          /0 de 1 completadas/,
        );
        const routineHref = calendarDocument
          .querySelector(`[data-calendar-date="${today}"] a[title]`)
          ?.getAttribute("href");
        assert.equal(
          routineHref,
          `/routine/calendar/days/${assignedDayId}?date=${today}&view=week`,
        );
        const started = await patientWeb.submit(
          routineHref,
          { dayId: assignedDayId },
          'name="dayId"',
        );
        const sessionRoute = started.response.headers.get("location");
        assert.match(sessionRoute, /^\/routine\/sessions\//);
        const sessionId = sessionRoute.split("/").at(-1);
        const execution = await patientWeb.request(sessionRoute);
        const executionDocument = new JSDOM(execution.html).window.document;
        const items = [
          ...executionDocument.querySelectorAll('input[name="itemId"]'),
        ].map((input) => input.value);
        assert.equal(items.length, 3);
        for (const assignedItemId of items) {
          const logged = await patientWeb.submit(
            sessionRoute,
            {
              sessionId,
              itemId: assignedItemId,
              status: "done",
              actualSets: "3",
              actualReps: "12",
              actualWeight: "0",
              painLevel: "0",
              painLocation: "",
              perceivedEffort: "4",
              notes: "",
              replacedByExerciseId: "",
            },
            `value="${assignedItemId}"`,
          );
          assert.match(logged.html, /Registro guardado/);
        }
        const completed = await patientWeb.submit(
          sessionRoute,
          { sessionId },
          "Terminar sesión",
        );
        assert.match(completed.html, /Sesión completada|Completada/);
        for (const [client, path] of [
          [patientWeb, "/routine/calendar"],
          [web, calendarRoute],
        ]) {
          const updated = await client.request(
            `${path}?date=${today}&view=week`,
          );
          assert.match(
            new JSDOM(updated.html).window.document.querySelector(
              "[data-calendar-goal]",
            ).textContent,
            /1 de 1 completadas/,
          );
        }

        // La fecha de la conexión difiere de Bogotá a cualquier hora del día.
        // La copia debe mantener inicio/cierre locales y restaurar la zona del llamador.
        sql(`begin;
          select set_config('request.jwt.claims','{"sub":"${pro.id}","role":"authenticated"}',true);
          set local role authenticated;
          do $$
          declare
            expected_on date := (now() at time zone 'America/Bogota')::date;
            previous_id uuid;
            assigned_id uuid;
            caller_zone text;
          begin
            perform set_config('TimeZone','Pacific/Kiritimati',true);
            if current_date = expected_on then
              perform set_config('TimeZone','Etc/GMT+12',true);
            end if;
            if current_date = expected_on then
              raise exception 'La prueba necesita una fecha distinta de Bogotá.';
            end if;
            caller_zone := current_setting('TimeZone');
            select id into strict previous_id from public.routines
              where patient_id='${newcomer.id}' and status='active';
            assigned_id := public.copy_routine_template('${newcomer.id}','${templateId}');
            if (select starts_on from public.routines where id=assigned_id) is distinct from expected_on
              or (select ends_on from public.routines where id=previous_id) is distinct from expected_on then
              raise exception 'La vigencia de la rutina no coincide con el calendario de Bogotá.';
            end if;
            if current_setting('TimeZone') <> caller_zone then
              raise exception 'La asignación alteró la zona horaria del llamador.';
            end if;
          end;
          $$;
          rollback;`);
      },
    );
  },
);
