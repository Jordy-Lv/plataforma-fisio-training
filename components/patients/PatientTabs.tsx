import { TabBar } from "@/components/shell/TabBar";

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
 * El marcado —y las tres restricciones que lo gobiernan— vive en
 * [`components/shell/TabBar.tsx`](../shell/TabBar.tsx), compartido con las
 * pestañas de sección del menú.
 */
export function PatientTabs({
  patientId,
  active,
}: {
  patientId: string;
  active: PatientTab;
}) {
  return (
    <TabBar
      label="Secciones del paciente"
      tabs={tabs.map((tab) => ({
        href: tab.href(patientId),
        label: tab.label,
      }))}
      activeHref={
        tabs.find((tab) => tab.key === active)?.href(patientId) ??
        tabs[0].href(patientId)
      }
    />
  );
}
