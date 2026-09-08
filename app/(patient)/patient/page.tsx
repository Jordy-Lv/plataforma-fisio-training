import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Flame } from "lucide-react";
import { cn } from "cn";

import { Workspace } from "@/components/auth/Workspace";
import { OpenSessionCard } from "@/components/routines/OpenSessionCard";
import { WeekStrip } from "@/components/patients/WeekStrip";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth/session";
import { patientOverview } from "@/lib/progress/patient-overview";

export const metadata: Metadata = {
  title: "Mi espacio",
};

/*
  Contexto temporal antes que menú.

  La portada repetía los cuatro destinos de la barra inferior con una frase cada
  uno: cuatro tarjetas para llegar a sitios que ya estaban a un dedo de
  distancia en todas las pantallas. Ahora responde a lo que el paciente viene a
  mirar —en qué día está, si ya entrenó esta semana y si dejó algo a medias—,
  que es la decisión de portada de la referencia
  (`docs/13-referencia-smart-fit.md`, 1.5).

  Los cuatro destinos no se pierden: siguen en la barra inferior del teléfono y
  en la barra lateral del escritorio, que es de donde salían.
*/

/** El plural en español no sale de añadir una `s`, y sin racha no hay frase. */
function textoDeRacha(semanas: number) {
  if (semanas === 0) return null;
  return semanas === 1
    ? "Llevas 1 semana seguida entrenando"
    : `Llevas ${semanas} semanas seguidas entrenando`;
}

export default async function Page() {
  const profile = await requireRole("patient");
  const overview = await patientOverview(profile.id);
  const racha = textoDeRacha(overview.streakWeeks);

  return (
    <Workspace
      title="Mi espacio"
      name={profile.fullName}
      role="patient"
      description="Tu semana de un vistazo. Tu rutina, tu asistencia y tu membresía están en el menú."
    >
      <div className="grid gap-6">
        <Card padding="lg" className="grid gap-5">
          <WeekStrip week={overview.week} />
          <p className="flex items-center gap-2 text-sm">
            <Flame
              aria-hidden="true"
              className={cn(
                "size-5 shrink-0",
                racha ? "text-brand" : "text-muted-foreground",
              )}
            />
            <span className={racha ? "font-medium" : "text-muted-foreground"}>
              {racha ?? "Aún no has entrenado esta semana. Una sesión la empieza."}
            </span>
          </p>
        </Card>

        {overview.openSession ? (
          <OpenSessionCard session={overview.openSession} />
        ) : (
          <Card interactive padding="lg">
            <CardTitle className="flex items-center gap-3 text-lg">
              <ArrowRight
                aria-hidden="true"
                className="size-5 shrink-0 text-brand"
              />
              <Link
                href="/routine"
                className="rounded-lg after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Ir a mi rutina
              </Link>
            </CardTitle>
            <CardDescription>
              Los ejercicios de cada día, con sus series, sus pesos y cómo se
              hacen.
            </CardDescription>
          </Card>
        )}
      </div>
    </Workspace>
  );
}
