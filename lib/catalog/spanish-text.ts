/**
 * Textos en español del catálogo importado de free-exercise-db.
 *
 * La fuente está en inglés y el paciente lee estos textos entre series, así que
 * la traducción vive aquí, versionada y ligada al `external_id` —no al nombre,
 * que cambia—. Reejecutar `npm run seed:exercises` no devuelve nada al inglés.
 *
 * Las dos coberturas son distintas a propósito:
 *
 * - **Nombres**: los 868 ejercicios importables están traducidos y la función
 *   falla si falta uno. Un nombre en inglés se ve en el catálogo, en las
 *   plantillas y en la rutina del paciente; no hay grado intermedio aceptable.
 * - **Indicaciones**: por ahora solo están traducidas las de los ejercicios que
 *   la demo usa en plantillas y rutinas. Las que faltan se siembran en inglés
 *   en lugar de bloquear la importación. Para completar el resto basta con
 *   añadir entradas a `exercise-instructions.es.json`: nada más cambia.
 */
import names from "./exercise-names.es.json" with { type: "json" };
import instructions from "./exercise-instructions.es.json" with { type: "json" };

/** Nombre revisado por identificador estable. Falla si el ejercicio no está traducido. */
export function spanishExerciseName(externalId: string): string {
  const name = (names as Record<string, string>)[externalId];
  if (!name)
    throw new Error(
      `Falta traducir el ejercicio ${externalId}. Completa exercise-names.es.json antes de importarlo.`,
    );
  return name;
}

/**
 * Indicaciones traducidas, ya unidas en el mismo formato que guarda
 * `exercises.description`. Devuelve `null` si este ejercicio todavía no está
 * traducido, para que quien llame decida con qué texto se queda.
 */
export function spanishExerciseInstructions(externalId: string): string | null {
  const steps = (instructions as Record<string, string[]>)[externalId];
  return steps ? steps.join("\n\n") : null;
}

/** Cuántos ejercicios tienen ya las indicaciones en español. Lo usa el seed al informar. */
export function translatedInstructionCount(): number {
  return Object.keys(instructions).length;
}
