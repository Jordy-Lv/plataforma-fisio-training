import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/AppShell";
import { getActiveProfile } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/schemas";

/**
 * Envoltorio de pantalla. Desde la fase 2 no dibuja nada por su cuenta: monta
 * `AppShell`, que es quien tiene la navegación. Se conserva porque lo importan
 * treinta pantallas y su API no cambia.
 *
 * `role` es opcional para no reescribir esas treinta llamadas de golpe. Cuando
 * no llega, el shell lo consulta: `getActiveProfile` está memoizado por
 * petición, así que no cuesta una segunda lectura. En pantallas nuevas, pásalo.
 *
 * Para el paciente pasa además su id al shell, que pinta su plan vigente en la
 * barra sin bloquear la pantalla. `title` es opcional: la portada del paciente pinta su propio
 * saludo en lugar de la cabecera de página.
 */
export async function Workspace({
  title,
  name,
  role,
  description,
  actions,
  withNav,
  children,
}: {
  title?: string;
  name?: string | null;
  role?: UserRole;
  description?: ReactNode;
  actions?: ReactNode;
  withNav?: boolean;
  children: ReactNode;
}) {
  const profile = await getActiveProfile();
  const shellRole = role ?? profile?.role ?? "patient";
  const planPatientId =
    shellRole === "patient" && withNav !== false ? profile?.id : undefined;

  return (
    <AppShell
      role={shellRole}
      planPatientId={planPatientId}
      name={name ?? profile?.fullName}
      title={title}
      description={description}
      actions={actions}
      withNav={withNav}
    >
      {children}
    </AppShell>
  );
}
