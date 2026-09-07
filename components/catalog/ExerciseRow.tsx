import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  environmentLabels,
  equipmentLabels,
  labelFor,
  muscleGroupLabels,
} from "@/lib/catalog/vocabulary";
import type { ExerciseListItem } from "@/lib/catalog/queries";

/*
  La versión densa de `ExerciseCard`. Misma información esencial, un tercio del
  alto: la imagen baja de 254 px a una miniatura de 48, y el resto pasa de
  apilarse a leerse en una línea.

  El `<h2 class="text-base font-semibold leading-6">` con el enlace dentro es
  **el mismo marcado que la tarjeta, y es contrato**: `verify-catalog-list.test.mjs`
  lee los nombres del catálogo con una expresión regular que exige esa clase
  exacta sin ningún atributo delante. Escrito a mano por la misma razón que en
  `ExerciseCard`: `CardTitle` emite antes su `data-slot`.

  La fila entera mide 64 px, que es también la altura mínima cómoda para tocarla
  con el pulgar: por encima de los 44 px que pide `CLAUDE.md`.
*/
export function ExerciseRow({ exercise }: { exercise: ExerciseListItem }) {
  const musculos = exercise.muscle_groups
    .map((muscle) => labelFor(muscleGroupLabels, muscle))
    .join(" · ");
  const equipo =
    exercise.equipment.length > 0
      ? exercise.equipment.map((value) => labelFor(equipmentLabels, value)).join(", ")
      : "Sin equipo registrado";
  const entorno = exercise.environments
    .map((value) => labelFor(environmentLabels, value))
    .join(" · ");

  return (
    <article className="relative flex min-h-16 items-center gap-3 border-b border-border px-2 py-2 transition-colors hover:bg-muted sm:gap-4 sm:px-3">
      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {exercise.media_url && (
          // Sin `next/image`, por lo mismo que en la tarjeta: el dominio del
          // bucket cambia entre local y producción.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={exercise.media_url}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold leading-6">
          <Link
            href={`/exercises/${exercise.id}`}
            className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {exercise.name}
          </Link>
        </h2>
        <p className="truncate text-sm text-muted-foreground">
          {musculos || "Sin grupo muscular"}
          <span className="hidden sm:inline"> — {equipo}</span>
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        {entorno && <span className="text-sm text-muted-foreground">{entorno}</span>}
        {exercise.is_custom && <Badge variant="brand">Propio</Badge>}
      </div>
    </article>
  );
}
