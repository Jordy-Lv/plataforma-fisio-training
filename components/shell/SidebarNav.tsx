"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

import { activeNavHref, navGroupsByRole } from "@/components/shell/nav-items";
import type { UserRole } from "@/lib/auth/schemas";

/**
 * Navegación lateral del escritorio. Es cliente por `usePathname`: la entrada
 * activa depende de la ruta y en un Server Component habría que pasarla desde
 * cada página, que son treinta y cuatro.
 */
export function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const active = activeNavHref(role, pathname);

  return (
    <nav aria-label="Secciones" className="grid gap-6">
      {navGroupsByRole[role].map((group) => (
        <div key={group.title} className="grid gap-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.title}
          </p>
          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              const isActive = active === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
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
        </div>
      ))}
    </nav>
  );
}
