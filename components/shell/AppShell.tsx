import { CLIENT_NAME } from "@/lib/brand/client";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { cn } from "cn";

import { MobileNav } from "@/components/shell/MobileNav";
import { SectionTabs } from "@/components/shell/SectionTabs";
import { SidebarNav } from "@/components/shell/SidebarNav";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ToastProvider } from "@/components/ui/Toast";
import { PatientSearch } from "@/components/auth/PatientSearch";
import { signOut } from "@/lib/auth/actions";
import { rolePaths } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/schemas";

/**
 * Chrome común de la aplicación con sesión iniciada: cabecera fija, navegación
 * lateral en escritorio y barra inferior en el teléfono.
 *
 * Solo hay **un** formulario de cerrar sesión en todo el documento, aunque el
 * chrome se vea distinto según el ancho: las pruebas de `scripts/helpers/
 * auth-http.mjs` localizan formularios sin marcador por el primero que
 * aparece en el HTML del servidor. Por eso el buscador de paciente —el otro
 * `<form>` del chrome, para `admin` y `professional`— se declara *después*
 * del de cerrar sesión: cualquier `submit(ruta, valores)` sin marcador debe
 * seguir encontrando el de cerrar sesión primero.
 *
 * Monta también el emisor de avisos, para que cualquier pantalla con sesión
 * pueda usar `useToast` sin repetir el proveedor. En el teléfono los avisos se
 * suben por encima de la barra inferior con `--toast-inset-bottom`; si no, el
 * aviso caía justo debajo y el pulgar no llegaba a cerrarlo.
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
    <div
      className={cn(
        "min-h-svh bg-background",
        withNav &&
          "[--toast-inset-bottom:calc(3.5rem+env(safe-area-inset-bottom))] lg:[--toast-inset-bottom:0px]",
      )}
    >
      <ToastProvider>
        <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-[86rem] items-center justify-between gap-3 px-5 py-2 sm:px-8">
            {/*
              El nombre del cliente se conserva en móvil y en la app instalada.
            */}
            {/* Sin precarga (KAN-19): está en todas las pantallas, así que
                precargada corría en carrera con cualquier server action en
                curso y la abortaba a medio guardar. Mismo criterio que
                SidebarNav y MobileNav. */}
            <Link
              href={rolePaths[role]}
              prefetch={false}
              className="flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {CLIENT_NAME}
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

          {role !== "patient" && (
            <div className="mx-auto max-w-[86rem] px-5 pb-2 sm:px-8">
              <PatientSearch />
            </div>
          )}
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
            {/*
              Las pestañas de la sección van **encima** del título: son
              navegación entre pantallas hermanas, no parte de esta. Solo
              aparecen cuando la entrada activa del menú tiene apartados.
            */}
            {withNav && <SectionTabs role={role} />}
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
      </ToastProvider>
    </div>
  );
}
