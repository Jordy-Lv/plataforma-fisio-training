"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "cn";

import {
  activeNavHref,
  navItemsByRole,
  needsNavOverflow,
  primaryNavItems,
} from "@/components/shell/nav-items";
import type { UserRole } from "@/lib/auth/schemas";

const tabClass =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium leading-tight transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

/**
 * Navegación del teléfono: barra fija abajo, donde llega el pulgar. La barra
 * tiene seis plazas, así que el paciente ve sus **seis** secciones sin botón de
 * «Menú», y el equipo ve **cinco de ocho** más el botón. Antes el equipo tenía
 * trece secciones y la barra enseñaba cuatro: escondía dos tercios de la
 * aplicación, y el paciente, con seis, veía solo cuatro.
 *
 * El panel se cierra solo al cambiar de ruta: sin eso taparía la pantalla
 * recién abierta, ya que Next conserva el árbol de React al navegar.
 */
export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const active = activeNavHref(role, pathname);
  const items = primaryNavItems(role);
  const hasOverflow = needsNavOverflow(role);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="lg:hidden">
      {/*
        El panel va desde debajo de la cabecera (`top-16`) hasta el borde
        inferior, con `pb-24` para que la última entrada no quede debajo de la
        barra, que se dibuja encima por su `z-40`. Es opaco: con un fondo
        translúcido, el texto de la página de detrás se mezclaba con el del menú.

        Lista las ocho secciones **con sus apartados**, para que el panel sea el
        mapa completo y no haya que entrar en una sección para descubrir qué
        contiene.
      */}
      {hasOverflow && isOpen && (
        <div
          id={panelId}
          className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto overscroll-contain bg-background px-5 pb-24 pt-6"
        >
          <nav aria-label="Todas las secciones" className="grid gap-1">
            <ul className="grid gap-0.5">
              {navItemsByRole[role].map((item) => (
                <li key={item.href} className="grid gap-0.5">
                  <Link
                    href={item.href}
                    aria-current={active === item.href ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-lg px-3 font-medium",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active === item.href
                        ? "bg-brand-soft text-brand-soft-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <item.icon aria-hidden="true" className="size-5 shrink-0" />
                    {item.label}
                  </Link>
                  {item.tabs && (
                    <ul className="grid gap-0.5 pl-11">
                      {item.tabs.map((tab) => (
                        <li key={tab.href}>
                          <Link
                            href={tab.href}
                            className="flex min-h-11 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            {tab.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {/*
        El fondo ocupa todo el ancho, pero las pestañas se agrupan en el centro:
        estiradas de borde a borde en una tableta quedaban a un palmo unas de
        otras y el recorrido del pulgar era absurdo.
      */}
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-panel"
      >
        <div className="mx-auto flex max-w-md">
          {items.map((item) => {
            const isActive = active === item.href && !isOpen;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  tabClass,
                  isActive ? "text-brand" : "text-muted-foreground",
                )}
              >
                <item.icon aria-hidden="true" className="size-5" />
                {item.label}
              </Link>
            );
          })}
          {hasOverflow && (
            <button
              type="button"
              onClick={() => setIsOpen((open) => !open)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className={cn(
                tabClass,
                isOpen ? "text-brand" : "text-muted-foreground",
              )}
            >
              {isOpen ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
              {isOpen ? "Cerrar" : "Menú"}
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
