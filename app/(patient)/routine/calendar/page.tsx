import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { PatientCalendar } from "@/components/routines/PatientCalendar";
import { Notice } from "@/components/ui/Notice";
import { requireRole } from "@/lib/auth/session";
import { patientOverview } from "@/lib/progress/patient-overview";
import { monthSessionCount } from "@/lib/progress/patient-progress";
import { calendarRange, todayInBogota } from "@/lib/routines/calendar";
import { patientCalendar } from "@/lib/routines/calendar-queries";
import { calendarQuerySchema } from "@/lib/routines/schemas";

export const metadata: Metadata = { title: "Mi calendario" };

/*
  Calendario del paciente (`PatientCalendar`): sus cifras, el mes o la semana y
  lo que hay el día elegido. El del profesional sigue en `RoutineCalendar`.
*/
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireRole("patient");
  const today = todayInBogota();
  const parsed = calendarQuerySchema.safeParse(await searchParams);
  const { date = today, view = "month" } = parsed.success ? parsed.data : {};
  const range = calendarRange(date, view);
  const [events, overview, monthSessions] = await Promise.all([
    patientCalendar(actor.id, range.start, range.end, today),
    patientOverview(actor.id),
    monthSessionCount(actor.id, date),
  ]);
  return (
    <Workspace title="Calendario" name={actor.fullName} role="patient">
      {!parsed.success && (
        <Notice className="mb-4">
          La fecha o vista del enlace no es válida. Te mostramos el calendario
          de hoy.
        </Notice>
      )}
      <PatientCalendar
        events={events}
        date={date}
        today={today}
        view={view}
        streakWeeks={overview.streakWeeks}
        monthSessions={monthSessions}
      />
    </Workspace>
  );
}
