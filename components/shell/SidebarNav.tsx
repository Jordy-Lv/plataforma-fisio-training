"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

import { activeNavHref, navItemsByRole } from "@/components/shell/nav-items";
import type { UserRole } from "@/lib/auth/schemas";

/**
 * Navegación lateral del escritorio. Es cliente por `usePathname`: la entrada
 * activa depende de la ruta y en un Server Component habría que pasarla desde
 * cada página, que son cuarenta y dos.
 *
 * Lista plana de ocho entradas, sin rótulos de grupo: los apartados de las
 * secciones con pestañas los enseña `SectionTabs` dentro de la pantalla.
 */
export function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const active = activeNavHref(role, pathname);

  return (
    <nav aria-label="Secciones" className="grid gap-0.5">
      <ul className="grid gap-0.5">
        {navItemsByRole[role].map((item) => {
          const isActive = active === item.href;
          return (
            <li key={item.href}>
              {/* Sin precarga (KAN-19): ver el comentario equivalente en MobileNav. */}
              <Link
                href={item.href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isActive
                    ? "bg-brand-soft text-brand-soft-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon aria-hidden="true" className="size-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
