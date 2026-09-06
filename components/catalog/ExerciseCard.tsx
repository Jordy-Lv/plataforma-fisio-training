import Link from "next/link";
import { cn } from "cn";
import { Badge } from "@/components/ui/Badge";
import { cardVariants } from "@/components/ui/Card";
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

/*
  La tarjeta sigue siendo un `<article>` —cada ejercicio se entiende fuera del
  listado— así que toma las clases de `cardVariants` en vez de envolverse en
  `<Card>`, que es un `<div>`.

  El título va con las clases de `CardTitle` escritas a mano, no con el
  componente: `scripts/verify-catalog-list.test.mjs` lee los nombres del
  catálogo con una expresión regular que exige `<h2 class="…">` sin ningún
  atributo delante, y `CardTitle` emite antes su `data-slot`.
*/
export function ExerciseCard({ exercise }: { exercise: ExerciseListItem }) {
  const muscles = exercise.muscle_groups.slice(0, visibleMuscles);
  const restantes = exercise.muscle_groups.length - muscles.length;

  return (
    <article
      className={cn(
        cardVariants({ interactive: true, padding: "none" }),
        "flex w-full flex-col overflow-hidden",
      )}
    >
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
          <h2 className="text-base font-semibold leading-6">
            {/* El enlace ocupa toda la tarjeta: en el teléfono se toca con el
                pulgar sin apuntar al título. */}
            <Link
              href={`/exercises/${exercise.id}`}
              className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {exercise.name}
            </Link>
          </h2>
          {exercise.is_custom && <Badge variant="brand">Propio</Badge>}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {muscles.map((muscle) => (
            <Badge key={muscle}>{labelFor(muscleGroupLabels, muscle)}</Badge>
          ))}
          {restantes > 0 && <Badge>+{restantes}</Badge>}
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
