import { Workspace } from "@/components/auth/Workspace";
import { BusinessOverview } from "@/components/progress/BusinessOverview";
import { StaffWorkboard } from "@/components/progress/StaffWorkboard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import {
  getBusinessOverview,
  getStaffWorkboard,
} from "@/lib/progress/overview-queries";

/**
 * El panel de inicio del equipo. Antes montaba el directorio de personas y el
 * alta; ahora es solo el panorama del negocio del mes en curso, más un enlace
 * a la sección de personas, que es donde se crea un paciente o se da de baja a
 * alguien.
 *
 * Las cifras salen de `getBusinessOverview` y `getStaffWorkboard`, que RLS
 * acota: el administrador las ve de todo el negocio y el profesional, de los
 * pacientes que acompaña. El panorama es el resumen del mes; el panel de
 * trabajo, lo que hay que atender hoy.
 */
export async function StaffHome({
  role,
  name,
}: {
  role: "admin" | "professional";
  name: string | null;
}) {
  const [overview, workboard] = await Promise.all([
    getBusinessOverview(),
    getStaffWorkboard(),
  ]);

  return (
    <Workspace
      title={role === "admin" ? "Panel de administración" : "Mi panel"}
      name={name}
      role={role}
      description={
        role === "admin"
          ? "El estado del negocio de un vistazo. El directorio y las altas están en Personas."
          : "El estado de tus pacientes este mes. El directorio y el alta están en Pacientes."
      }
    >
      <BusinessOverview overview={overview} role={role} />

      {/* El panel de trabajo solo aparece cuando hay de quién ocuparse: sin
          pacientes activos, el panorama ya explica qué hacer primero. */}
      {overview.activePatients > 0 && <StaffWorkboard workboard={workboard} />}

      <Card
        padding="lg"
        className="mt-8 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="grid gap-1">
          <CardTitle className="text-lg">
            {role === "admin" ? "Personas y equipo" : "Mis pacientes"}
          </CardTitle>
          <CardDescription>
            {role === "admin"
              ? "El directorio completo, el alta de personas y las asignaciones de acompañamiento."
              : "El directorio de quienes acompañas y el alta de un paciente nuevo."}
          </CardDescription>
        </div>
        <ButtonLink href="/people">
          {role === "admin" ? "Ir a Personas" : "Ver mis pacientes"}
        </ButtonLink>
      </Card>
    </Workspace>
  );
}
