import {
  Activity,
  Bell,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Dumbbell,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Ruler,
  Store,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/lib/auth/schemas";

/**
 * Una pestaña dentro de una sección. No lleva icono a propósito: se dibuja
 * dentro de la pantalla, donde el icono no aporta y sí resta ancho a 375 px.
 */
export type NavTab = {
  href: string;
  label: string;
  /** Rutas cuyo prefijo también marcan esta pestaña como activa. */
  match?: string[];
};

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
  /**
   * Sub-secciones de la entrada. Cuando las hay, `href` es la primera: el menú
   * enseña **una** entrada y las hermanas aparecen como pestañas dentro de la
   * pantalla (`components/shell/SectionTabs.tsx`).
   */
  tabs?: NavTab[];
};

/*
  El menú de cada rol solo lista rutas que ese rol puede abrir de verdad: los
  guardas de cada página (`requireAdmin`, `requireStaff`, `requireRole`) son
  quienes mandan, y un enlace que redirige nada más pulsarlo es peor que no
  tenerlo. Por eso el profesional no ve «Planes» —es `requireAdmin`— aunque sí
  vea «Membresías», que es `requireStaff`.

  El menú es **plano y de ocho entradas**. Antes eran trece agrupadas por
  entidad (Catálogo / Atención / Seguimiento / Negocio), y en el teléfono la
  barra inferior escondía la mitad de la aplicación detrás de «Menú». Tres de
  esos grupos colapsan ahora en una entrada con pestañas dentro, que es lo que
  ya hacía `PatientTabs` para las seis vistas de un paciente.
*/

/** Ejercicios → Plantillas → Asignación: la cadena de trabajo, en su orden. */
const catalogTabs: NavTab[] = [
  { href: "/exercises", label: "Ejercicios" },
  { href: "/templates", label: "Plantillas" },
  { href: "/rules", label: "Asignación" },
];

const followUpTabs: NavTab[] = [
  { href: "/screenings", label: "Tamizaje" },
  { href: "/attendance", label: "Asistencia" },
];

const routinesItem: NavItem = {
  href: "/pro/routines",
  label: "Rutinas",
  icon: ListChecks,
};
const sessionsItem: NavItem = {
  href: "/pro/sessions",
  label: "Sesiones",
  icon: Activity,
};
const alertsItem: NavItem = {
  href: "/pro/alerts",
  label: "Alertas",
  icon: Bell,
};

export const navItemsByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Panel", icon: LayoutDashboard },
    { href: "/people", label: "Personas", icon: Users },
    {
      href: "/exercises",
      label: "Catálogo",
      icon: Dumbbell,
      tabs: catalogTabs,
    },
    routinesItem,
    sessionsItem,
    alertsItem,
    {
      href: "/screenings",
      label: "Seguimiento",
      icon: Ruler,
      tabs: followUpTabs,
    },
    {
      href: "/plans",
      label: "Negocio",
      icon: Store,
      tabs: [
        { href: "/plans", label: "Planes" },
        { href: "/memberships", label: "Membresías" },
        { href: "/offer", label: "Vitrina" },
      ],
    },
  ],
  /*
    El profesional lleva su trabajo del día delante —rutinas, sesiones y
    alertas— y el catálogo detrás: lo consulta, no lo mantiene. Y sin
    «Asignación», que solo puede mirar, ni «Planes», que le rebota.
  */
  professional: [
    { href: "/pro", label: "Mi panel", icon: LayoutDashboard },
    { href: "/people", label: "Pacientes", icon: Users },
    routinesItem,
    sessionsItem,
    alertsItem,
    {
      href: "/exercises",
      label: "Catálogo",
      icon: Dumbbell,
      tabs: catalogTabs.filter((tab) => tab.href !== "/rules"),
    },
    {
      href: "/screenings",
      label: "Seguimiento",
      icon: Ruler,
      tabs: followUpTabs,
    },
    {
      href: "/memberships",
      label: "Negocio",
      icon: CreditCard,
      tabs: [
        { href: "/memberships", label: "Membresías" },
        { href: "/offer", label: "Vitrina" },
      ],
    },
  ],
  patient: [
    { href: "/patient", label: "Inicio", icon: LayoutDashboard },
    { href: "/routine", label: "Mi rutina", icon: HeartPulse, match: ["/routine"] },
    { href: "/routine/calendar", label: "Calendario", icon: CalendarDays },
    { href: "/attendance/me", label: "Asistencia", icon: CalendarCheck },
    { href: "/memberships/me", label: "Membresía", icon: CreditCard },
    { href: "/patient/profile", label: "Mi perfil", icon: User },
  ],
};

/**
 * Plazas de la barra inferior del teléfono. Con seis, cada objetivo mide
 * 62 px de ancho en 375 px de pantalla, por encima de los 44 px mínimos.
 */
const MOBILE_SLOTS = 6;

/**
 * Las entradas de la barra inferior del teléfono. Si las secciones no caben,
 * la última plaza pasa a ser el botón que despliega el resto.
 *
 * Con ocho secciones el paciente las ve **todas** —tiene seis— y al equipo le
 * quedan cinco a la vista y tres detrás del botón. Antes, con trece, se
 * enseñaban cuatro.
 */
export function primaryNavItems(role: UserRole): NavItem[] {
  const items = navItemsByRole[role];
  return items.length <= MOBILE_SLOTS ? items : items.slice(0, MOBILE_SLOTS - 1);
}

/** Si el rol necesita el botón que abre el menú completo. */
export function needsNavOverflow(role: UserRole): boolean {
  return navItemsByRole[role].length > MOBILE_SLOTS;
}

/** Todas las rutas que encienden una entrada: la suya, sus alias y sus pestañas. */
function hrefsOf(item: NavItem): string[] {
  return [
    item.href,
    ...(item.match ?? []),
    ...(item.tabs ?? []).flatMap((tab) => [tab.href, ...(tab.match ?? [])]),
  ];
}

/**
 * Si una ruta ya está a la vista en la barra inferior del teléfono: es una de
 * sus entradas visibles o una pestaña de ellas. Regla de las pantallas
 * móviles: un acceso directo que ya está en la barra solo añade ruido.
 */
export function isInMobileBar(role: UserRole, href: string): boolean {
  return primaryNavItems(role).some((item) => hrefsOf(item).includes(href));
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
  let bestLength = -1;
  for (const item of navItemsByRole[role]) {
    for (const href of hrefsOf(item)) {
      const matches = pathname === href || pathname.startsWith(`${href}/`);
      if (matches && href.length > bestLength) {
        best = item.href;
        bestLength = href.length;
      }
    }
  }
  return best;
}

/**
 * Las pestañas de la sección donde estás, o `null` si la entrada activa no
 * tiene hermanas. `AppShell` las pinta encima del título, de modo que ninguna
 * pantalla tiene que saber en qué sección vive.
 */
export function activeSectionTabs(
  role: UserRole,
  pathname: string,
): { tabs: NavTab[]; activeHref: string } | null {
  const active = activeNavHref(role, pathname);
  if (!active) return null;
  const item = navItemsByRole[role].find((entry) => entry.href === active);
  if (!item?.tabs) return null;

  let activeHref = item.tabs[0].href;
  let bestLength = -1;
  for (const tab of item.tabs) {
    for (const href of [tab.href, ...(tab.match ?? [])]) {
      const matches = pathname === href || pathname.startsWith(`${href}/`);
      if (matches && href.length > bestLength) {
        activeHref = tab.href;
        bestLength = href.length;
      }
    }
  }
  return { tabs: item.tabs, activeHref };
}
