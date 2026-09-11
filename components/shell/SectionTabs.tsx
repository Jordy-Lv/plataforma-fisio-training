"use client";

import { usePathname } from "next/navigation";

import { activeSectionTabs } from "@/components/shell/nav-items";
import { TabBar } from "@/components/shell/TabBar";
import type { UserRole } from "@/lib/auth/schemas";

/**
 * Pestañas de la sección donde estás, si la entrada del menú tiene hermanas.
 * Las pinta `AppShell`, así que ninguna de las cuarenta y dos pantallas tiene
 * que saber en qué sección vive ni pasar nada.
 *
 * Es cliente por `usePathname`, igual que `SidebarNav`. Un Client Component
 * **sí** se renderiza en el servidor —lo que no emite nada es un portal
 * (ADR-0008)—, así que esto no cambia el HTML que ven las suites.
 */
export function SectionTabs({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const section = activeSectionTabs(role, pathname);
  if (!section) return null;

  return (
    <TabBar
      label="Apartados de la sección"
      tabs={section.tabs}
      activeHref={section.activeHref}
    />
  );
}
