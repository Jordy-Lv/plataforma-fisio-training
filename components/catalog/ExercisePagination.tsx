import { exercisesHref, type ExerciseFilters } from "@/lib/catalog/schemas";
import { Pagination } from "@/components/ui/Pagination";

export function ExercisePagination({ filters, pages }: { filters: ExerciseFilters; pages: number }) {
  return <Pagination page={filters.page} pages={pages}
    hrefFor={(page) => exercisesHref(filters, { page })} label="Páginas del catálogo" />;
}
