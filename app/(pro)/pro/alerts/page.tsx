import { redirect } from "next/navigation";
import { cn } from "cn";
import { getActiveProfile } from "@/lib/auth/session";
import { listPeople } from "@/lib/auth/people-queries";
import { alertList } from "@/lib/routines/alert-list";
import { clinicalAlerts } from "@/lib/routines/alert-queries";
import { Workspace } from "@/components/auth/Workspace";
import { AlertEvidence } from "@/components/routines/AlertEvidence";
import { ReadAlertForm } from "@/components/routines/ReadAlertForm";
import { Badge, alertBadgeVariant } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { sessionReports } from "@/lib/routines/session-queries";
import { bodyPartLabels, bodyParts } from "@/lib/catalog/body-parts";

const titles = {
  pain: "Dolor persistente",
  skipped: "Ejercicio saltado repetidamente",
  membership_expiring: "Mensualidad próxima a vencer",
  low_attendance: "Asistencia baja",
  routine_assignment: "Asignación de rutina",
};

const severities = {
  critical: "Prioridad alta",
  warning: "Requiere revisión",
  info: "Información",
};

const readLabels = { unread: "Sin leer", read: "Leídas" };

/** La zona del cuerpo en español, o el código si llega uno desconocido. */
const zoneLabel = (zone: string) =>
  bodyPartLabels[zone as (typeof bodyParts)[number]] ?? zone;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/patient");

  const filters = alertList.parse(await searchParams);
  const [{ alerts, total, pages, unread }, patients] = await Promise.all([
    clinicalAlerts(filters, actor.id),
    listPeople("patients"),
  ]);
  // Lo que registró el paciente en las sesiones que motivaron las alertas de
  // **esta página**, en una sola consulta con `in`. Es lo que se lee dentro del
  // diálogo sin salir de la pantalla de triaje (15.4).
  const evidenceSessionIds = alerts.flatMap((alert) =>
    alert.evidence.map((item) => item.session_id),
  );
  const reports = evidenceSessionIds.length
    ? await sessionReports(evidenceSessionIds)
    : new Map();

  // El filtro por paciente emite uuids, y en esta pantalla no hay conflicto:
  // el marcador de «marcar leída» es el uuid **de la alerta** (`docs/11`, §3),
  // que nunca coincide con el de un paciente.
  const choices = [
    { name: "read", label: "Lectura", options: readLabels },
    { name: "severity", label: "Prioridad", options: severities },
    { name: "type", label: "Motivo", options: titles },
    {
      name: "patient",
      label: "Paciente",
      options: Object.fromEntries(
        patients.map((person) => [person.id, person.full_name ?? "Paciente sin nombre"]),
      ),
    },
  ];
  const chips = Object.entries(filters)
    .filter(([key, value]) => key !== "page" && value)
    .map(([key, value]) => {
      const choice = choices.find((choice) => choice.name === key);
      const options: Record<string, string> = choice?.options ?? {};
      return {
        label: options[String(value)] ?? String(value),
        href: alertList.href(filters, { [key]: undefined, page: 1 }),
        removeLabel: `Quitar ${choice?.label ?? "filtro"}`,
      };
    });

  return (
    <Workspace
      title={actor.role === "admin" ? "Todas las alertas" : "Mis alertas"}
      name={actor.fullName}
      description={`${unread} sin leer para ti. Aquí aparece lo que el equipo tiene que revisar tras cerrar una sesión.`}
    >
      <ListFilters action="/pro/alerts" label="Filtros de alertas" values={filters}
        choices={choices} chips={chips} search={false} />
      <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
        {total === 1 ? "1 alerta encontrada" : `${total} alertas encontradas`}
      </p>

      {alerts.length === 0 && (alertList.hasActiveFilters(filters) || filters.page > 1) ? (
        <EmptyState title="No hay alertas en esta página"
          action={<ButtonLink href="/pro/alerts">Ver todas las alertas</ButtonLink>}>
          Prueba con menos filtros o vuelve a la primera página.
        </EmptyState>
      ) : alerts.length === 0 ? (
        <EmptyState title="No hay alertas disponibles">
          Aquí aparecerán los avisos que se generan al cerrar las sesiones de
          tus pacientes: dolor persistente, ejercicios saltados o asistencia
          baja.
        </EmptyState>
      ) : (
        <ul className="grid gap-5">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex">
              <article
                className={cn(cardVariants({ padding: "lg" }), "w-full min-w-0")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold">
                    {titles[alert.type]}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={alertBadgeVariant(alert.severity)}>
                      {severities[alert.severity]}
                    </Badge>
                    <Badge variant={alert.read_at ? "neutral" : "info"}>
                      {alert.read_at ? "Leída" : "Sin leer"}
                    </Badge>
                  </div>
                </div>

                <p className="mt-3">
                  {alert.patient?.full_name ?? "Paciente"}
                  {alert.exerciseName ? ` · ${alert.exerciseName}` : ""}
                  {alert.zone ? ` · ${zoneLabel(alert.zone)}` : ""}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(alert.created_at).toLocaleString("es-CO", {
                    timeZone: "America/Bogota",
                  })}
                  {actor.role === "admin"
                    ? ` · Para: ${alert.recipient?.full_name ?? "Profesional"}`
                    : ""}
                </p>

                {alert.message && (
                  <p className="mt-3 whitespace-pre-wrap break-words">
                    {alert.message}
                  </p>
                )}

                {/*
                  La tarjeta enseña la última sesión y nada más: el resto de la
                  evidencia —y lo que se registró en cada una— se lee en un
                  diálogo, encima de la lista, sin cambiar de pantalla.
                */}
                <AlertEvidence
                  title={`${titles[alert.type]} · ${alert.patient?.full_name ?? "Paciente"}`}
                  evidence={alert.evidence}
                  reports={alert.evidence.map(
                    (evidence) => reports.get(evidence.session_id) ?? null,
                  )}
                />

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <ButtonLink href={`/pro/routines/${alert.patient_id}`}>
                    Ver rutinas del paciente
                  </ButtonLink>
                </div>

                {!alert.read_at && alert.recipient_id === actor.id && (
                  <ReadAlertForm alertId={alert.id} />
                )}
              </article>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={filters.page} pages={pages}
        hrefFor={(page) => alertList.href(filters, { page })} label="Páginas de alertas" />
    </Workspace>
  );
}
