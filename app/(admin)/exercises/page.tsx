import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { ExerciseFilters } from "@/components/catalog/ExerciseFilters";
import { ExerciseQuickView } from "@/components/catalog/ExerciseQuickView";
import { ExerciseViewSwitch } from "@/components/catalog/ExerciseViewSwitch";
import { ExercisePagination } from "@/components/catalog/ExercisePagination";
import { requireStaff } from "@/lib/catalog/access";
import { listExercises } from "@/lib/catalog/queries";
import {
  exerciseList,
  exercisesHref,
  hasActiveFilters,
  pageSizeFor,
  type ExerciseOrder,
  type ExerciseView,
} from "@/lib/catalog/schemas";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Catálogo de ejercicios",
};

/** «Ver todo el catálogo» quita los filtros pero **conserva la vista y el
    orden**: el usuario eligió cómo quiere leerlo, no qué quiere buscar. */
const sinFiltros = (vista: ExerciseView, orden: ExerciseOrder) => ({
  q: undefined,
  muscle: undefined,
  equipment: undefined,
  environment: undefined,
  vista,
  orden,
  page: 1,
});

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireStaff();

  const filters = exerciseList.parse(await searchParams);
  const { exercises, total, pages } = await listExercises(filters, {
    pageSize: pageSizeFor(filters.vista),
  });
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {total === 1
            ? "1 ejercicio encontrado"
            : `${total} ejercicios encontrados`}
        </p>
        <ExerciseViewSwitch filters={filters} />
      </div>

      {exercises.length === 0 ? (
        filtrado ? (
          <EmptyState
            className="mt-4"
            title="Ningún ejercicio coincide con estos filtros"
            action={
              <ButtonLink href={exercisesHref(sinFiltros(filters.vista, filters.orden))}>
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
        <ul
          className={
            filters.vista === "lista"
              ? "mt-4 border-t border-border"
              : "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          }
        >
          {exercises.map((exercise) => (
            /*
              La fila y la tarjeta se pintan igual que siempre; el envoltorio
              solo intercepta el clic del nombre y abre la ficha aquí mismo
              (15.2). Sin JavaScript el enlace lleva a `/exercises/[id]`.
            */
            <ExerciseQuickView
              key={exercise.id}
              exercise={exercise}
              vista={filters.vista}
            />
          ))}
        </ul>
      )}

      <ExercisePagination filters={filters} pages={pages} />
    </Workspace>
  );
}
