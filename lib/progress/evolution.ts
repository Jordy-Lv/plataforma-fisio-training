import type { Screening } from "@/lib/progress/screening-queries";
import { measurementLabels, measurements } from "@/lib/progress/vocabulary";

/** Un punto de una serie: la fecha en que se midió y lo que dio. */
export type SeriesPoint = { on: string; value: number };

export type Series = {
  key: string;
  label: string;
  unit: string;
  points: SeriesPoint[];
};

/** Deja fuera las medidas que nunca se tomaron: una serie vacía no se dibuja. */
function series(
  key: string,
  label: string,
  unit: string,
  points: SeriesPoint[],
): Series[] {
  return points.length === 0 ? [] : [{ key, label, unit, points }];
}

/**
 * Las series de evolución de un paciente a partir de sus tamizajes.
 *
 * La agregación ocurre en el servidor: al navegador solo le llegan los pares
 * de fecha y valor que va a dibujar, no la fila completa del tamizaje.
 *
 * Los tamizajes llegan del más reciente al más antiguo —así se leen en el
 * historial— y una gráfica se lee al revés, así que aquí se invierten.
 */
export function buildScreeningSeries(screenings: Screening[]): Series[] {
  const orden = [...screenings].reverse();

  const points = (read: (screening: Screening) => number | null | undefined) =>
    orden.flatMap((screening) => {
      const value = read(screening);
      return value === null || value === undefined
        ? []
        : [{ on: screening.taken_on, value }];
    });

  return [
    ...series("weight", "Peso", "kg", points((s) => s.weight_kg)),
    ...series("bmi", "IMC", "", points((s) => s.bmi)),
    ...series("body_fat", "Grasa corporal", "%", points((s) => s.body_fat_pct)),
    ...measurements.flatMap((key) =>
      series(
        key,
        measurementLabels[key],
        "cm",
        points((s) => s.measurements[key]),
      ),
    ),
  ];
}
