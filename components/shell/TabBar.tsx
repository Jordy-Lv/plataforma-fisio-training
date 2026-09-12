import Link from "next/link";
import { cn } from "cn";

export type Tab = { href: string; label: string };

/**
 * Banda de pestañas. La usan las secciones del menú
 * (`components/shell/SectionTabs.tsx`) y las seis vistas de un paciente
 * (`components/patients/PatientTabs.tsx`).
 *
 * Tres cosas que no son decorativas:
 *
 * - **No lleva ningún `<form>` dentro.** Son enlaces. Un `<form method="get">`
 *   aquí se colaría delante de los formularios de server action que recorren
 *   las suites (`docs/11-contratos-de-las-suites-http.md`).
 * - **No emite `value="<uuid>"`.** Cualquier identificador viaja en el `href`,
 *   que ningún marcador de las suites mira.
 * - **Se desplaza en horizontal a 375 px** en vez de partirse en dos filas, y
 *   cada pestaña mide 44 px de alto, que es el objetivo táctil mínimo.
 */
export function TabBar({
  label,
  tabs,
  activeHref,
}: {
  label: string;
  tabs: Tab[];
  activeHref: string;
}) {
  return (
    <nav
      aria-label={label}
      className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const isActive = tab.href === activeHref;
          return (
            <li key={tab.href}>
              {/* Sin precarga (KAN-19): comparte pantalla con formularios de
                  server action (la ficha del paciente, su rutina) y precargada
                  corre en carrera con el envío en curso, abortándolo a medio
                  guardar. Mismo criterio que SidebarNav, MobileNav y el logo
                  de AppShell. */}
              <Link
                href={tab.href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isActive
                    ? "border-b-brand text-brand"
                    : "border-b-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
