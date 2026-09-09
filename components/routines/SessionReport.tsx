import { Badge, PainBadge, sessionBadgeVariant } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { bodyPartLabels, bodyParts } from "@/lib/catalog/body-parts";
import { formatDate, formatTime } from "@/lib/progress/vocabulary";
import { logLabels, statusLabels } from "@/lib/routines/session-labels";
import type { SessionDetails } from "@/lib/routines/session-queries";

/**
 * Lo que quedó registrado en una sesión ya cerrada. Lo ven el paciente y el
 * profesional, así que conserva el detalle de prescrito frente a real: es lo
 * que el profesional necesita para ajustar la carga.
 *
 * Vive en su propio archivo porque lo pinta tanto una pantalla del servidor
 * —`/pro/sessions/[sessionId]`, la ruta de siempre— como el diálogo de lectura
 * de `/pro/sessions` y `/pro/alerts` (15.4).
 *
 * `justClosed` lo pasa solo la pantalla del paciente justo después de cerrar:
 * el acuse de `closeSession` lo pintaría `SessionControls`, que se desmonta al
 * pasar la sesión a cerrada, así que se muestra aquí, en el árbol que sí se
 * renderiza después (docs/11, §5).
 */
export function SessionReport({
  session,
  justClosed = false,
}: {
  session: SessionDetails;
  justClosed?: boolean;
}) {
  return (
    <section className="grid gap-4">
      {justClosed && (
        <Notice tone="success">
          Sesión completada. Tu profesional ya puede consultarla.
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={sessionBadgeVariant(session.status)}>
          {statusLabels[session.status]}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {/* Fecha y hora con el mismo formato en español: antes la fecha
              venía en ISO y el cierre en formato local, en la misma línea
              (hallazgo de 9.6). */}
          Sesión del {formatDate(session.performed_on)}
          {session.completed_at
            ? ` · cerrada a las ${formatTime(session.completed_at)}`
            : ""}
        </p>
      </div>

      {session.session_logs.length === 0 ? (
        <EmptyState title="Esta sesión no tiene ejercicios marcados">
          No se registró ningún ejercicio antes de cerrarla.
        </EmptyState>
      ) : (
        session.session_logs.map((log) => (
          <article
            key={log.id}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <h2 className="min-w-0 break-words font-semibold">
                {log.exercises?.name}
              </h2>
              <Badge variant={log.status === "skipped" ? "warning" : "neutral"}>
                {logLabels[log.status]}
              </Badge>
            </div>

            <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Prescrito:</dt>
                <dd>
                  {log.prescribed_sets ?? "—"} × {log.prescribed_reps ?? "—"} ·{" "}
                  {log.prescribed_weight ?? "—"} kg
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Real:</dt>
                <dd className="font-medium">
                  {log.actual_sets ?? "—"} × {log.actual_reps ?? "—"} ·{" "}
                  {log.actual_weight ?? "—"} kg
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PainBadge level={log.pain_level} />
              {log.pain_location && (
                <Badge variant="outline">
                  {bodyPartLabels[log.pain_location as (typeof bodyParts)[number]] ??
                    log.pain_location}
                </Badge>
              )}
              <Badge variant="neutral">
                Esfuerzo: {log.perceived_effort ?? "—"}/10
              </Badge>
              {log.replacement && (
                <Badge variant="info">Sustitución: {log.replacement.name}</Badge>
              )}
            </div>

            {log.notes && (
              <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-muted-foreground">
                {log.notes}
              </p>
            )}
          </article>
        ))
      )}
    </section>
  );
}
