import { exercisesHref, type ExerciseFilters } from "@/lib/catalog/schemas";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function ExercisePagination({
  filters,
  pages,
}: {
  filters: ExerciseFilters;
  pages: number;
}) {
  if (pages <= 1) return null;
  const page = filters.page;

  return (
    <nav
      aria-label="Páginas del catálogo"
      className="mt-8 flex items-center justify-between gap-3"
    >
      {page > 1 ? (
        <ButtonLink
          href={exercisesHref(filters, { page: page - 1 })}
          
          rel="prev"
        >
          Anterior
        </ButtonLink>
      ) : (
        <span />
      )}

      <p className="text-sm text-muted-foreground" aria-live="polite">
        Página {page} de {pages}
      </p>

      {page < pages ? (
        <ButtonLink
          href={exercisesHref(filters, { page: page + 1 })}
          
          rel="next"
        >
          Siguiente
        </ButtonLink>
      ) : (
        <span />
      )}
    </nav>
  );
}
