"use client";

import { SessionReport } from "@/components/routines/SessionReport";
import { Badge, PainBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { DetailDialog } from "@/components/ui/DetailDialog";
import { bodyPartLabels, bodyParts } from "@/lib/catalog/body-parts";
import { formatDate } from "@/lib/progress/vocabulary";
import type { ClinicalAlert } from "@/lib/routines/alert-queries";
import type { SessionDetails } from "@/lib/routines/session-queries";

type Evidence = ClinicalAlert["evidence"][number];

/** La zona del cuerpo en español, o el código si llega uno desconocido. */
const zoneLabel = (zone: string) =>
  bodyPartLabels[zone as (typeof bodyParts)[number]] ?? zone;

/**
 * Una sesión que motivó la alerta. En la tarjeta se resume —fecha, dolor, zona
 * y nota—; dentro del diálogo (`expanded`) se acompaña del informe completo de
 * esa sesión y de la salida a su ruta propia.
 */
function EvidenceItem({
  evidence,
  report,
  expanded = false,
}: {
  evidence: Evidence;
  report?: SessionDetails | null;
  expanded?: boolean;
}) {
  return (
    <div className="grid gap-2 rounded-lg bg-muted p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          Sesión del {formatDate(evidence.performed_on)}
        </span>
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
      {expanded && (
        <>
          {report ? (
            <div className="border-t border-border pt-3">
              <SessionReport session={report} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              El registro de esta sesión ya no está disponible.
            </p>
          )}
          <ButtonLink
            variant="ghost"
            className="justify-self-start"
            href={`/pro/sessions/${evidence.session_id}`}
          >
            Abrir la sesión completa
          </ButtonLink>
        </>
      )}
    </div>
  );
}

/**
 * La evidencia de una alerta: en la tarjeta, la última sesión; detrás, todas
 * ellas con lo que el paciente registró en cada una (15.3, 15.4).
 *
 * Antes esto era un `<details>` que, al abrirlo, empujaba el resto de la lista
 * hacia abajo. En una pantalla de triaje —veinte alertas por página— leer una
 * no puede mover las otras diecinueve.
 *
 * **El contenido se emite siempre** (`keepMounted`): el diálogo no usa portal y
 * `verify-routine-sessions` lee del HTML del servidor de `/pro/alerts` la nota
 * de la tercera sesión del camino 5.
 */
export function AlertEvidence({
  title,
  evidence,
  reports,
}: {
  /** Encabezado del diálogo: el motivo de la alerta y el paciente. */
  title: string;
  evidence: Evidence[];
  /** Informe de cada sesión, en el mismo orden que `evidence`. */
  reports: (SessionDetails | null)[];
}) {
  if (evidence.length === 0) return null;

  return (
    <div className="mt-4 grid gap-3">
      <EvidenceItem evidence={evidence[0]} />
      <DetailDialog
        title={title}
        description={
          evidence.length === 1
            ? "La sesión que motivó esta alerta."
            : `Las ${evidence.length} sesiones que motivaron esta alerta.`
        }
        triggerClassName="justify-self-start px-2"
        trigger={
          evidence.length === 1
            ? "Ver lo que registró en esa sesión"
            : `Ver las ${evidence.length} sesiones`
        }
        keepMounted
      >
        {evidence.map((item, index) => (
          <EvidenceItem
            key={`${item.session_id}-${index}`}
            evidence={item}
            report={reports[index]}
            expanded
          />
        ))}
      </DetailDialog>
    </div>
  );
}
