/** Las fechas civiles se calculan en UTC; «hoy» sigue la zona del negocio. */
export type CalendarView = "month" | "week";
export type CalendarStatus =
  | "scheduled"
  | "pending"
  | "in_progress"
  | "completed"
  | "abandoned";
export type CalendarSession = {
  id: string;
  status: "in_progress" | "completed" | "abandoned";
};
export type CalendarRecord = {
  id: string;
  dayId: string;
  date: string;
  title: string;
  routineName: string;
  kind: "training" | "physio";
};
export type CalendarEvent = CalendarRecord & {
  scheduleId: string | null;
  status: CalendarStatus;
  sessions: CalendarSession[];
};

export function todayInBogota(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function schedulingRange(today: string) {
  return { min: today, max: addDays(today, 366) };
}

export function isSchedulingDate(date: string, today: string) {
  const { min, max } = schedulingRange(today);
  return date >= min && date <= max;
}

export function startOfWeek(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

export function moveCalendar(date: string, amount: number, view: CalendarView) {
  if (view === "week") return addDays(date, amount * 7);
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + amount);
  const last = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0),
  ).getUTCDate();
  value.setUTCDate(Math.min(Number(date.slice(8)), last));
  return value.toISOString().slice(0, 10);
}

export function calendarRange(date: string, view: CalendarView) {
  const start = startOfWeek(view === "week" ? date : `${date.slice(0, 7)}-01`);
  const nextMonth = moveCalendar(`${date.slice(0, 7)}-01`, 1, "month");
  const end =
    view === "week"
      ? addDays(start, 6)
      : addDays(startOfWeek(addDays(nextMonth, -1)), 6);
  const dates: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) dates.push(day);
  return { start, end, dates };
}

export function calendarDateLabel(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  },
) {
  return new Intl.DateTimeFormat("es-CO", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function calendarHref(base: string, date: string, view: CalendarView) {
  return `${base}?${new URLSearchParams({ date, view })}`;
}

export function calendarAssignmentHref(
  patientId: string,
  date: string,
  view: CalendarView,
) {
  return `/pro/routines/${patientId}?${new URLSearchParams({ calendarDate: date, calendarView: view })}#assign-routine`;
}

export function mergeCalendarEvents(
  schedules: CalendarRecord[],
  sessions: (CalendarRecord & { status: CalendarSession["status"] })[],
  today: string,
): CalendarEvent[] {
  const events = new Map<string, CalendarEvent>();
  const key = (record: CalendarRecord) => `${record.dayId}:${record.date}`;
  for (const schedule of schedules)
    events.set(key(schedule), {
      ...schedule,
      scheduleId: schedule.id,
      status: schedule.date > today ? "scheduled" : "pending",
      sessions: [],
    });
  for (const session of sessions) {
    const event = events.get(key(session)) ?? {
      ...session,
      scheduleId: null,
      sessions: [],
    };
    event.sessions.push({ id: session.id, status: session.status });
    event.status =
      event.status === "completed" || session.status === "completed"
        ? "completed"
        : event.status === "in_progress" || session.status === "in_progress"
          ? "in_progress"
          : "abandoned";
    events.set(key(session), event);
  }
  return [...events.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "es"),
  );
}

export function weeklyGoal(events: CalendarEvent[], date: string) {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const planned = events.filter(
    (event) => event.scheduleId && event.date >= start && event.date <= end,
  );
  const completed = planned.filter((event) =>
    event.sessions.some((session) => session.status === "completed"),
  ).length;
  return {
    start,
    end,
    total: planned.length,
    completed,
    percent: planned.length
      ? Math.round((completed / planned.length) * 100)
      : 0,
  };
}
