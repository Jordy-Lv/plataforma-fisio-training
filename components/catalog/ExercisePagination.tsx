import Link from "next/link";
import { exercisesHref, type ExerciseFilters } from "@/lib/catalog/schemas";

const linkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring";

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
        <Link
          href={exercisesHref(filters, { page: page - 1 })}
          className={linkClass}
          rel="prev"
        >
          Anterior
        </Link>
      ) : (
        <span />
      )}

      <p className="text-sm text-muted-foreground" aria-live="polite">
        Página {page} de {pages}
      </p>

      {page < pages ? (
        <Link
          href={exercisesHref(filters, { page: page + 1 })}
          className={linkClass}
          rel="next"
        >
          Siguiente
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
