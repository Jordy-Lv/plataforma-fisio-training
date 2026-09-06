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
  title: string;
  name?: string | null;
  role?: UserRole;
  description?: ReactNode;
  actions?: ReactNode;
  withNav?: boolean;
  children: ReactNode;
}) {
  const profile = role ? null : await getActiveProfile();

  return (
    <AppShell
      role={role ?? profile?.role ?? "patient"}
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
