import Link from "next/link";
import type { Metadata } from "next";
import { ChartLine, ChevronRight, Users } from "lucide-react";
import { cn } from "cn";

import { Workspace } from "@/components/auth/Workspace";
import { MembershipExpiryBanner } from "@/components/patients/MembershipExpiryBanner";
import { TodayCard } from "@/components/patients/TodayCard";
import { UpcomingSessions } from "@/components/patients/UpcomingSessions";
import { WeekHeader } from "@/components/patients/WeekHeader";
import { requireRole } from "@/lib/auth/session";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { daysUntil } from "@/lib/progress/membership-vocabulary";
import { openSessionProgress, patientAgenda } from "@/lib/progress/patient-agenda";
import { patientOverview, type WeekDay } from "@/lib/progress/patient-overview";
import { currentPlanLabel } from "@/lib/progress/patient-plan";
import { formatDate, formatWeekdayDate } from "@/lib/progress/vocabulary";
import { addDays } from "@/lib/routines/calendar";

export const metadata: Metadata = {
  title: "Mi espacio",
};

/*
  Portada del paciente, al estilo de la app de Smart Fit y con el mismo orden en
  el teléfono y en escritorio:

  1. Su semana, sin tarjeta y sobre un brillo dorado que arranca en la barra:
     la racha y los días (7 en el teléfono; 14 en escritorio, con la semana
     siguiente), la meta semanal y el acceso al calendario (`WeekHeader`).
  2. Hoy: qué le toca, sus ejercicios y el botón para hacerlo (`TodayCard`).
  3. Accesos a «Mi evolución» y «Mi equipo». En escritorio van en una columna a
     la derecha de Hoy, debajo de sus próximas sesiones.

  Si la membresía está por vencer, un aviso flotante abajo lo dice y lleva a
  Membresía. El menú sigue en la barra lateral y en la inferior del teléfono.

  Sin formularios propios: el único `<form>` de `/patient` es el de cerrar
  sesión del shell, y así tiene que seguir (`docs/11`).
*/

const INITIALS = ["L", "M", "X", "J", "V", "S", "D"];

export default async function Page() {
  const profile = await requireRole("patient");
  const overview = await patientOverview(profile.id);
  // Una sesión a medias de un día anterior se da por cerrada: la rutina se hace
  // el día que toca, así que solo cuenta la que empezó hoy.
  const open =
    overview.openSession?.performedOn === overview.today ? overview.openSession : null;
  const [agenda, plan, openProgress] = await Promise.all([
    patientAgenda(profile.id, overview.today),
    currentPlanLabel(profile.id),
    open ? openSessionProgress(open.id, open.dayId) : null,
  ]);
  const firstName = profile.fullName?.trim().split(/\s+/)[0];

  const membership = overview.membership;
  const isCurrent =
    membership?.status === "active" || membership?.status === "expiring_soon";
  const daysLeft =
    isCurrent && membership?.expiresOn ? daysUntil(membership.expiresOn) : null;
  const isExpiring = membership?.status === "expiring_soon" && daysLeft !== null;

  // El aviso de la tarjeta de hoy nombra la zona más antigua en cuidado.
  const firstCondition = overview.conditions[0];
  const careZone = firstCondition
    ? (
        bodyPartLabels[firstCondition.bodyPart as keyof typeof bodyPartLabels] ??
        firstCondition.bodyPart
      ).toLowerCase()
    : null;

  // La semana siguiente, para los catorce días de escritorio: todavía no ha
  // llegado, así que solo puede tener sesiones programadas.
  const nextMonday = addDays(overview.week[0].date, 7);
  const nextWeek: WeekDay[] = INITIALS.map((initial, index) => {
    const date = addDays(nextMonday, index);
    return {
      date,
      initial,
      dayOfMonth: Number(date.slice(8, 10)),
      isToday: false,
      isFuture: true,
      hasSession: false,
      hasAttendance: false,
    };
  });

  const shortcuts = [
    { href: "/routine/evolution", title: "Mi evolución", icon: ChartLine },
    { href: "/patient/profile#equipo", title: "Mi equipo", icon: Users },
  ];

  return (
    <Workspace role="patient" name={profile.fullName}>
      {/* Con el aviso de vencimiento flotando abajo, se deja sitio para que no tape nada. */}
      <div className={cn("relative isolate grid gap-3.5 sm:gap-4 lg:gap-6", isExpiring && "lg:pb-20")}>
        {/* Brillo dorado: arranca pegado a la barra superior (sube el relleno de
            `main` con el margen negativo) y se desvanece bajo la semana, para que
            no haya corte entre la barra y la franja. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-5 -top-3 -z-10 h-64 bg-[radial-gradient(ellipse_120%_100%_at_75%_0%,color-mix(in_srgb,var(--brand-bright)_22%,transparent),transparent_70%)] sm:-inset-x-8 sm:-top-4 lg:h-72 lg:bg-[radial-gradient(ellipse_70%_100%_at_70%_0%,color-mix(in_srgb,var(--brand-bright)_20%,transparent),transparent_70%)]"
        />
        {/* Fecha, saludo y plan quedan solo para el lector de pantalla: la barra
            ya saluda y dice el plan, y la portada empieza por la semana. */}
        <header className="sr-only">
          <p>{formatWeekdayDate(overview.today)}</p>
          <h1>Hola{firstName ? `, ${firstName}` : ""}</h1>
          <p>Plan {plan}</p>
        </header>

        <WeekHeader
          week={overview.week}
          nextWeek={nextWeek}
          plannedDates={agenda.plannedDates}
          streakWeeks={overview.streakWeeks}
          goal={agenda.goal}
        />

        <div className="grid gap-3.5 sm:gap-4 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8">
            <TodayCard
              agenda={agenda}
              openSession={open}
              hasRoutine={overview.activeRoutine !== null}
              careZone={careZone}
              openProgress={openProgress}
            />
          </div>

          <aside className="grid content-start gap-4 lg:col-span-4 lg:py-2">
            <section aria-labelledby="proximas" className="hidden lg:block">
              <h2 id="proximas" className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-brand">
                Próximas sesiones
              </h2>
              <UpcomingSessions sessions={agenda.upcoming} />
            </section>

            <nav aria-label="Tu progreso y tu equipo" className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
              {shortcuts.map((shortcut) => (
                <Link
                  key={shortcut.href}
                  href={shortcut.href}
                  prefetch={false}
                  className="flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-surface px-3 shadow-low transition-colors hover:border-brand-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <shortcut.icon aria-hidden="true" className="size-5 flex-none text-brand-bright" />
                  <b className="flex-1 truncate text-sm">{shortcut.title}</b>
                  <ChevronRight aria-hidden="true" className="hidden size-4 flex-none text-muted-foreground sm:block" />
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      </div>

      {isExpiring && membership?.expiresOn && (
        <MembershipExpiryBanner
          planName={plan}
          expiresOn={membership.expiresOn}
          expiresLabel={formatDate(membership.expiresOn)}
          daysLeft={daysLeft}
        />
      )}
    </Workspace>
  );
}
