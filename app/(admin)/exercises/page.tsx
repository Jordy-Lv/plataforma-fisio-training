import Link from "next/link";
import type { Metadata } from "next";
import { Workspace } from "@/components/auth/Workspace";
import { ExerciseCard } from "@/components/catalog/ExerciseCard";
import { ExerciseFilters } from "@/components/catalog/ExerciseFilters";
import { ExercisePagination } from "@/components/catalog/ExercisePagination";
import { rolePaths } from "@/lib/auth/session";
import { requireStaff } from "@/lib/catalog/access";
import { listExercises } from "@/lib/catalog/queries";
import {
  exerciseFiltersSchema,
  exercisesHref,
  hasActiveFilters,
} from "@/lib/catalog/schemas";

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

const backLinkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring";

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
    <Workspace title="Catálogo de ejercicios" name={profile.fullName}>
      <p className="-mt-4 leading-7 text-muted-foreground">
        Busca un ejercicio por su nombre o filtra por lo que el paciente tiene a
        mano.
      </p>
      <div className="mb-6 mt-4 flex flex-wrap gap-3">
        <Link href={rolePaths[profile.role]} className={backLinkClass}>
          Volver a mi panel
        </Link>
        <Link
          href="/exercises/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Crear ejercicio propio
        </Link>
      </div>

      <ExerciseFilters filters={filters} />

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {total === 1
          ? "1 ejercicio encontrado"
          : `${total} ejercicios encontrados`}
      </p>

      {exercises.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center">
          {filtrado ? (
            <>
              <p className="font-semibold">
                Ningún ejercicio coincide con estos filtros
              </p>
              <p className="mx-auto mt-2 max-w-md leading-7 text-muted-foreground">
                Prueba con menos filtros o busca solo por el nombre del
                movimiento.
              </p>
              <Link href={exercisesHref(sinFiltros)} className={`mt-5 ${backLinkClass}`}>
                Ver todo el catálogo
              </Link>
            </>
          ) : filters.page > 1 ? (
            <>
              <p className="font-semibold">Esta página ya no tiene ejercicios</p>
              <Link
                href={exercisesHref(filters, { page: 1 })}
                className={`mt-5 ${backLinkClass}`}
              >
                Volver a la primera página
              </Link>
            </>
          ) : (
            <>
              <p className="font-semibold">El catálogo aún está vacío</p>
              <p className="mx-auto mt-2 max-w-md leading-7 text-muted-foreground">
                Siembra la biblioteca con <code>npm run seed:exercises</code> o
                pide al administrador que la ejecute.
              </p>
            </>
          )}
        </div>
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
