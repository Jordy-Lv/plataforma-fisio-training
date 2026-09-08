import type { Metadata } from "next";

import { PeoplePanel } from "@/components/auth/PeoplePanel";
import { requireStaff } from "@/lib/progress/access";

export const metadata: Metadata = {
  title: "Personas y equipo",
};

/**
 * El directorio de personas y el alta viven aquí, no en el panel de inicio:
 * `/admin` y `/pro` son ahora el panorama del negocio, y crear un paciente o
 * dar de baja a alguien es una tarea aparte. `requireStaff` decide el rol
 * —administrador o profesional— y `PeoplePanel` ajusta lo que muestra.
 */
export default async function Page() {
  const profile = await requireStaff();

  return (
    <PeoplePanel role={profile.role as "admin" | "professional"} />
  );
}
