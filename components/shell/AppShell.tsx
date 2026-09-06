import Link from "next/link";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { cn } from "cn";

import { MobileNav } from "@/components/shell/MobileNav";
import { SidebarNav } from "@/components/shell/SidebarNav";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { signOut } from "@/lib/auth/actions";
import { rolePaths } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/schemas";

/**
 * Chrome común de la aplicación con sesión iniciada: cabecera fija, navegación
 * lateral en escritorio y barra inferior en el teléfono.
 *
 * Solo hay **un** formulario de cerrar sesión en todo el documento, aunque el
 * chrome se vea distinto según el ancho: las pruebas de `scripts/helpers/
 * auth-http.mjs` localizan los formularios por orden de aparición en el HTML
 * del servidor, y un segundo formulario desplazaría a todos los demás.
 */
export function AppShell({
  role,
  name,
  title,
  description,
  actions,
  withNav = true,
  children,
}: {
  role: UserRole;
  name?: string | null;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  /**
   * El alta del paciente (`/patient/onboarding`) lo apaga: hasta terminarla,
   * todas las secciones redirigen de vuelta y ofrecerlas sería un callejón.
   */
  withNav?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-[86rem] items-center justify-between gap-3 px-5 py-2 sm:px-8">
          {/*
            El nombre largo parte en dos líneas a 375 px y empuja los controles
            fuera de la cabecera, así que en el teléfono se usa el mismo nombre
            corto con el que la app queda instalada.
          */}
          <Link
            href={rolePaths[role]}
            className="flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="sm:hidden">Fisio Training</span>
            <span className="hidden sm:inline">Entrenamiento y fisioterapia</span>
          </Link>
          <div className="flex items-center gap-2">
            {name && (
              <p className="hidden text-sm text-muted-foreground md:block">
                Hola, {name}
              </p>
            )}
            <ThemeToggle />
            <form action={signOut}>
              <Button variant="outline" type="submit">
                <LogOut aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Cerrar sesión</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[86rem] items-start gap-8 px-5 sm:px-8">
        {/*
          `top-14` deja la barra lateral justo bajo la cabecera fija; con `h-`
          calculado a partir de ella, el menú largo del administrador se
          desplaza por su cuenta sin arrastrar la página.
        */}
        {withNav && (
          <aside className="sticky top-16 hidden w-56 shrink-0 overflow-y-auto py-8 lg:block lg:max-h-[calc(100svh-4rem)]">
            <SidebarNav role={role} />
          </aside>
        )}

        <main
          className={cn(
            "min-w-0 flex-1 py-6 lg:py-8 lg:pb-14",
            withNav ? "pb-28" : "pb-12",
          )}
        >
          {title && (
            <PageHeader
              title={title}
              description={description}
              actions={actions}
            />
          )}
          {children}
        </main>
      </div>

      {withNav && <MobileNav role={role} />}
    </div>
  );
}
