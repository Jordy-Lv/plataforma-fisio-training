import { CLIENT_NAME } from "@/lib/brand/client";
import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense, type ReactNode } from "react";
import { LogOut, UserRound } from "lucide-react";
import { cn } from "cn";

import { ClientWordmark } from "@/components/brand/ClientWordmark";
import { MobileNav } from "@/components/shell/MobileNav";
import {
  PatientSidebar,
  SIDEBAR_COOKIE,
} from "@/components/shell/PatientSidebar";
import { SectionTabs } from "@/components/shell/SectionTabs";
import { SidebarPlan } from "@/components/shell/SidebarPlan";
import { SidebarNav } from "@/components/shell/SidebarNav";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
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
 * El paciente tiene su propia barra y su propio menú (2026-10-03): la barra es
 * oscura en los dos temas (clase `dark`, así sus tokens toman la paleta oscura
 * sin colores escritos a mano) y lleva la marca y el saludo; su plan vigente va
 * en la tarjeta del pie del menú lateral (`SidebarPlan`), que se pliega
 * (`PatientSidebar`). El personal conserva los suyos.
 * El botón de cerrar sesión sigue llamándose «Cerrar sesión»: `test:smoke` lo
 * busca por ese nombre exacto.
 *
 * Monta también el emisor de avisos, para que cualquier pantalla con sesión
 * pueda usar `useToast` sin repetir el proveedor. En el teléfono los avisos se
 * suben por encima de la barra inferior con `--toast-inset-bottom`; si no, el
 * aviso caía justo debajo y el pulgar no llegaba a cerrarlo.
 */
export async function AppShell({
  role,
  planPatientId,
  name,
  title,
  description,
  actions,
  withNav = true,
  children,
}: {
  role: UserRole;
  /**
   * Id del paciente cuyo plan vigente («Mensual», «Básico»…) va en la tarjeta
   * del pie de su menú lateral. Se lee dentro de un `Suspense`: la pantalla no
   * espera a esa consulta.
   */
  planPatientId?: string;
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
  const isPatient = role === "patient";
  const isSidebarCollapsed =
    isPatient &&
    (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";
  const firstName = name?.trim().split(/\s+/)[0];

  const signOutForm = (
    <form action={signOut}>
      <Button variant={isPatient ? "ghost" : "outline"} type="submit">
        <LogOut aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Cerrar sesión</span>
      </Button>
    </form>
  );

  return (
    <div
      className={cn(
        "flex min-h-svh flex-col bg-background",
        withNav &&
          "[--toast-inset-bottom:calc(3.5rem+env(safe-area-inset-bottom))] lg:[--toast-inset-bottom:0px]",
      )}
    >
      <ToastProvider>
        {isPatient ? (
          <header className="dark sticky top-0 z-40 border-b border-border bg-background text-foreground">
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 sm:gap-6 sm:px-7",
                frame,
              )}
            >
              <ClientWordmark href={rolePaths.patient} className="mr-auto" />
              {firstName && (
                <p className="hidden items-center gap-2.5 whitespace-nowrap text-[15px] font-bold lg:flex">
                  <span
                    aria-hidden="true"
                    className="grid size-8 place-items-center rounded-full bg-brand-bright text-brand-bright-foreground"
                  >
                    <UserRound className="size-4" />
                  </span>
                  ¡Hola, {firstName}!
                </p>
              )}
              {/* Botón de tema único sol/luna */}
              <ThemeSwitch />
              {signOutForm}
            </div>
          </header>
        ) : (
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
                <ThemeSwitch />
                {signOutForm}
              </div>
            </div>

            <div className={cn("px-5 pb-2 sm:px-8", frame)}>
              <PatientSearch />
            </div>
          </header>
        )}

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
            contenido llega hasta 100rem (1600 px, donde empieza la clase
            «extra-large» de Material 3) y se centra en el espacio que queda:
            en un monitor grande el margen sobrante se reparte a los dos lados
            en vez de acumularse a la derecha. El texto no se escala: de eso
            se encargan el sistema operativo y el zoom del navegador. Dentro,
            el menú es `sticky` justo bajo la cabecera fija y se desplaza por
            su cuenta si no cabe, sin arrastrar la página. La cabecera del
            personal lleva además el buscador de pacientes (111 px frente a
            67 px): con el mismo `top` para todos, al bajar la página el
            primer enlace del menú quedaba tapado por ella.
          */}
          {withNav && isPatient && (
            <PatientSidebar
              initialCollapsed={isSidebarCollapsed}
              footer={
                planPatientId && (
                  <Suspense fallback={null}>
                    <SidebarPlan patientId={planPatientId} />
                  </Suspense>
                )
              }
            />
          )}
          {withNav && !isPatient && (
            <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
              <div
                className="sticky top-28 max-h-[calc(100svh-7rem)] overflow-y-auto px-3 py-8"
              >
                <SidebarNav role={role} />
              </div>
            </aside>
          )}

          <main
            className={cn(
              "min-w-0 flex-1 py-3 sm:py-4 lg:py-4",
              withNav ? "pb-24 lg:pb-4 lg:mx-auto lg:max-w-[100rem] lg:pl-8" : "pb-12",
            )}
          >
            {isPatient && title ? (
              /*
                Pantallas del paciente, al estilo de la app de Smart Fit: título
                grande con sus acciones en píldora, debajo las pestañas de la
                sección (si las hay) y detrás el brillo dorado de la portada, que
                arranca pegado a la barra. La portada (`/patient`) no lleva
                título: pinta su propia cabecera.
              */
              <div className="relative isolate mb-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-x-5 -top-3 -z-10 h-56 bg-[radial-gradient(ellipse_120%_100%_at_75%_0%,color-mix(in_srgb,var(--brand-bright)_20%,transparent),transparent_70%)] sm:-inset-x-8 sm:-top-4 lg:bg-[radial-gradient(ellipse_70%_100%_at_70%_0%,color-mix(in_srgb,var(--brand-bright)_18%,transparent),transparent_70%)]"
                />
                <PageHeader
                  variant="hero"
                  title={title}
                  description={description}
                  actions={actions}
                />
                {withNav && <SectionTabs role={role} variant="hero" />}
              </div>
            ) : (
              <>
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
              </>
            )}
            {children}
          </main>
        </div>

        {withNav && <MobileNav role={role} />}
      </ToastProvider>
    </div>
  );
}
