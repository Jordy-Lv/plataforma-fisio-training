import { bodyPartLabels } from "@/lib/catalog/body-parts";
import { labelFor } from "@/lib/catalog/vocabulary";

/**
 * Filtro de contraindicaciones: quita de una rutina recién copiada los
 * ejercicios incompatibles con las condiciones activas del paciente.
 *
 * Es un paso **independiente** de la evaluación de reglas y se ejecuta después
 * de ella. La regla dice qué tipo de trabajo le corresponde a un perfil; este
 * filtro dice qué movimiento concreto le hace daño a esta persona. Mezclarlos
 * obligaría a escribir una regla por combinación de condiciones.
 *
 * Es una función pura: recibe los días ya copiados y las condiciones activas, y
 * devuelve los días depurados más el rastro de lo que quitó. Quien la llama
 * —la asignación real en el slice 3, o el simulador— decide qué hacer con ese
 * rastro: guardarlo en `routines.notes`, generar la alerta, o solo mostrarlo.
 */

/** Por debajo de esto un día no es entrenable y necesita al profesional. */
export const MIN_ITEMS_PER_DAY = 3;

export type PlanExercise = {
  id: string;
  name: string;
  /** Mismo vocabulario que `patient_conditions.body_part`. */
  contraindications: string[];
};

export type PlanItem = { exercise: PlanExercise };

export type PlanDay = { day_number: number; items: PlanItem[] };

export type RemovedItem = {
  day_number: number;
  exercise_id: string;
  exercise_name: string;
  /** Condiciones del paciente que contraindican el ejercicio. */
  reasons: string[];
};

export type FilteredPlan<D> = {
  /** Los mismos días, con los ejercicios incompatibles fuera. */
  days: D[];
  removed: RemovedItem[];
  /** Días que quedaron por debajo del mínimo (incluye los vacíos). */
  shortDays: number[];
  emptyDays: number[];
  /**
   * La rutina no se puede entregar tal cual: el profesional tiene que
   * completarla antes. Nunca se entrega un día vacío.
   */
  needsReview: boolean;
  /** Qué se quitó y por qué, listo para `routines.notes`. */
  notes: string;
  /** Motivos de alerta para el profesional a cargo. */
  alerts: string[];
};

const label = (part: string) => labelFor(bodyPartLabels, part);

/**
 * Quita los ejercicios contraindicados. Sin condiciones activas no hay nada
 * que quitar, pero los días cortos se siguen señalando: una plantilla mal
 * armada tampoco debe llegar al paciente.
 */
export function filterContraindicated<D extends PlanDay>(
  days: D[],
  conditions: readonly string[],
): FilteredPlan<D> {
  const active = [...new Set(conditions)];
  const removed: RemovedItem[] = [];

  const filtered = days.map((day) => {
    const items = day.items.filter((item) => {
      const reasons = active.filter((condition) =>
        item.exercise.contraindications.includes(condition),
      );
      if (reasons.length === 0) return true;
      removed.push({
        day_number: day.day_number,
        exercise_id: item.exercise.id,
        exercise_name: item.exercise.name,
        reasons,
      });
      return false;
    });
    return { ...day, items } as D;
  });

  const shortDays = filtered
    .filter((day) => day.items.length < MIN_ITEMS_PER_DAY)
    .map((day) => day.day_number);
  const emptyDays = filtered
    .filter((day) => day.items.length === 0)
    .map((day) => day.day_number);

  const alerts: string[] = [];
  if (emptyDays.length > 0)
    alerts.push(
      `Sin ejercicios en ${plural(emptyDays, "el día", "los días")} ${join(emptyDays)}: hay que rehacerlo antes de entregar la rutina.`,
    );
  const onlyShort = shortDays.filter((day) => !emptyDays.includes(day));
  if (onlyShort.length > 0)
    alerts.push(
      `${plural(onlyShort, "El día", "Los días")} ${join(onlyShort)} ${plural(onlyShort, "queda", "quedan")} con menos de ${MIN_ITEMS_PER_DAY} ejercicios tras el filtro.`,
    );

  return {
    days: filtered,
    removed,
    shortDays,
    emptyDays,
    needsReview: shortDays.length > 0,
    notes: buildNotes(active, removed, alerts),
    alerts,
  };
}

const join = (numbers: number[]) =>
  numbers.length > 1
    ? `${numbers.slice(0, -1).join(", ")} y ${numbers.at(-1)}`
    : String(numbers[0]);

const plural = (values: unknown[], one: string, many: string) =>
  values.length > 1 ? many : one;

/**
 * El texto que queda en la rutina. Explica qué se quitó y por qué: si el
 * profesional no puede reconstruir la decisión, el filtro deja de ser
 * auditable y pasa a ser magia.
 */
function buildNotes(
  active: string[],
  removed: RemovedItem[],
  alerts: string[],
): string {
  const lines: string[] = [];

  if (removed.length > 0) {
    lines.push(
      `Ajuste automático por ${plural(active, "la condición activa", "las condiciones activas")}: ${active.map(label).join(", ")}.`,
    );
    for (const item of removed)
      lines.push(
        `- Día ${item.day_number}: se quitó «${item.exercise_name}», contraindicado para ${item.reasons.map(label).join(" y ")}.`,
      );
  }

  lines.push(...alerts);
  return lines.join("\n");
}
