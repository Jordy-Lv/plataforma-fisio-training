import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  CreditCard,
  Store,
  UserPlus,
  UserX,
  Users,
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
import { currentHour, formatWhen } from "@/lib/progress/vocabulary";
import { cn } from "cn";

/** "1 membresía" y "3 membresías": el recuento y su nombre, una sola vez. */
function count(n: number, singular: string, plural: string) {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

/** El saludo del día, en la hora del negocio y no la del servidor. */
function greeting() {
  const hour = currentHour();
  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
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
    <section className={cn(cardVariants({ padding: "lg" }), "grid content-start gap-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Pide tu atención hoy</h2>
        {tasks.length > 0 && (
          <Badge variant="warning">
            {count(tasks.length, "pendiente", "pendientes")}
          </Badge>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="flex items-center gap-3 rounded-xl bg-success-soft p-4 text-sm leading-6 text-success">
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
                className="flex min-h-14 items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    iconTone[task.tone],
                  )}
                >
                  <task.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-semibold">{task.title}</span>
                  <span className="text-sm leading-5 text-muted-foreground">
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

const shortcuts: {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/people",
    label: "Personas",
    hint: "Altas, equipo y acompañamiento",
    icon: UserPlus,
  },
  {
    href: "/attendance",
    label: "Asistencia por paciente",
    hint: "Quién viene y cuánto",
    icon: CalendarCheck,
  },
  {
    href: "/memberships",
    label: "Membresías",
    hint: "Ingresos y vencimientos",
    icon: CreditCard,
  },
  {
    href: "/plans",
    label: "Planes y servicios",
    hint: "Lo que ofrece el negocio",
    icon: Store,
  },
];

/**
 * Los cuatro destinos que más usa el administrador, con icono y en rejilla de
 * dos: en el teléfono caben sin desplazarse y cada uno mide más de 44 px.
 */
function Shortcuts() {
  return (
    <section className={cn(cardVariants({ padding: "lg" }), "grid content-start gap-4")}>
      <h2 className="text-lg font-semibold">Accesos rápidos</h2>
      <ul className="grid grid-cols-2 gap-3">
        {shortcuts.map((shortcut) => (
          <li key={shortcut.href}>
            <Link
              href={shortcut.href}
              className="grid h-full min-h-24 content-start gap-2 rounded-xl border border-border p-3 transition-colors hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <shortcut.icon className="size-6 text-brand" aria-hidden="true" />
              <span className="text-sm font-semibold leading-5">
                {shortcut.label}
              </span>
              <span className="text-xs leading-4 text-muted-foreground">
                {shortcut.hint}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Lo último que pasó: sesiones cerradas y altas nuevas, más reciente primero. */
function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <section className={cn(cardVariants({ padding: "lg" }), "grid content-start gap-4")}>
      <h2 className="text-lg font-semibold">Actividad reciente</h2>
      {items.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          Aún no hay movimiento. Aquí aparecerán las sesiones que cierren los
          pacientes y las altas nuevas.
        </p>
      ) : (
        <ol className="grid">
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex items-start gap-3 border-b border-border py-3 last:border-b-0"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
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
                <span className="text-muted-foreground">
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
 * El panel del administrador, en el orden en que se lee al entrar:
 *
 * 1. **Lo que pide acción hoy** —membresías, alertas, pacientes sin
 *    profesional— junto a los accesos rápidos.
 * 2. **El panorama del mes**: tres cifras con su comparación frente al mes
 *    anterior.
 * 3. **La actividad reciente**, para ver que el negocio se mueve.
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
  const firstName = name?.split(" ")[0];

  return (
    <Workspace
      title="Panel de administración"
      name={name}
      role="admin"
      description={`${greeting()}${firstName ? `, ${firstName}` : ""}. Esto es lo que pide tu atención y cómo va el negocio este mes.`}
    >
      <div className="grid gap-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AttentionPanel attention={dashboard.attention} />
          </div>
          <Shortcuts />
        </div>

        <BusinessOverview
          overview={dashboard.overview}
          previous={dashboard.previous}
          newPatients={dashboard.newPatients}
        />

        <RecentActivity items={dashboard.activity} />
      </div>
    </Workspace>
  );
}
