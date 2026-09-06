import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  exercisesHref,
  hasActiveFilters,
  type ExerciseFilters as Filters,
} from "@/lib/catalog/schemas";
import {
  equipmentLabels,
  equipment as equipmentOptions,
  environmentLabels,
  environments,
  muscleGroupLabels,
  muscleGroups,
} from "@/lib/catalog/vocabulary";

const fieldClass =
  "min-h-11 w-full rounded-lg border border-input bg-surface px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Formulario `GET` sin JavaScript: la URL es el estado del listado, así se
 * puede compartir un filtro y el botón de retroceso funciona. No incluye
 * `page` a propósito, para que cambiar un filtro vuelva a la primera página.
 */
export function ExerciseFilters({ filters }: { filters: Filters }) {
  return (
    <form
      method="get"
      action="/exercises"
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
      <div className="space-y-2">
        <label htmlFor="q" className="block text-sm font-semibold">
          Buscar por nombre
        </label>
        <input
          className={fieldClass}
          id="q"
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          maxLength={80}
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Sentadilla, plancha, remo…"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="muscle" className="block text-sm font-semibold">
            Grupo muscular
          </label>
          <select
            className={fieldClass}
            id="muscle"
            name="muscle"
            defaultValue={filters.muscle ?? ""}
          >
            <option value="">Todos</option>
            {muscleGroups.map((value) => (
              <option key={value} value={value}>
                {muscleGroupLabels[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="equipment" className="block text-sm font-semibold">
            Equipamiento
          </label>
          <select
            className={fieldClass}
            id="equipment"
            name="equipment"
            defaultValue={filters.equipment ?? ""}
          >
            <option value="">Todos</option>
            {equipmentOptions.map((value) => (
              <option key={value} value={value}>
                {equipmentLabels[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="environment" className="block text-sm font-semibold">
            Entorno
          </label>
          <select
            className={fieldClass}
            id="environment"
            name="environment"
            defaultValue={filters.environment ?? ""}
          >
            <option value="">Todos</option>
            {environments.map((value) => (
              <option key={value} value={value}>
                {environmentLabels[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          className="min-h-11 w-full text-base sm:w-auto sm:px-6"
        >
          Aplicar filtros
        </Button>
        {hasActiveFilters(filters) && (
          <Link
            href={exercisesHref({
              q: undefined,
              muscle: undefined,
              equipment: undefined,
              environment: undefined,
              page: 1,
            })}
            className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          >
            Quitar filtros
          </Link>
        )}
      </div>
    </form>
  );
}
