import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { RoutineCalendar } from "@/components/routines/RoutineCalendar";
import { Notice } from "@/components/ui/Notice";
import { requireRole } from "@/lib/auth/session";
import { calendarRange, todayInBogota } from "@/lib/routines/calendar";
import { patientCalendar } from "@/lib/routines/calendar-queries";
import { calendarQuerySchema } from "@/lib/routines/schemas";

export const metadata: Metadata = { title: "Mi calendario" };

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
  const events = await patientCalendar(actor.id, range.start, range.end, today);
  return (
    <Workspace
      title="Mi calendario"
      name={actor.fullName}
      role="patient"
      description="Tus rutinas y metas, día a día."
    >
      {!parsed.success && (
        <Notice className="mb-4">
          La fecha o vista del enlace no es válida. Te mostramos el calendario
          de hoy.
        </Notice>
      )}
      <RoutineCalendar
        events={events}
        date={date}
        today={today}
        view={view}
        base="/routine/calendar"
        patientId={actor.id}
      />
    </Workspace>
  );
}
