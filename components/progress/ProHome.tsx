import { Workspace } from "@/components/auth/Workspace";
import { WorkMetric } from "@/components/progress/WorkMetric";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProWorkboard } from "@/lib/progress/overview-queries";

/** "1 alerta" y "3 alertas": el recuento y su nombre se escriben una vez. */
function count(n: number, singular: string, plural: string) {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

/**
 * El panel del profesional: **lo que hay que atender hoy**, en tres cifras.
 * Cada una abre la pantalla donde se resuelve.
 *
 * Hasta KAN-5 esta pantalla y la del administrador eran la misma —`StaffHome`—
 * con siete cifras cada una. El profesional veía el cumplimiento y la
 * asistencia del negocio del mes, que no son suyos y no le dicen qué hacer
 * ahora; y el administrador veía el trabajo del día. Cada pregunta tiene ya su
 * pantalla.
 *
 * Las membresías por vencer salieron de aquí: son del administrador, como
 * decidió la matriz de `docs/04-roles-y-permisos.md`.
 *
 * RLS acota las tres cifras a los pacientes que acompaña.
 */
export async function ProHome({ name }: { name: string | null }) {
  const workboard = await getProWorkboard();
  const { unreadAlerts, todaySessions, pendingScreenings, activePatients } =
    workboard;

  return (
    <Workspace
      title="Mi panel"
      name={name}
      role="professional"
      description="Lo que pide atención hoy. El directorio y el alta están en Pacientes."
    >
      {activePatients === 0 ? (
        <EmptyState
          title="Todavía no acompañas a nadie"
          action={<ButtonLink href="/people">Ver mis pacientes</ButtonLink>}
        >
          Cuando el administrador te asigne un paciente, aquí aparecerá lo que
          tengas que atender cada día.
        </EmptyState>
      ) : (
        <section className="grid gap-6">
          <div>
            <h2 className="text-xl font-semibold">Mi trabajo de hoy</h2>
            <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
              Cada cifra abre la pantalla donde se resuelve.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <WorkMetric
              title="Mis alertas"
              value={unreadAlerts}
              href="/pro/alerts"
            >
              {unreadAlerts === 0
                ? "Ninguna alerta pendiente de revisar."
                : `${count(unreadAlerts, "alerta", "alertas")} sin abrir.`}
            </WorkMetric>

            <WorkMetric
              title="Sesiones de hoy"
              value={todaySessions}
              href="/pro/sessions"
            >
              {todaySessions === 0
                ? "Nadie ha entrenado hoy todavía."
                : `${count(todaySessions, "sesión registrada", "sesiones registradas")} con fecha de hoy.`}
            </WorkMetric>

            <WorkMetric
              title="Tamizajes pendientes"
              value={pendingScreenings}
              href="/screenings"
            >
              {pendingScreenings === 0
                ? "Todos tus pacientes tienen su evaluación inicial."
                : `${count(pendingScreenings, "paciente no tiene", "pacientes no tienen")} ningún tamizaje.`}
            </WorkMetric>
          </div>
        </section>
      )}

      <Card
        padding="lg"
        className="mt-8 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="grid gap-1">
          <CardTitle className="text-lg">Mis pacientes</CardTitle>
          <CardDescription>
            El directorio de quienes acompañas y el alta de un paciente nuevo.
          </CardDescription>
        </div>
        <ButtonLink href="/people">Ver mis pacientes</ButtonLink>
      </Card>
    </Workspace>
  );
}
