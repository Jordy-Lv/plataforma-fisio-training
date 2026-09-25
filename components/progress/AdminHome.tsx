import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock,
  CreditCard,
  Megaphone,
  Ruler,
  Store,
  UserPlus,
  UserX,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { Workspace } from "@/components/auth/Workspace";
import { BusinessOverview } from "@/components/progress/BusinessOverview";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { cardVariants } from "@/components/ui/Card";
import {
  getAdminDashboard,
  type ActivityItem,
  type AdminAttention,
} from "@/lib/progress/overview-queries";
import { formatWhen } from "@/lib/progress/vocabulary";
import { cn } from "cn";

/** "1 membresía" y "3 membresías": el recuento y su nombre, una sola vez. */
function count(n: number, singular: string, plural: string) {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

type Task = {
  key: string;
  value: number;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: BadgeVariant;
};

/** Lo que pide acción, de lo más urgente a lo menos; solo lo que no es cero. */
function tasksFrom(attention: AdminAttention): Task[] {
  const all: Task[] = [
    {
      key: "expired",
      value: attention.expiredMemberships,
      title: count(attention.expiredMemberships, "membresía vencida", "membresías vencidas"),
      description: "Renueva o cancela para que el cobro no quede en el aire.",
      href: "/memberships",
      icon: CircleAlert,
      tone: "danger",
    },
    {
      key: "expiring",
      value: attention.expiringMemberships,
      title: count(attention.expiringMemberships, "membresía por vencer", "membresías por vencer"),
      description: "Avisa al paciente antes de la fecha de vencimiento.",
      href: "/memberships",
      icon: Clock,
      tone: "warning",
    },
    {
      key: "alerts",
      value: attention.unreadAlerts,
      title: count(attention.unreadAlerts, "alerta sin leer", "alertas sin leer"),
      description: "Dolor, ejercicios saltados, baja asistencia o vencimientos.",
      href: "/pro/alerts",
      icon: Bell,
      tone: "warning",
    },
    {
      key: "unassigned",
      value: attention.unassignedPatients,
      title: count(
        attention.unassignedPatients,
        "paciente sin profesional",
        "pacientes sin profesional",
      ),
      description: "Asígnale un entrenador o un fisioterapeuta en Personas.",
      href: "/people",
      icon: UserX,
      tone: "info",
    },
  ];
  return all.filter((task) => task.value > 0);
}

const iconTone: Record<BadgeVariant, string> = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-brand-soft text-brand-soft-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  outline: "border border-border text-muted-foreground",
};

/** Lo que el administrador tiene que resolver hoy. Cada fila lleva a su pantalla. */
function AttentionPanel({ attention }: { attention: AdminAttention }) {
  const tasks = tasksFrom(attention);

  return (
    <section className={cn(cardVariants({ padding: "sm" }), "grid content-start gap-3")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Pide tu atención hoy</h2>
        {tasks.length > 0 && (
          <Badge variant="warning">
            {count(tasks.length, "pendiente", "pendientes")}
          </Badge>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="flex items-center gap-3 rounded-xl bg-success-soft p-3 text-sm leading-6 text-success">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
          Todo al día: no hay membresías por resolver, alertas sin leer ni
          pacientes sin profesional.
        </p>
      ) : (
        <ul className="grid gap-2">
          {tasks.map((task) => (
            <li key={task.key}>
              <Link
                href={task.href}
                className="flex min-h-12 items-center gap-3 rounded-xl border border-border px-3 py-2 transition-colors hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    iconTone[task.tone],
                  )}
                >
                  <task.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5 sm:flex sm:items-baseline sm:gap-3">
                  <span className="text-sm font-semibold sm:shrink-0">
                    {task.title}
                  </span>
                  <span className="hidden text-xs leading-5 text-muted-foreground sm:inline sm:truncate">
                    {task.description}
                  </span>
                </span>
                <ChevronRight
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type Shortcut = { href: string; label: string; icon: LucideIcon };

/** Escritorio: los cuatro destinos de todos los días; el resto está en el menú. */
const shortcuts: Shortcut[] = [
  { href: "/people", label: "Personas", icon: UserPlus },
  { href: "/attendance", label: "Asistencia", icon: CalendarCheck },
  { href: "/memberships", label: "Membresías", icon: CreditCard },
  { href: "/plans", label: "Planes y servicios", icon: Store },
];

/**
 * Teléfono: lo que la barra inferior esconde tras «Menú». Personas, Catálogo,
 * Rutinas y Sesiones ya están en la barra; repetirlos aquí sería ruido.
 */
const mobileShortcuts: Shortcut[] = [
  { href: "/memberships", label: "Membresías", icon: CreditCard },
  { href: "/plans", label: "Planes", icon: Store },
  { href: "/pro/alerts", label: "Alertas", icon: Bell },
  { href: "/attendance", label: "Asistencia", icon: CalendarCheck },
  { href: "/screenings", label: "Tamizaje", icon: Ruler },
  { href: "/templates", label: "Plantillas", icon: ClipboardList },
  { href: "/rules", label: "Asignación", icon: Workflow },
  { href: "/offer", label: "Vitrina", icon: Megaphone },
];

/**
 * Los accesos rápidos. En escritorio, una fila de cuatro botones de 48 px; en
 * el teléfono, una rejilla de ocho iconos con su nombre debajo, cada uno de
 * más de 44 px, para llegar a cualquier sección sin abrir el menú.
 */
function Shortcuts() {
  return (
    <section aria-labelledby="accesos-rapidos">
      <h2 id="accesos-rapidos" className="sr-only">
        Accesos rápidos
      </h2>
      <ul className="grid grid-cols-4 gap-2 sm:hidden">
        {mobileShortcuts.map((shortcut) => (
          <li key={shortcut.href}>
            <Link
              href={shortcut.href}
              className={cn(
                cardVariants({ interactive: true, padding: "none" }),
                "flex h-full min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-xs font-medium leading-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              <shortcut.icon
                className="size-5 shrink-0 text-brand"
                aria-hidden="true"
              />
              {shortcut.label}
            </Link>
          </li>
        ))}
      </ul>
      <ul className="hidden grid-cols-4 gap-3 sm:grid">
        {shortcuts.map((shortcut) => (
          <li key={shortcut.href}>
            <Link
              href={shortcut.href}
              className={cn(
                cardVariants({ interactive: true, padding: "none" }),
                "flex h-full min-h-12 items-center gap-2.5 px-3 py-2 text-sm font-semibold leading-5 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              <shortcut.icon
                className="size-5 shrink-0 text-brand"
                aria-hidden="true"
              />
              {shortcut.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Lo último que pasó: sesiones cerradas y altas nuevas, más reciente primero.
 *
 * En escritorio es la columna de la izquierda y **no marca la altura de la
 * fila**: `xl:h-0 xl:min-h-full` la estira hasta la altura de la columna de
 * la derecha y, si no cabe, la lista se desplaza dentro de la tarjeta en vez
 * de alargar la página.
 */
/** En el teléfono solo se ven las tres más recientes: el resto alarga la página. */
const MOBILE_ACTIVITY = 3;

function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <section
      className={cn(
        cardVariants({ padding: "sm" }),
        "flex flex-col gap-2 xl:h-0 xl:min-h-full",
      )}
    >
      <h2 className="text-base font-semibold">Actividad reciente</h2>
      {items.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          Aún no hay movimiento. Aquí aparecerán las sesiones que cierren los
          pacientes y las altas nuevas.
        </p>
      ) : (
        <ol className="-mx-1 grid content-start overflow-y-auto px-1 xl:flex-1">
          {items.map((item, index) => (
            <li
              key={`${item.kind}-${item.id}`}
              className={cn(
                "flex items-start gap-3 border-b border-border py-2.5 last:border-b-0",
                index >= MOBILE_ACTIVITY && "hidden sm:flex",
                index === MOBILE_ACTIVITY - 1 && "max-sm:border-b-0",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                  item.kind === "session"
                    ? "bg-success-soft text-success"
                    : "bg-brand-soft text-brand-soft-foreground",
                )}
              >
                {item.kind === "session" ? (
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                ) : (
                  <Users className="size-4" aria-hidden="true" />
                )}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5 text-sm leading-5">
                <span>
                  <Link
                    href={`/people/${item.patientId}`}
                    className="font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {item.patientName ?? "Paciente sin nombre"}
                  </Link>{" "}
                  {item.kind === "session"
                    ? "completó una sesión"
                    : "se dio de alta"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.detail ? `${item.detail} · ` : ""}
                  {formatWhen(item.at)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * El panel del administrador, pensado para verse entero sin desplazarse en
 * un portátil de 13" (1440 × 790 útiles). Sin descripción bajo el título: el
 * saludo ya está en la cabecera y esa línea era la que no cabía.
 *
 * - **Escritorio (`xl`)**: dos columnas. A la izquierda, la actividad
 *   reciente; a la derecha, lo que pide acción hoy, el panorama del mes en
 *   una tira de tres cifras y los accesos rápidos.
 * - **Teléfono y tableta**: una sola columna, con lo que pide acción primero.
 *   Por eso la actividad va *después* en el HTML y la rejilla la sube a la
 *   izquierda solo en escritorio.
 *
 * El trabajo clínico del día sigue siendo del profesional y vive en `/pro`.
 * Todo sale de `getAdminDashboard`, en un solo `Promise.all`.
 */
export async function AdminHome({
  id,
  name,
}: {
  id: string;
  name: string | null;
}) {
  const dashboard = await getAdminDashboard(id);

  return (
    <Workspace
      title="Panel de administración"
      name={name}
      role="admin"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(18rem,1fr)_minmax(0,2.2fr)]">
        <div className="grid content-start gap-3 xl:col-start-2 xl:row-start-1">
          <AttentionPanel attention={dashboard.attention} />
          <BusinessOverview
            overview={dashboard.overview}
            previous={dashboard.previous}
            newPatients={dashboard.newPatients}
          />
          <Shortcuts />
        </div>

        <div className="xl:col-start-1 xl:row-start-1">
          <RecentActivity items={dashboard.activity} />
        </div>
      </div>
    </Workspace>
  );
}
