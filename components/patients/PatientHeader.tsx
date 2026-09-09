import { Badge, membershipBadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { severityLabels } from "@/lib/auth/onboarding-schemas";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import {
  formatDueIn,
  membershipStatusLabels,
} from "@/lib/progress/membership-vocabulary";
import type {
  OverviewCondition,
  OverviewMembership,
} from "@/lib/progress/patient-overview";

/**
 * La cabecera de la ficha de un paciente: quién es, si está activo, en qué
 * estado tiene la membresía y qué condiciones arrastra. Antes había que abrir
 * tres pantallas —perfil, membresía y condiciones— para reunir esto.
 *
 * Es solo lectura: **no lleva ningún `<form>` dentro**. Igual que `PatientTabs`,
 * si emitiera uno se colaría delante de los formularios de server action que
 * recorren las suites (`docs/11-contratos-de-las-suites-http.md`), y tampoco
 * emite `value="<uuid>"`.
 *
 * Los estados no eligen color: `membershipBadgeVariant` los traduce a un
 * semántico de la paleta (`docs/10-sistema-de-diseno.md`).
 */
export function PatientHeader({
  name,
  isActive,
  membership,
  conditions,
}: {
  name: string | null;
  isActive: boolean;
  membership: OverviewMembership | null;
  conditions: OverviewCondition[];
}) {
  return (
    <Card padding="lg" className="mb-6 grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">
          {name || "Paciente sin nombre"}
        </h2>
        <Badge variant={isActive ? "success" : "neutral"}>
          {isActive ? "Activo" : "De baja"}
        </Badge>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
        <dt className="text-muted-foreground">Membresía</dt>
        <dd className="flex flex-wrap items-center gap-2">
          {membership ? (
            <>
              <Badge variant={membershipBadgeVariant(membership.status)}>
                {membershipStatusLabels[membership.status]}
              </Badge>
              {membership.planName && <span>{membership.planName}</span>}
              {membership.expiresOn && (
                <span className="text-muted-foreground">
                  · {formatDueIn(membership.expiresOn)}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Sin membresía registrada</span>
          )}
        </dd>

        <dt className="text-muted-foreground">Condiciones activas</dt>
        <dd className="flex flex-wrap items-center gap-2">
          {conditions.length === 0 ? (
            <span className="text-muted-foreground">Ninguna registrada</span>
          ) : (
            conditions.map((condition) => (
              <Badge key={condition.id} variant="warning">
                {bodyPartLabels[
                  condition.bodyPart as keyof typeof bodyPartLabels
                ] ?? condition.bodyPart}
                {" · "}
                {severityLabels[condition.severity]}
              </Badge>
            ))
          )}
        </dd>
      </dl>
    </Card>
  );
}
