import { Workspace } from "@/components/auth/Workspace";
import { BusinessOverview } from "@/components/progress/BusinessOverview";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getBusinessOverview } from "@/lib/progress/overview-queries";

/**
 * El panel del administrador: **el estado del negocio este mes**, en tres
 * cifras. Clientes activos, cumplimiento y asistencia.
 *
 * Hasta KAN-5 esta pantalla y la del profesional eran la misma —`StaffHome`—
 * con siete cifras cada una y solo los títulos cambiando. Eran dos preguntas
 * distintas metidas en una: «¿cómo va el negocio?» y «¿qué tengo que atender
 * hoy?». Ahora cada una tiene su pantalla y sus tres cifras.
 *
 * Lo que pide atención hoy —alertas, sesiones, tamizajes— vive en `/pro`, y
 * las membresías por vencer, en `/memberships`. Nada de eso desaparece: deja
 * de competir por el primer vistazo, que es lo que esta pantalla tiene que
 * responder en segundos.
 */
export async function AdminHome({ name }: { name: string | null }) {
  const overview = await getBusinessOverview();

  return (
    <Workspace
      title="Panel de administración"
      name={name}
      role="admin"
      description="El estado del negocio de un vistazo. El directorio y las altas están en Personas."
    >
      <BusinessOverview overview={overview} />

      <Card
        padding="lg"
        className="mt-8 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="grid gap-1">
          <CardTitle className="text-lg">Personas y equipo</CardTitle>
          <CardDescription>
            El directorio completo, el alta de personas y las asignaciones de
            acompañamiento.
          </CardDescription>
        </div>
        <ButtonLink href="/people">Ir a Personas</ButtonLink>
      </Card>
    </Workspace>
  );
}
