import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DataRow } from "@/components/ui/DataRow";
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
  apilarse a leerse en una línea. La estructura —miniatura, título, dos campos y
  chevron— vive en `components/ui/DataRow`, que comparten los demás listados.

  El `<h2 class="text-base font-semibold leading-6">` con el enlace dentro es
  **el mismo marcado que la tarjeta, y es contrato**: `verify-catalog-list.test.mjs`
  lee los nombres del catálogo con una expresión regular que exige esa clase
  exacta sin ningún atributo delante, así que se pinta aquí y no en `DataRow`.
  Escrito a mano por la misma razón que en `ExerciseCard`: `CardTitle` emite
  antes su `data-slot`.
*/
export function ExerciseRow({ exercise }: { exercise: ExerciseListItem }) {
  const musculos = exercise.muscle_groups
    .map((muscle) => labelFor(muscleGroupLabels, muscle))
    .join(" · ");
  const equipo =
    exercise.equipment.length > 0
      ? exercise.equipment
          .map((value) => labelFor(equipmentLabels, value))
          .join(", ")
      : "Sin equipo registrado";
  const entorno = exercise.environments
    .map((value) => labelFor(environmentLabels, value))
    .join(" · ");

  return (
    <DataRow
      media={exercise.media_url}
      icon={<Dumbbell aria-hidden="true" className="size-5" />}
      title={
        <h2 className="text-base font-semibold leading-6">
          <Link
            href={`/exercises/${exercise.id}`}
            className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {exercise.name}
          </Link>
        </h2>
      }
      secondary={
        <>
          {musculos || "Sin grupo muscular"}
          <span className="hidden sm:inline"> — {equipo}</span>
        </>
      }
      trailing={
        <>
          {entorno && (
            <span className="text-sm text-muted-foreground">{entorno}</span>
          )}
          {exercise.is_custom && <Badge variant="brand">Propio</Badge>}
        </>
      }
    />
  );
}
