/** Datos ficticios para recorrer el calendario de Diego en Supabase local. */
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  addDays,
  startOfWeek,
  todayInBogota,
} from "../lib/routines/calendar.ts";

const status = JSON.parse(
  execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
if (!["localhost", "127.0.0.1"].includes(new URL(status.API_URL).hostname))
  throw new Error("Esta semilla solo admite la base local.");
const db = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const patientId = "00000000-0000-4000-a000-000000000004";
const professionalId = "00000000-0000-4000-a000-000000000002";
const routineId = "ca1e0000-0000-4000-a000-000000000001";
const today = todayInBogota();
const monday = startOfWeek(today);

async function checked<T>(result: {
  data: T;
  error: { message: string } | null;
}) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const existing = await checked(
  await db
    .from("routines")
    .select("id, status")
    .eq("patient_id", patientId)
    .eq("kind", "training")
    .eq("status", "active"),
);
if ((existing ?? []).some((row) => row.id !== routineId)) {
  console.log(
    "Diego ya tiene una rutina de entrenamiento activa. Se conserva; programa sus días desde el panel profesional.",
  );
} else {
  const routine = await checked(
    await db
      .from("routines")
      .select("id, status")
      .eq("id", routineId)
      .maybeSingle(),
  );
  if (routine && routine.status !== "active")
    throw new Error(
      "La rutina de ejemplo se cerró. Se conserva su historial y no se reactiva.",
    );
  if (!routine)
    await checked(
      await db
        .from("routines")
        .insert({
          id: routineId,
          patient_id: patientId,
          kind: "training",
          name: "Semana de ejemplo · Calendario",
          assigned_by: professionalId,
          starts_on: monday,
          notes: "Datos ficticios para probar el calendario local.",
        }),
    );
  const names = ["Piernas", "Tren superior", "Movilidad"];
  const exercises = [
    "Sentadilla con silla · Ejemplo",
    "Remo con banda · Ejemplo",
    "Movilidad de hombros · Ejemplo",
  ];
  for (let index = 0; index < 3; index++) {
    const dayId = `ca1e0001-0000-4000-a000-00000000000${index + 1}`;
    const itemId = `ca1e0002-0000-4000-a000-00000000000${index + 1}`;
    const exerciseId = `ca1e0003-0000-4000-a000-00000000000${index + 1}`;
    await checked(
      await db
        .from("exercises")
        .upsert({
          id: exerciseId,
          name: exercises[index],
          is_custom: true,
          created_by: professionalId,
          description:
            "Ejercicio ficticio de demostración para comprobar la navegación y el registro.",
        }),
    );
    await checked(
      await db
        .from("routine_days")
        .upsert({
          id: dayId,
          routine_id: routineId,
          day_number: index + 1,
          title: names[index],
        }),
    );
    await checked(
      await db
        .from("routine_items")
        .upsert({
          id: itemId,
          routine_day_id: dayId,
          exercise_id: exerciseId,
          position: 0,
          sets: 3,
          reps: 10,
          rest_seconds: 60,
        }),
    );
    const scheduledOn = addDays(monday, index * 2);
    const schedule = await checked(
      await db
        .from("routine_schedules")
        .select("id")
        .eq("patient_id", patientId)
        .eq("routine_day_id", dayId)
        .eq("scheduled_on", scheduledOn),
    );
    if (!schedule?.length)
      await checked(
        await db
          .from("routine_schedules")
          .insert({
            patient_id: patientId,
            routine_day_id: dayId,
            scheduled_on: scheduledOn,
            created_by: professionalId,
          }),
      );
    if (index === 0 && scheduledOn < today) {
      const sessions = await checked(
        await db
          .from("sessions")
          .select("id")
          .eq("patient_id", patientId)
          .eq("routine_day_id", dayId)
          .eq("performed_on", scheduledOn),
      );
      if (!sessions?.length) {
        const session = await checked(
          await db
            .from("sessions")
            .insert({
              patient_id: patientId,
              routine_id: routineId,
              routine_day_id: dayId,
              performed_on: scheduledOn,
            })
            .select("id")
            .single(),
        );
        if (!session) throw new Error("No se pudo crear la sesión de ejemplo.");
        await checked(
          await db
            .from("session_logs")
            .insert({
              session_id: session.id,
              routine_item_id: itemId,
              patient_id: patientId,
              status: "done",
              actual_sets: 3,
              actual_reps: 10,
              pain_level: 0,
              perceived_effort: 4,
              notes: "Registro ficticio de ejemplo.",
            }),
        );
        await checked(
          await db
            .from("sessions")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", session.id),
        );
      }
    }
  }
  console.log(
    "Calendario de ejemplo listo: paciente@demo.local / demo1234. El profesional puede programar desde su panel.",
  );
}
