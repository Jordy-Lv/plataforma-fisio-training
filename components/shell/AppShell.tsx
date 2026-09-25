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
  /*
    Con menú, cabecera y cuerpo usan todo el ancho de la ventana: el menú queda
    pegado a la izquierda y el contenido aprovecha el resto. Sin menú —las
    pantallas de registro— se conserva la columna centrada.
  */
  const frame = withNav ? "" : "mx-auto max-w-[86rem]";

  return (
    <div
      className={cn(
        "flex min-h-svh flex-col bg-background",
        withNav &&
          "[--toast-inset-bottom:calc(3.5rem+env(safe-area-inset-bottom))] lg:[--toast-inset-bottom:0px]",
      )}
    >
      <ToastProvider>
        <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
          <div
            className={cn(
              "flex items-center justify-between gap-3 px-5 py-2 sm:px-8",
              frame,
            )}
          >
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
            <div className={cn("px-5 pb-2 sm:px-8", frame)}>
              <PatientSearch />
            </div>
          )}
        </header>

        <div
          className={cn(
            "flex w-full flex-1 px-5 sm:px-8",
            frame,
            withNav && "lg:pl-0",
          )}
        >
          {/*
            Con menú, la barra lateral es un riel pegado al borde izquierdo de
            la ventana, con su fondo y su borde, y ocupa todo el alto. El
            contenido usa todo el ancho restante, sin tope: en monitores
            grandes lo que crece es la escala (`app/globals.css`), no el hueco. Dentro,
            el menú es `sticky` justo bajo la cabecera fija y se desplaza por
            su cuenta si no cabe, sin arrastrar la página. La cabecera del
            personal lleva además el buscador de pacientes (111 px frente a
            67 px): con el mismo `top` para todos, al bajar la página el
            primer enlace del menú quedaba tapado por ella.
          */}
          {withNav && (
            <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
              <div
                className={cn(
                  "sticky overflow-y-auto px-3 py-8",
                  role === "patient"
                    ? "top-[4.25rem] max-h-[calc(100svh-4.25rem)]"
                    : "top-28 max-h-[calc(100svh-7rem)]",
                )}
              >
                <SidebarNav role={role} />
              </div>
            </aside>
          )}

          <main
            className={cn(
              "min-w-0 flex-1 py-6 lg:py-8 lg:pb-14",
              withNav ? "pb-28 lg:pl-8" : "pb-12",
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
