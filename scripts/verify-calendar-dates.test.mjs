import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  calendarRange,
  isSchedulingDate,
  mergeCalendarEvents,
  moveCalendar,
  schedulingRange,
  startOfWeek,
  todayInBogota,
  weeklyGoal,
} from "../lib/routines/calendar.ts";
import {
  calendarQuerySchema,
  scheduleRoutineSchema,
} from "../lib/routines/schemas.ts";

test("Calendario: meses, semanas, años bisiestos y zona de Bogotá", () => {
  assert.equal(todayInBogota(new Date("2026-09-09T02:00:00Z")), "2026-09-08");
  assert.equal(todayInBogota(new Date("2026-09-09T05:00:00Z")), "2026-09-09");
  assert.equal(startOfWeek("2026-01-01"), "2025-12-29");
  assert.equal(startOfWeek("2026-09-13"), "2026-09-07");
  assert.equal(moveCalendar("2024-01-31", 1, "month"), "2024-02-29");
  assert.equal(moveCalendar("2025-01-31", 1, "month"), "2025-02-28");
  assert.equal(moveCalendar("2026-12-31", 1, "month"), "2027-01-31");
  assert.equal(moveCalendar("2026-01-01", -1, "week"), "2025-12-25");
  const month = calendarRange("2026-09-09", "month");
  assert.equal(month.start, "2026-08-31");
  assert.equal(month.end, "2026-10-04");
  assert.equal(month.dates.length, 35);
  assert.equal(calendarRange("2026-03-15", "month").dates.length, 42);
  assert.equal(calendarRange("2026-02-10", "week").dates.length, 7);
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(
    calendarQuerySchema.safeParse({ date: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    calendarQuerySchema.safeParse({ date: ["2026-09-09"] }).success,
    false,
  );
  assert.equal(calendarQuerySchema.safeParse({ view: "year" }).success, false);
  assert.equal(
    scheduleRoutineSchema.safeParse({
      patientId: "otro",
      dayId: "ajeno",
      scheduledOn: "ayer",
    }).success,
    false,
  );
});

test("La fecha de programación usa el mismo intervalo en el formulario y el servidor", () => {
  const today = todayInBogota();
  const { min, max } = schedulingRange(today);
  const input = {
    patientId: "00000000-0000-4000-a000-000000000004",
    dayId: "ca1e0001-0000-4000-a000-000000000001",
  };
  for (const scheduledOn of [min, max]) {
    assert.equal(isSchedulingDate(scheduledOn, today), true);
    assert.equal(
      scheduleRoutineSchema.safeParse({ ...input, scheduledOn }).success,
      true,
    );
  }
  for (const scheduledOn of [addDays(today, -1), addDays(today, 367)]) {
    const result = scheduleRoutineSchema.safeParse({ ...input, scheduledOn });
    assert.equal(isSchedulingDate(scheduledOn, today), false);
    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /desde hoy/);
  }
});

test("La meta cuenta cada programación una vez y conserva sesiones sin programar", () => {
  const base = {
    dayId: "day",
    title: "Piernas",
    routineName: "Fuerza",
    kind: "training",
  };
  const schedules = [7, 9, 11].map((day) => ({
    ...base,
    id: `schedule-${day}`,
    date: `2026-09-${String(day).padStart(2, "0")}`,
  }));
  const sessions = [
    { ...base, id: "a", date: "2026-09-07", status: "completed" },
    { ...base, id: "b", date: "2026-09-07", status: "completed" },
    { ...base, id: "c", date: "2026-09-08", status: "completed" },
    { ...base, id: "d", date: "2026-09-09", status: "in_progress" },
  ];
  const events = mergeCalendarEvents(schedules, sessions, "2026-09-09");
  assert.equal(events.length, 4);
  assert.equal(events[0].sessions.length, 2);
  assert.equal(events[1].scheduleId, null);
  assert.equal(events[2].status, "in_progress");
  assert.equal(events[3].status, "scheduled");
  assert.deepEqual(weeklyGoal(events, "2026-09-09"), {
    start: "2026-09-07",
    end: "2026-09-13",
    total: 3,
    completed: 1,
    percent: 33,
  });
  assert.equal(weeklyGoal(events, "2026-09-14").total, 0);
  assert.equal(
    mergeCalendarEvents(schedules, [], "2026-09-09")[0].status,
    "pending",
  );
  assert.equal(
    mergeCalendarEvents(
      [],
      [{ ...sessions[0], status: "abandoned" }],
      "2026-09-09",
    )[0].status,
    "abandoned",
  );
  for (const statuses of [
    ["completed", "in_progress", "abandoned"],
    ["abandoned", "in_progress", "completed"],
    ["in_progress", "completed", "abandoned"],
  ]) {
    const mixed = statuses.map((status, index) => ({
      ...base,
      id: `mixed-${index}`,
      date: "2026-09-07",
      status,
    }));
    const merged = mergeCalendarEvents(schedules, mixed, "2026-09-09");
    assert.equal(merged[0].status, "completed");
    assert.equal(weeklyGoal(merged, "2026-09-09").completed, 1);
  }
});
