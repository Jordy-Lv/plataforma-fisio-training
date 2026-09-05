import {
  difficultyLabels,
  environmentLabels,
  equipmentLabels,
  labelFor,
  muscleGroupLabels,
} from "@/lib/catalog/vocabulary";
import type { ExerciseListItem } from "@/lib/catalog/queries";

/** Cuántos grupos musculares caben en la tarjeta sin volverla ilegible en 375 px. */
const visibleMuscles = 3;

function Tag({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "brand";
}) {
  return (
    <span
      className={
        tone === "brand"
          ? "inline-flex items-center rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand"
          : "inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
      }
    >
      {children}
    </span>
  );
}

export function ExerciseCard({ exercise }: { exercise: ExerciseListItem }) {
  const muscles = exercise.muscle_groups.slice(0, visibleMuscles);
  const restantes = exercise.muscle_groups.length - muscles.length;

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="aspect-[4/3] bg-muted">
        {exercise.media_url ? (
          // Sin `next/image`: el origen de las imágenes es el bucket de
          // Supabase, cuyo dominio cambia entre local y producción, y no hay
          // por qué fijarlo en `next.config.ts` para un catálogo estático.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={exercise.media_url}
            alt={`Ejecución de ${exercise.name}`}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <p className="flex size-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Sin imagen todavía
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold leading-6">{exercise.name}</h2>
          {exercise.is_custom && <Tag tone="brand">Propio</Tag>}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {muscles.map((muscle) => (
            <Tag key={muscle}>{labelFor(muscleGroupLabels, muscle)}</Tag>
          ))}
          {restantes > 0 && <Tag>+{restantes}</Tag>}
        </div>

        <dl className="mt-auto grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Equipo</dt>
          <dd>
            {exercise.equipment.length > 0
              ? exercise.equipment
                  .map((value) => labelFor(equipmentLabels, value))
                  .join(", ")
              : "Sin registrar"}
          </dd>
          <dt className="text-muted-foreground">Entorno</dt>
          <dd>
            {exercise.environments.length > 0
              ? exercise.environments
                  .map((value) => labelFor(environmentLabels, value))
                  .join(" · ")
              : "Sin registrar"}
          </dd>
          <dt className="text-muted-foreground">Nivel</dt>
          <dd>
            {exercise.difficulty
              ? labelFor(difficultyLabels, exercise.difficulty)
              : "Sin registrar"}
          </dd>
        </dl>
      </div>
    </article>
  );
}
