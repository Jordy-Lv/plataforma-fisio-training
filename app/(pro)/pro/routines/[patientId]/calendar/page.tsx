import { notFound, redirect } from "next/navigation";
import { Workspace } from "@/components/auth/Workspace";
import { CalendarScheduleForm } from "@/components/routines/CalendarForms";
import { RoutineCalendar } from "@/components/routines/RoutineCalendar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { getActiveProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { calendarRange, todayInBogota } from "@/lib/routines/calendar";
import {
  patientCalendar,
  schedulableDays,
} from "@/lib/routines/calendar-queries";
import {
  calendarQuerySchema,
  scheduleRoutineSchema,
} from "@/lib/routines/schemas";

export const metadata = { title: "Calendario del paciente" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/routine/calendar");
  const id = scheduleRoutineSchema.shape.patientId.safeParse(
    (await params).patientId,
  );
  if (!id.success) notFound();
  const patientId = id.data;
  const supabase = await createClient();
  const { data: patient, error } = await supabase
    .from("profiles")
    .select("id, full_name, is_active")
    .eq("id", patientId)
    .eq("role", "patient")
    .maybeSingle();
  if (error) throw new Error("No se pudo consultar el paciente.");
  if (!patient) notFound();
  const today = todayInBogota();
  const parsed = calendarQuerySchema.safeParse(await searchParams);
  const { date = today, view = "month" } = parsed.success ? parsed.data : {};
  const range = calendarRange(date, view);
  const [events, days] = await Promise.all([
    patientCalendar(patientId, range.start, range.end, today),
    schedulableDays(patientId),
  ]);
  return (
    <Workspace
      title={`Calendario de ${patient.full_name ?? "paciente"}`}
      name={actor.fullName}
      role={actor.role}
      description="Programa sus rutinas y consulta el avance de cada semana."
      actions={
        <ButtonLink variant="outline" href={`/pro/routines/${patientId}`}>
          Volver a sus rutinas
        </ButtonLink>
      }
    >
      {!parsed.success && (
        <Notice className="mb-4">
          La fecha o vista no es válida. Te mostramos hoy.
        </Notice>
      )}
      <RoutineCalendar
        events={events}
        date={date}
        today={today}
        view={view}
        base={`/pro/routines/${patientId}/calendar`}
        patientId={patientId}
        isStaff
        emptyDayAction={
          patient.is_active
            ? days.length > 0
              ? "schedule"
              : "assign"
            : undefined
        }
      />
      <Card id="calendar-schedule" className="mt-6 scroll-mt-24">
        {!patient.is_active ? (
          <EmptyState title="Paciente inactivo">
            El historial sigue disponible. Debe estar activo para programar
            nuevas sesiones.
          </EmptyState>
        ) : days.length === 0 ? (
          <EmptyState title="Primero asigna una rutina activa">
            Podrás elegir sus días y programarlos en este calendario cuando la
            rutina esté lista.
          </EmptyState>
        ) : (
          <CalendarScheduleForm
            key={date}
            patientId={patientId}
            days={days}
            date={date}
            today={today}
            view={view}
          />
        )}
      </Card>
    </Workspace>
  );
}
