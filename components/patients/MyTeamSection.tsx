import { Activity, Dumbbell } from "lucide-react";
import { cn } from "cn";

import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { specialtyLabels } from "@/lib/auth/people-schemas";
import type { CareTeamMember } from "@/lib/auth/care-team";

/*
  «Mi equipo» en el perfil del propio paciente: qué especialidades le
  acompañan y cuáles aún no tiene. A ella llevan la tarjeta «Mi equipo» de la
  portada del teléfono (`/patient/profile#equipo`).

  Solo lectura y sin `<form>`: el primer formulario de `/patient/profile` tiene
  que seguir siendo el de `name="goal"` (`docs/11`). Asignar y cerrar
  acompañamientos es del administrador, en `/people`.

  El nombre del profesional sale solo si la RLS deja leerlo; hoy no deja al
  paciente leer el perfil de su profesional, así que se ve la especialidad con
  «Te acompaña» (igual que en la portada).
*/
const SLOTS = [
  { kind: "training" as const, icon: Dumbbell, tone: "text-brand-bright" },
  { kind: "physio" as const, icon: Activity, tone: "text-info" },
];

export function MyTeamSection({ team }: { team: CareTeamMember[] }) {
  return (
    <Card id="equipo" padding="lg" className="mb-6 grid scroll-mt-24 gap-4">
      <div className="grid gap-1">
        <CardTitle className="text-xl">Mi equipo</CardTitle>
        <CardDescription>
          Los profesionales que preparan tu rutina y siguen tu evolución.
        </CardDescription>
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {SLOTS.map(({ kind, icon: Icon, tone }) => {
          const member = team.find((entry) => entry.kind === kind);
          return (
            <li
              key={kind}
              className={cn(
                "flex items-center gap-3 rounded-xl p-3",
                member ? "border border-border bg-muted/70" : "border border-dashed border-border",
              )}
            >
              <span aria-hidden="true" className="grid size-10 flex-none place-items-center rounded-full bg-surface">
                <Icon className={cn("size-5", member ? tone : "text-muted-foreground")} />
              </span>
              <span className="min-w-0">
                <b className={cn("block truncate text-[15px]", !member && "font-medium text-muted-foreground")}>
                  {member?.professionalName ?? specialtyLabels[kind]}
                </b>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {member && <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />}
                  {member
                    ? member.professionalName
                      ? specialtyLabels[kind]
                      : "Te acompaña"
                    : "Sin asignar"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-sm text-muted-foreground">
        {team.length === 0
          ? "Aún no tienes profesional asignado. El equipo te lo asignará tras tu evaluación inicial."
          : "Si necesitas cambiar de profesional, pídeselo al administrador."}
      </p>
    </Card>
  );
}
