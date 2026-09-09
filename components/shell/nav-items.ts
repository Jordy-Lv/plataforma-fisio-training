import {
  Activity,
  Bell,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Dumbbell,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Ruler,
  Store,
  Tag,
  User,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/lib/auth/schemas";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Rutas cuyo prefijo también marca esta entrada como activa. Sin esto,
   * `/pro/routines/<id>` dejaría la barra sin ninguna entrada resaltada y el
   * usuario perdería de vista dónde está.
   */
  match?: string[];
};

export type NavGroup = { title: string; items: NavItem[] };

/*
  El menú de cada rol solo lista rutas que ese rol puede abrir de verdad: los
  guardas de cada página (`requireAdmin`, `requireStaff`, `requireRole`) son
  quienes mandan, y un enlace que redirige nada más pulsarlo es peor que no
  tenerlo. Por eso el profesional no ve «Planes» —es `requireAdmin`— aunque sí
  vea «Membresías», que es `requireStaff`.
*/
const catalogGroup: NavGroup = {
  title: "Catálogo",
  items: [
    { href: "/exercises", label: "Ejercicios", icon: Dumbbell },
    { href: "/templates", label: "Plantillas", icon: ClipboardList },
    { href: "/rules", label: "Reglas", icon: GitBranch },
  ],
};

const careGroup: NavGroup = {
  title: "Atención",
  items: [
    { href: "/pro/routines", label: "Rutinas", icon: ListChecks },
    { href: "/pro/sessions", label: "Sesiones", icon: Activity },
    { href: "/pro/alerts", label: "Alertas", icon: Bell },
  ],
};

const followUpGroup: NavGroup = {
  title: "Seguimiento",
  items: [
    { href: "/screenings", label: "Tamizaje", icon: Ruler },
    { href: "/attendance", label: "Asistencia", icon: CalendarCheck },
  ],
};

export const navGroupsByRole: Record<UserRole, NavGroup[]> = {
  admin: [
    {
      title: "Inicio",
      items: [{ href: "/admin", label: "Panel", icon: LayoutDashboard }],
    },
    catalogGroup,
    careGroup,
    followUpGroup,
    {
      title: "Negocio",
      items: [
        { href: "/plans", label: "Planes", icon: Tag },
        { href: "/memberships", label: "Membresías", icon: CreditCard },
        { href: "/offer", label: "Vitrina", icon: Store },
      ],
    },
  ],
  professional: [
    {
      title: "Inicio",
      items: [{ href: "/pro", label: "Mi panel", icon: LayoutDashboard }],
    },
    careGroup,
    followUpGroup,
    catalogGroup,
    {
      title: "Negocio",
      items: [
        { href: "/memberships", label: "Membresías", icon: CreditCard },
        { href: "/offer", label: "Vitrina", icon: Store },
      ],
    },
  ],
  patient: [
    {
      title: "Mi seguimiento",
      items: [
        { href: "/patient", label: "Inicio", icon: LayoutDashboard },
        {
          href: "/routine",
          label: "Mi rutina",
          icon: HeartPulse,
          match: ["/routine"],
        },
        { href: "/routine/calendar", label: "Calendario", icon: CalendarDays },
        { href: "/attendance/me", label: "Asistencia", icon: CalendarCheck },
        { href: "/memberships/me", label: "Membresía", icon: CreditCard },
        { href: "/patient/profile", label: "Mi perfil", icon: User },
      ],
    },
  ],
};

/**
 * Las entradas de la barra inferior del teléfono. Caben cinco objetivos de
 * 44 px en 375 px de ancho. Cuando hay más secciones, la quinta plaza pasa a ser
 * el botón que despliega el resto.
 */
export function primaryNavItems(role: UserRole): NavItem[] {
  const items = navGroupsByRole[role].flatMap((group) => group.items);
  return items.length <= 5 ? items : items.slice(0, 4);
}

/** Si el rol necesita el botón que abre el menú completo. */
export function needsNavOverflow(role: UserRole): boolean {
  return navGroupsByRole[role].flatMap((group) => group.items).length > 5;
}

/**
 * Ruta de la entrada que hay que marcar como activa, o `null` si ninguna
 * corresponde. Devuelve una sola: gana la coincidencia más larga, porque
 * estando en `/patient/profile` encajan tanto «Inicio» (`/patient`) como «Mi
 * perfil», y resaltar las dos no dice dónde estás.
 *
 * La coincidencia por prefijo exige el separador (`/attendance/`), así que
 * `/attendance/me` no enciende `/attendance`: en el menú del paciente son
 * entradas distintas.
 */
export function activeNavHref(role: UserRole, pathname: string): string | null {
  let best: string | null = null;
  for (const group of navGroupsByRole[role]) {
    for (const item of group.items) {
      for (const href of [item.href, ...(item.match ?? [])]) {
        const matches = pathname === href || pathname.startsWith(`${href}/`);
        if (matches && href.length > (best?.length ?? -1)) best = item.href;
      }
    }
  }
  return best;
}
