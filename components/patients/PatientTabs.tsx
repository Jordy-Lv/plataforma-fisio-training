import Link from "next/link";
import { cn } from "cn";

/**
 * Las seis vistas de un paciente, y la clave con la que cada pantalla dice
 * cuál está mirando.
 */
export type PatientTab =
  | "profile"
  | "routine"
  | "sessions"
  | "screenings"
  | "attendance"
  | "evolution";

const tabs: { key: PatientTab; label: string; href: (id: string) => string }[] = [
  { key: "profile", label: "Ficha", href: (id) => `/people/${id}` },
  { key: "routine", label: "Rutina", href: (id) => `/pro/routines/${id}` },
  {
    key: "sessions",
    label: "Sesiones",
    href: (id) => `/pro/sessions?patient=${id}`,
  },
  { key: "screenings", label: "Tamizajes", href: (id) => `/screenings/${id}` },
  { key: "attendance", label: "Asistencia", href: (id) => `/attendance/${id}` },
  { key: "evolution", label: "Evolución", href: (id) => `/evolution/${id}` },
];

/**
 * Banda de pestañas de un paciente. Antes, para pasar de su rutina a su
 * asistencia había que volver a la lista y buscarlo otra vez; aquí las seis
 * vistas están siempre a un toque.
 *
 * Tres cosas que no son decorativas:
 *
 * - **No lleva ningún `<form>` dentro.** Son enlaces. Un `<form method="get">`
 *   aquí se colaría delante de los formularios de server action que recorren
 *   las suites (`docs/11-contratos-de-las-suites-http.md`).
 * - **No emite `value="<uuid>"`.** El identificador del paciente viaja en el
 *   `href`, que ningún marcador de las suites mira.
 * - **Se desplaza en horizontal a 375 px** en vez de partirse en dos filas, y
 *   cada pestaña mide 44 px de alto, que es el objetivo táctil mínimo.
 */
export function PatientTabs({
  patientId,
  active,
}: {
  patientId: string;
  active: PatientTab;
}) {
  return (
    <nav
      aria-label="Secciones del paciente"
      className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href(patientId)}
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
