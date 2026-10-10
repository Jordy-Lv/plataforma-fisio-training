import Link from "next/link";
import { Activity, ChevronRight, Dumbbell, ShieldCheck } from "lucide-react";
import { cn } from "cn";

import { Card } from "@/components/ui/Card";
import { specialtyLabels } from "@/lib/auth/people-schemas";
import type { CareTeamMember } from "@/lib/auth/care-team";

export type CareZone = { id: string; label: string; severity: string };

/*
  «Tu equipo» en la portada del paciente: qué especialidades le acompañan y qué
  zonas tiene en cuidado, para que entrene sabiendo qué vigilar.

  Soporta todos los estados posibles:
  1. Ambos asignados (Entrenamiento y Fisioterapia).
  2. Solo uno asignado (el asignado activo y el otro con slot punteado «Sin asignar»).
  3. Ninguno asignado (ambos en slot punteado con aviso informativo de valoración inicial).
*/
export function CareCard({ team, zones }: { team: CareTeamMember[]; zones: CareZone[] }) {
  const training = team.find((m) => m.kind === "training");
  const physio = team.find((m) => m.kind === "physio");

  const specialties = [
    {
      kind: "training" as const,
      label: specialtyLabels.training,
      member: training,
      icon: Dumbbell,
      badgeColor: "bg-brand-soft text-brand-soft-foreground",
      emptyNotice: "Sin asignar",
    },
    {
      kind: "physio" as const,
      label: specialtyLabels.physio,
      member: physio,
      icon: Activity,
      badgeColor: "bg-info-soft text-info",
      emptyNotice: "Sin asignar",
    },
  ];

  return (
    <Card padding="default" className="grid content-start gap-3">
      <div className="-my-1 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-muted-foreground">Tu equipo</h2>
        <Link
          href="/patient/profile"
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-0.5 rounded-lg text-sm font-bold text-brand hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Mi perfil
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {specialties.map(({ kind, label, member, icon: DefaultIcon, emptyNotice }) => {
          const isAssigned = !!member;
          const name = member?.professionalName;

          if (isAssigned) {
            return (
              <div
                key={kind}
                className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/70 p-2.5 transition-colors"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 flex-none items-center justify-center"
                >
                  <DefaultIcon
                    className={cn(
                      "size-5",
                      kind === "training" ? "text-brand-bright" : "text-info",
                    )}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm font-bold text-foreground">
                    {name ?? label}
                  </b>
                  <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-success inline-block shrink-0" />
                    {name ? label : "Te acompaña"}
                  </span>
                </span>
              </div>
            );
          }

          return (
            <div
              key={kind}
              className="flex items-center gap-2.5 rounded-xl border border-dashed border-border/80 bg-muted/20 p-2.5"
            >
              <span
                aria-hidden="true"
                className="flex size-8 flex-none items-center justify-center opacity-40"
              >
                <DefaultIcon className="size-5 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-muted-foreground">
                  {label}
                </span>
                <span className="block truncate text-xs text-muted-foreground/70">
                  {emptyNotice}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {team.length === 0 && (
        <p className="rounded-lg border border-border/50 bg-surface/50 px-2.5 py-1.5 text-xs text-muted-foreground">
          Tu profesional será asignado tras tu valoración inicial.
        </p>
      )}

      <div className="mt-0.5">
        <h3 className="mb-1.5 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Zonas a cuidar
        </h3>
        {zones.length === 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-brand" />
            Sin zonas de cuidado registradas.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {zones.map((zone) => (
              <li
                key={zone.id}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold"
              >
                {zone.label}{" "}
                <span className="font-normal text-muted-foreground">· {zone.severity}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
