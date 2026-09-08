import { redirect } from "next/navigation";
import { cn } from "cn";
import { getActiveProfile } from "@/lib/auth/session";
import { clinicalAlerts } from "@/lib/routines/alert-queries";
import { Workspace } from "@/components/auth/Workspace";
import { ReadAlertForm } from "@/components/routines/ReadAlertForm";
import { Badge, alertBadgeVariant, PainBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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

/** La zona del cuerpo en español, o el código si llega uno desconocido. */
const zoneLabel = (zone: string) =>
  bodyPartLabels[zone as (typeof bodyParts)[number]] ?? zone;

type Evidence = Awaited<
  ReturnType<typeof clinicalAlerts>
>[number]["evidence"][number];

/** Una sesión que motivó la alerta: nivel de dolor, zona, nota y enlace. */
function EvidenceItem({ evidence }: { evidence: Evidence }) {
  return (
    <div className="grid gap-2 rounded-lg bg-muted p-3">
      <div className="flex flex-wrap items-center gap-2">
        <PainBadge level={evidence.pain_level} />
        {evidence.pain_location && (
          <Badge>{zoneLabel(evidence.pain_location)}</Badge>
        )}
      </div>
      {evidence.notes && (
        <p className="whitespace-pre-wrap break-words text-sm">
          {evidence.notes}
        </p>
      )}
      <ButtonLink
        variant="ghost"
        className="justify-self-start"
        href={`/pro/sessions/${evidence.session_id}`}
      >
        Ver sesión del {evidence.performed_on}
      </ButtonLink>
    </div>
  );
}

export default async function Page() {
  const actor = await getActiveProfile();
  if (!actor) redirect("/login");
  if (actor.role === "patient") redirect("/patient");

  const alerts = await clinicalAlerts();
  const sinLeer = alerts.filter(
    (alert) => alert.recipient_id === actor.id && !alert.read_at,
  ).length;

  return (
    <Workspace
      title={actor.role === "admin" ? "Todas las alertas" : "Mis alertas"}
      name={actor.fullName}
      description={`${sinLeer} sin leer para ti entre las últimas 200 alertas.`}
    >
      {alerts.length === 0 ? (
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

                {alert.evidence.length > 0 && (
                  <div className="mt-4 grid gap-3">
                    <EvidenceItem evidence={alert.evidence[0]} />
                    {alert.evidence.length > 1 && (
                      // La evidencia restante se pliega: una alerta con tres
                      // sesiones baja de ~658 px a ~240. Cerrado, el `<details>`
                      // deja las otras sesiones en el HTML del servidor —sin
                      // JavaScript se abre igual—, que es lo que lee
                      // `verify-routine-sessions` («Camino 5: sesión 3»).
                      <details className="rounded-lg border border-border px-3">
                        <summary className="flex min-h-11 cursor-pointer items-center py-2.5 text-sm font-medium text-brand">
                          Ver las otras {alert.evidence.length - 1}{" "}
                          {alert.evidence.length - 1 === 1
                            ? "sesión"
                            : "sesiones"}
                        </summary>
                        <div className="grid gap-3 pb-3">
                          {alert.evidence.slice(1).map((evidence, index) => (
                            <EvidenceItem
                              key={`${evidence.session_id}-${index}`}
                              evidence={evidence}
                            />
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}

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
    </Workspace>
  );
}
