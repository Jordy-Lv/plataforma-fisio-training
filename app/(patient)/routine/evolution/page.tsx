import type { Metadata } from "next";
import { Activity, CalendarCheck2, CalendarDays, CheckCheck, Scale } from "lucide-react";

import { Workspace } from "@/components/auth/Workspace";
import { EvolutionChart } from "@/components/progress/EvolutionChart";
import { PainEffortChart } from "@/components/progress/PainEffortChart";
import { WeeklyBars } from "@/components/progress/WeeklyBars";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth/session";
import { buildScreeningSeries } from "@/lib/progress/evolution";
import { patientProgress } from "@/lib/progress/patient-progress";
import { getLoadProgression } from "@/lib/progress/progression-queries";
import { getPatientScreenings } from "@/lib/progress/screening-queries";
import { formatNumber, formatShortDate, today } from "@/lib/progress/vocabulary";

export const metadata: Metadata = {
  title: "Mi evolución",
};

/** Cuántos ejercicios lista «Tus mejores marcas». */
const RECORDS = 6;

/*
  La evolución del propio paciente, como pestaña de «Mi rutina»: lo que ha
  hecho y cómo ha cambiado, con gráficas.

  1. Cuatro cifras: sesiones del trimestre, cuánto cumple de lo programado,
     su dolor medio del mes (comparado con el anterior) y su peso.
  2. Constancia: sesiones terminadas por semana (12 semanas) | dolor y esfuerzo
     sesión a sesión.
  3. Peso y medidas de los tamizajes | progresión de carga por ejercicio, con
     las mismas gráficas que ve su equipo (`EvolutionChart`).
  4. Sus mejores marcas | las zonas donde más dolor ha registrado.

  Todo es lectura y lo decide la RLS: el paciente solo recibe sus filas. Sin
  formularios: el selector de las gráficas es un `<select>` suelto.
*/

function painTrend(current: number | null, previous: number | null) {
  if (current === null) return "sin registros este mes";
  if (previous === null) return "en los últimos 30 días";
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) return "igual que el mes anterior";
  return `${formatNumber(Math.abs(delta))} ${delta < 0 ? "menos" : "más"} que el mes anterior`;
}

export default async function Page() {
  const actor = await requireRole("patient");
  const [progress, screenings, loads] = await Promise.all([
    patientProgress(actor.id, today()),
    getPatientScreenings(actor.id),
    getLoadProgression(actor.id),
  ]);

  const bodySeries = buildScreeningSeries(screenings?.screenings ?? []);
  const weight = bodySeries.find((series) => series.key === "weight");
  const lastWeight = weight?.points.at(-1);
  const firstWeight = weight?.points[0];
  const weightDelta =
    lastWeight && firstWeight && weight.points.length > 1
      ? Math.round((lastWeight.value - firstWeight.value) * 10) / 10
      : null;

  const adherence =
    progress.adherence.scheduled > 0
      ? Math.round((progress.adherence.completed / progress.adherence.scheduled) * 100)
      : null;

  const records = loads
    .map((series) => {
      const best = series.points.reduce((top, point) => (point.value > top.value ? point : top));
      const first = series.points[0];
      return { key: series.key, label: series.label, best, gain: best.value - first.value };
    })
    .sort((a, b) => b.best.value - a.best.value)
    .slice(0, RECORDS);

  const stats = [
    {
      label: "Sesiones",
      icon: CheckCheck,
      value: String(progress.completedTotal),
      detail: "terminadas en 12 semanas",
    },
    {
      label: "Constancia",
      icon: CalendarCheck2,
      value: adherence === null ? "—" : `${adherence} %`,
      detail:
        adherence === null
          ? "sin sesiones programadas en 4 semanas"
          : `${progress.adherence.completed} de ${progress.adherence.scheduled} programadas en 4 semanas`,
    },
    {
      label: "Dolor medio",
      icon: Activity,
      value: progress.pain.current === null ? "—" : `${formatNumber(progress.pain.current)} / 10`,
      detail: painTrend(progress.pain.current, progress.pain.previous),
    },
    {
      label: "Peso",
      icon: Scale,
      value: lastWeight ? `${formatNumber(lastWeight.value)} kg` : "—",
      detail: lastWeight
        ? weightDelta === null
          ? `tamizaje del ${formatShortDate(lastWeight.on)}`
          : `${weightDelta > 0 ? "+" : ""}${formatNumber(weightDelta)} kg desde el ${formatShortDate(firstWeight!.on)}`
        : "aún sin tamizajes",
    },
  ];

  return (
    <Workspace
      title="Rutinas"
      name={actor.fullName}
      role="patient"
      actions={
        <ButtonLink href="/routine/calendar" size="lg" className="border-foreground/25 bg-transparent px-5 dark:border-foreground/25 dark:bg-transparent">
          <CalendarDays aria-hidden="true" />
          Calendario
        </ButtonLink>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <ul className="grid grid-cols-2 gap-3 lg:col-span-12 lg:grid-cols-4 lg:gap-4">
          {stats.map((stat) => (
            <li
              key={stat.label}
              className="grid grid-cols-1 content-start gap-1 rounded-2xl border border-border bg-surface p-3.5 shadow-low sm:p-4 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-x-3.5 lg:gap-y-0"
            >
              <span
                aria-hidden="true"
                className="row-span-3 mb-1 grid size-9 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground lg:mb-0 lg:size-11"
              >
                <stat.icon className="size-[18px] lg:size-5" />
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{stat.label}</span>
              <span className="text-[22px] font-extrabold leading-tight tracking-tight lg:text-2xl">
                {stat.value}
              </span>
              <span className="text-xs leading-4 text-muted-foreground">{stat.detail}</span>
            </li>
          ))}
        </ul>

        <Card padding="lg" className="grid grid-cols-1 content-start gap-4 lg:col-span-7">
          <div>
            <h2 className="text-lg font-bold">Tu constancia</h2>
            <p className="text-sm text-muted-foreground">Sesiones terminadas cada semana.</p>
          </div>
          <WeeklyBars weeks={progress.weeks} />
        </Card>

        <Card padding="lg" className="grid grid-cols-1 content-start gap-4 lg:col-span-5">
          <div>
            <h2 className="text-lg font-bold">Dolor y esfuerzo</h2>
            <p className="text-sm text-muted-foreground">
              La media de cada sesión, de 0 a 10.
            </p>
          </div>
          <PainEffortChart sessions={progress.sessions} />
        </Card>

        <section aria-labelledby="medidas" className="grid grid-cols-1 content-start gap-3 lg:col-span-6">
          <div>
            <h2 id="medidas" className="text-lg font-bold">Peso y medidas</h2>
            <p className="text-sm text-muted-foreground">Lo que tu equipo mide en cada tamizaje.</p>
          </div>
          <EvolutionChart
            series={bodySeries}
            empty="Aún no tienes tamizajes. Tu profesional registra tu peso y tus medidas en tus controles, y aquí verás cómo cambian."
            single="Con un solo tamizaje aún no hay evolución que dibujar. En tu próximo control aparecerá la línea."
          />
        </section>

        <section aria-labelledby="cargas" className="grid grid-cols-1 content-start gap-3 lg:col-span-6">
          <div>
            <h2 id="cargas" className="text-lg font-bold">Progresión de carga</h2>
            <p className="text-sm text-muted-foreground">El peso que levantas en cada ejercicio.</p>
          </div>
          <EvolutionChart
            series={loads}
            empty="Aún no hay ejercicios con peso registrado. Anota el peso al marcar cada ejercicio y aquí verás cómo sube."
            single="Solo hay una sesión con peso en este ejercicio. Con la siguiente verás si la carga sube."
          />
        </section>

        <Card padding="lg" className="grid grid-cols-1 content-start gap-3 lg:col-span-7">
          <h2 className="text-lg font-bold">Tus mejores marcas</h2>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cuando registres el peso de tus ejercicios, aquí aparecerá lo máximo que has
              levantado en cada uno.
            </p>
          ) : (
            <ol className="grid grid-cols-1">
              {records.map((record) => (
                <li
                  key={record.key}
                  className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0"
                >
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[15px]">{record.label}</b>
                    <span className="text-xs text-muted-foreground">
                      el {formatShortDate(record.best.on)}
                    </span>
                  </span>
                  {record.gain > 0 && (
                    <span className="rounded-full bg-success-soft px-2 py-1 text-xs font-bold text-success">
                      +{formatNumber(record.gain)} kg
                    </span>
                  )}
                  <span className="text-lg font-extrabold tabular-nums">
                    {formatNumber(record.best.value)} kg
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card padding="lg" className="grid grid-cols-1 content-start gap-3 lg:col-span-5">
          <div>
            <h2 className="text-lg font-bold">Dónde te ha dolido</h2>
            <p className="text-sm text-muted-foreground">Veces que registraste dolor, en 12 semanas.</p>
          </div>
          {progress.painZones.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No has registrado dolor en ninguna zona. Si algo te duele al entrenar, márcalo en
              la sesión: tu equipo lo verá.
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {progress.painZones.map((zone) => (
                <li key={zone.label} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate font-semibold">{zone.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-pain-high"
                      style={{ width: `${(zone.count / progress.painZones[0].count) * 100}%` }}
                    />
                  </span>
                  <span className="tabular-nums text-muted-foreground">{zone.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Workspace>
  );
}
