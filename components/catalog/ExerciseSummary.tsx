import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  difficultyLabels,
  environmentLabels,
  equipmentLabels,
  labelFor,
  muscleGroupLabels,
} from "@/lib/catalog/vocabulary";
import type { ExerciseListItem } from "@/lib/catalog/queries";

/**
 * La ficha de un ejercicio tal como se lee sin salir del catálogo: imagen,
 * indicaciones y el etiquetado de asignación. Es lo que va dentro del
 * `DetailDialog` de `ExerciseQuickView`.
 *
 * **No incluye el etiquetado clínico ni los formularios de edición**: eso vive
 * en `/exercises/[id]`, que sigue siendo la ficha completa. Aquí se resuelve la
 * pregunta que trae a alguien al catálogo —«¿cuál es este ejercicio?»— y de ahí
 * se sale a la ruta propia si hace falta editarlo.
 */
export function ExerciseSummary({ exercise }: { exercise: ExerciseListItem }) {
  const grupos = [
    {
      titulo: "Grupos musculares",
      valores: exercise.muscle_groups,
      labels: muscleGroupLabels,
    },
    {
      titulo: "Equipamiento",
      valores: exercise.equipment,
      labels: equipmentLabels,
    },
    {
      titulo: "Entorno",
      valores: exercise.environments,
      labels: environmentLabels,
    },
  ];

  return (
    <div className="grid gap-5">
      {/* Alto fijo, no proporción: la imagen es la mitad de la ficha y con
          `aspect-[4/3]` empujaba el resto fuera del diálogo. */}
      <div className="h-44 overflow-hidden rounded-xl bg-muted sm:h-56">
        {exercise.media_url ? (
          // Sin `next/image`: el origen es el bucket de Supabase, cuyo dominio
          // cambia entre local y producción.
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

      <Badge
        className="justify-self-start"
        variant={exercise.is_custom ? "brand" : "neutral"}
      >
        {exercise.is_custom
          ? "Ejercicio propio del negocio"
          : "Ejercicio importado de la biblioteca"}
      </Badge>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">
          Cómo se ejecuta
        </h3>
        <p className="mt-1 whitespace-pre-line break-words leading-7">
          {exercise.description ?? "Este ejercicio aún no tiene indicaciones."}
        </p>
      </div>

      <dl className="grid gap-4">
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            <dt className="text-sm font-semibold text-muted-foreground">
              {grupo.titulo}
            </dt>
            <dd className="mt-2 flex flex-wrap gap-1.5">
              {grupo.valores.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  Sin registrar
                </span>
              ) : (
                grupo.valores.map((valor) => (
                  <Badge key={valor}>{labelFor(grupo.labels, valor)}</Badge>
                ))
              )}
            </dd>
          </div>
        ))}
        <div>
          <dt className="text-sm font-semibold text-muted-foreground">Nivel</dt>
          <dd className="mt-1 text-sm">
            {exercise.difficulty
              ? labelFor(difficultyLabels, exercise.difficulty)
              : "Sin registrar"}
          </dd>
        </div>
      </dl>

      <ButtonLink
        variant="outline"
        className="justify-self-start"
        href={`/exercises/${exercise.id}`}
      >
        Abrir la ficha completa
      </ButtonLink>
    </div>
  );
}
