import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { ExerciseCard } from "@/components/catalog/ExerciseCard";
import { ExerciseFilters } from "@/components/catalog/ExerciseFilters";
import { ExercisePagination } from "@/components/catalog/ExercisePagination";
import { requireStaff } from "@/lib/catalog/access";
import { listExercises } from "@/lib/catalog/queries";
import {
  exerciseFiltersSchema,
  exercisesHref,
  hasActiveFilters,
} from "@/lib/catalog/schemas";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Catálogo de ejercicios",
};

const sinFiltros = {
  q: undefined,
  muscle: undefined,
  equipment: undefined,
  environment: undefined,
  page: 1,
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireStaff();

  const filters = exerciseFiltersSchema.parse(await searchParams);
  const { exercises, total, pages } = await listExercises(filters);
  const filtrado = hasActiveFilters(filters);

  return (
    <Workspace
      title="Catálogo de ejercicios"
      name={profile.fullName}
      description="Busca un ejercicio por su nombre o filtra por lo que el paciente tiene a mano."
      actions={
        <ButtonLink variant="default" href="/exercises/new">
          Crear ejercicio propio
        </ButtonLink>
      }
    >
      <ExerciseFilters filters={filters} />

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {total === 1
          ? "1 ejercicio encontrado"
          : `${total} ejercicios encontrados`}
      </p>

      {exercises.length === 0 ? (
        filtrado ? (
          <EmptyState
            className="mt-4"
            title="Ningún ejercicio coincide con estos filtros"
            action={
              <ButtonLink href={exercisesHref(sinFiltros)}>
                Ver todo el catálogo
              </ButtonLink>
            }
          >
            Prueba con menos filtros o busca solo por el nombre del movimiento.
          </EmptyState>
        ) : filters.page > 1 ? (
          <EmptyState
            className="mt-4"
            title="Esta página ya no tiene ejercicios"
            action={
              <ButtonLink href={exercisesHref(filters, { page: 1 })}>
                Volver a la primera página
              </ButtonLink>
            }
          >
            El listado se acortó desde que abriste esta página.
          </EmptyState>
        ) : (
          <EmptyState className="mt-4" title="El catálogo aún está vacío">
            Siembra la biblioteca con <code>npm run seed:exercises</code> o pide
            al administrador que la ejecute.
          </EmptyState>
        )
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="flex">
              <ExerciseCard exercise={exercise} />
            </li>
          ))}
        </ul>
      )}

      <ExercisePagination filters={filters} pages={pages} />
    </Workspace>
  );
}
