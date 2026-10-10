import Link from "next/link";
import { ChartLine, ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/Card";
import type { EvolutionPoint } from "@/lib/progress/patient-evolution";
import { formatNumber, formatShortDate } from "@/lib/progress/vocabulary";

/*
  «Tu evolución» en la portada del paciente: su peso y su IMC del último
  tamizaje y cuánto cambiaron desde el anterior. Las gráficas viven en «Mi
  evolución» (`/routine/evolution`); aquí solo el resumen y el botón para ir.

  El cambio de peso se dice sin juzgarlo («1,2 kg menos»): bajar no es bueno
  para todos los objetivos, y eso lo valora su profesional.
*/
export function EvolutionCard({ points }: { points: EvolutionPoint[] }) {
  const last = points.at(-1);
  const weights = points.filter((p): p is EvolutionPoint & { weightKg: number } => p.weightKg !== null);
  const lastWeight = weights.at(-1);
  const prevWeight = weights.at(-2);
  const prevBmi = points.filter((p) => p.bmi !== null).at(-2)?.bmi ?? null;

  const delta =
    lastWeight && prevWeight
      ? Math.round((lastWeight.weightKg - prevWeight.weightKg) * 10) / 10
      : null;

  return (
    // En la portada de escritorio la tarjeta ocupa la última fila, que se lleva
    // el alto que sobra: el contenido se centra en ese alto.
    <Card padding="default" className="flex h-full min-h-0 flex-col gap-3 lg:p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-muted-foreground">Tu evolución</h2>
        {last && (
          <p className="text-[13px] font-semibold text-brand">
            Último tamizaje: {formatShortDate(last.takenOn)}
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-wrap items-center gap-x-8 gap-y-4">
        {!last ? (
          <p className="max-w-md flex-1 text-sm text-muted-foreground">
            Aún no tienes tamizajes. Tu profesional registra tu peso y tus medidas en
            tus controles; mientras tanto, en tu evolución ves tu constancia y tus cargas.
          </p>
        ) : (
          <>
            <div>
              <p className="text-[12.5px] font-semibold text-muted-foreground">Peso</p>
              <p className="text-[32px] font-extrabold leading-tight tracking-tight">
                {formatNumber(last.weightKg)}
                {last.weightKg !== null && (
                  <small className="ml-1 text-[15px] font-semibold text-muted-foreground">kg</small>
                )}
              </p>
              {delta !== null && prevWeight && (
                <p className="text-[12.5px] text-muted-foreground">
                  {delta === 0
                    ? "igual que el anterior"
                    : `${formatNumber(Math.abs(delta))} kg ${delta < 0 ? "menos" : "más"} que el ${formatShortDate(prevWeight.takenOn)}`}
                </p>
              )}
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-muted-foreground">IMC</p>
              <p className="text-[32px] font-extrabold leading-tight tracking-tight">
                {formatNumber(last.bmi)}
              </p>
              {prevBmi !== null && (
                <p className="text-[12.5px] text-muted-foreground">antes {formatNumber(prevBmi)}</p>
              )}
            </div>
          </>
        )}

        <Link
          href="/routine/evolution"
          prefetch={false}
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-brand-bright px-4 text-sm font-bold text-foreground transition-colors hover:bg-brand-bright hover:text-brand-bright-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChartLine aria-hidden="true" className="size-4" />
          Ver evolución completa
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </Card>
  );
}
