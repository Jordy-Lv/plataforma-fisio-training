import { notFound } from "next/navigation";
import { Workspace } from "@/components/auth/Workspace";
import { SessionControls } from "@/components/routines/SessionControls";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/auth/session";
import {
  calendarDateLabel,
  calendarHref,
  todayInBogota,
} from "@/lib/routines/calendar";
import { calendarRoutineDay } from "@/lib/routines/calendar-queries";
import {
  calendarQuerySchema,
  startSessionSchema,
} from "@/lib/routines/schemas";

export const metadata = { title: "Día de rutina" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ dayId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireRole("patient");
  const parsedId = startSessionSchema.safeParse(await params);
  if (!parsedId.success) notFound();
  const day = await calendarRoutineDay(parsedId.data.dayId, actor.id);
  if (!day) notFound();
  const today = todayInBogota();
  const parsed = calendarQuerySchema.safeParse(await searchParams);
  const { date = today, view = "month" } = parsed.success ? parsed.data : {};
  const items = [...day.routine_items].sort((a, b) => a.position - b.position);
  return (
    <Workspace
      title={day.title || `Día ${day.day_number}`}
      role="patient"
      name={actor.fullName}
      description={`${day.routines.name} · ${calendarDateLabel(date)}`}
      actions={
        <ButtonLink
          href={calendarHref("/routine/calendar", date, view)}
          variant="outline"
        >
          Volver al calendario
        </ButtonLink>
      }
    >
      <div className="mb-5">
        <Badge variant="brand">
          {day.routines.kind === "physio" ? "Fisioterapia" : "Entrenamiento"}
        </Badge>
      </div>
      {items.length === 0 ? (
        <EmptyState title="Tu profesional está preparando los ejercicios">
          Podrás iniciar este día cuando tenga ejercicios asignados.
        </EmptyState>
      ) : (
        <ol className="grid gap-3">
          {items.map((item, index) => (
            <li key={item.id}>
              <Card className="grid gap-2">
                <h2 className="font-semibold">
                  {index + 1}. {item.exercises?.name ?? "Ejercicio"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {item.sets ?? "—"} series · {item.reps ?? "—"} repeticiones
                  {item.target_weight !== null
                    ? ` · ${item.target_weight} kg`
                    : ""}
                  {item.rest_seconds !== null
                    ? ` · ${item.rest_seconds} s de descanso`
                    : ""}
                </p>
                {item.notes && (
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    <span className="font-medium">
                      Indicaciones de tu profesional:{" "}
                    </span>
                    {item.notes}
                  </p>
                )}
                {item.exercises?.description && (
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {item.exercises.description}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ol>
      )}
      {date === today &&
      day.routines.status === "active" &&
      items.length > 0 ? (
        <SessionControls
          dayId={day.id}
          label="Iniciar o continuar la sesión de hoy"
        />
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          {day.routines.status !== "active"
            ? "Esta rutina ya no está activa. Puedes consultar sus ejercicios e historial."
            : "Puedes consultar los ejercicios. El registro se habilita el día del entrenamiento."}
        </p>
      )}
    </Workspace>
  );
}
