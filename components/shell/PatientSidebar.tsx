"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "cn";

import { activeNavHref, navItemsByRole } from "@/components/shell/nav-items";
import { useIntentPrefetch } from "@/components/shell/use-intent-prefetch";

/** Cookie que recuerda el menú plegado. La lee `AppShell` en el servidor. */
export const SIDEBAR_COOKIE = "patient-sidebar";

/** Las secciones del paciente, en dos grupos: lo que hace y su cuenta. */
const GROUPS = [
  { label: "Entrenar", hrefs: ["/patient", "/routine", "/routine/calendar"] },
  { label: "Mi cuenta", hrefs: ["/attendance/me", "/memberships/me", "/patient/profile"] },
];

/*
  Menú lateral del paciente en escritorio, plegable.

  Las secciones van en dos grupos, «Entrenar» y «Mi cuenta». La activa se marca
  con una píldora dorada translúcida, una barrita dorada a la izquierda y el
  icono en dorado; las demás van apagadas y se encienden al pasar el ratón.

  Al pie, la tarjeta del plan (`footer`, la pinta `AppShell` en el servidor) y
  el botón de plegar. Plegado se queda en un riel de iconos: los grupos se
  vuelven una línea, el plan se esconde y el nombre de cada sección va en
  `title` y `aria-label`.

  El estado se guarda en una cookie y no en `localStorage` para que el servidor
  pinte el menú ya plegado: con `localStorage` se vería abierto un instante y se
  cerraría al hidratar, desplazando todo el contenido.

  El botón de plegar es un `<button>` sin `<form>`: `/patient` no puede ganar
  formularios (el primero tiene que seguir siendo el de cerrar sesión, `docs/11`).
*/
export function PatientSidebar({
  initialCollapsed,
  footer,
}: {
  initialCollapsed: boolean;
  /** Lo que va al pie, encima del botón de plegar (la tarjeta del plan). */
  footer?: ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const active = activeNavHref("patient", usePathname());
  const intent = useIntentPrefetch();
  const items = navItemsByRole.patient;

  function toggle() {
    const next = !isCollapsed;
    setIsCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  }

  const FoldIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      data-collapsed={isCollapsed}
      className={cn(
        "group/side relative hidden shrink-0 border-r border-border bg-surface transition-[width] duration-200 lg:block",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      <div className="sticky top-[61px] flex h-[calc(100svh-61px)] flex-col px-3 pb-4 pt-5">
        <nav aria-label="Secciones" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {GROUPS.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-4")}>
              {isCollapsed ? (
                groupIndex > 0 && <hr className="mx-3 mb-4 border-border" />
              ) : (
                <h2 className="mb-1.5 px-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                  {group.label}
                </h2>
              )}
              <ul className="grid gap-1">
                {items
                  .filter((item) => group.hrefs.includes(item.href))
                  .map((item) => {
                    const isActive = active === item.href;
                    return (
                      <li key={item.href}>
                        {/* Precarga solo con intención (KAN-19): ver `useIntentPrefetch`. */}
                        <Link
                          href={item.href}
                          prefetch={false}
                          {...intent(item.href)}
                          aria-current={isActive ? "page" : undefined}
                          aria-label={isCollapsed ? item.label : undefined}
                          title={isCollapsed ? item.label : undefined}
                          className={cn(
                            "relative flex h-11 items-center gap-3 whitespace-nowrap rounded-xl text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            isCollapsed ? "justify-center" : "px-3",
                            isActive
                              ? "bg-brand-bright/14 font-bold text-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-brand-bright"
                            />
                          )}
                          <item.icon
                            aria-hidden="true"
                            className={cn("size-5 shrink-0", isActive && "text-brand-bright")}
                          />
                          {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="grid gap-2 border-t border-border pt-3">
          {footer}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Desplegar menú" : "Plegar menú"}
            title={isCollapsed ? "Desplegar menú" : "Plegar menú"}
            className={cn(
              "flex h-10 items-center gap-2.5 rounded-xl text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isCollapsed ? "justify-center" : "px-3",
            )}
          >
            <FoldIcon aria-hidden="true" className="size-[18px]" />
            {!isCollapsed && "Plegar menú"}
          </button>
        </div>
      </div>
    </aside>
  );
}
