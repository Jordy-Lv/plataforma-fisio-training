import { cn } from "cn";
import { FilterForm } from "@/components/ui/FilterForm";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  exerciseList,
  exerciseOrderLabels,
  exerciseOrders,
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

/**
 * Formulario `GET` sin JavaScript: la URL es el estado del listado, así se
 * puede compartir un filtro y el botón de retroceso funciona. No incluye
 * `page` a propósito, para que cambiar un filtro vuelva a la primera página.
 *
 * Es un `<form>`, no un `<div>`, así que toma las clases de la tarjeta en vez
 * de envolverse en `<Card>`.
 */
export function ExerciseFilters({ filters }: { filters: Filters }) {
  return (
    <FilterForm
      label="Filtros del catálogo"
      action="/exercises"
      className={cn(cardVariants({ padding: "sm" }), "sm:p-5")}
    >
      {/* La vista no es un filtro, pero sí estado del listado: sin este campo,
          cambiar un desplegable devolvería al usuario a la vista de tarjetas.
          Va oculto y con la vista actual, que el esquema ya acotó. */}
      <input type="hidden" name="vista" value={filters.vista} />

      <Field label="Buscar por nombre">
        <Input
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          maxLength={80}
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Sentadilla, plancha, remo…"
        />
      </Field>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Grupo muscular">
          <Select name="muscle" defaultValue={filters.muscle ?? ""}>
            <option value="">Todos</option>
            {muscleGroups.map((value) => (
              <option key={value} value={value}>
                {muscleGroupLabels[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Equipamiento">
          <Select name="equipment" defaultValue={filters.equipment ?? ""}>
            <option value="">Todos</option>
            {equipmentOptions.map((value) => (
              <option key={value} value={value}>
                {equipmentLabels[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Entorno">
          <Select name="environment" defaultValue={filters.environment ?? ""}>
            <option value="">Todos</option>
            {environments.map((value) => (
              <option key={value} value={value}>
                {environmentLabels[value]}
              </option>
            ))}
          </Select>
        </Field>

        {/* No es un filtro: no restringe resultados, solo cambia su orden.
            Por eso `exerciseList` lo declara en `notFilters`, igual que `vista`. */}
        <Field label="Orden">
          <Select name="orden" defaultValue={filters.orden}>
            {exerciseOrders.map((value) => (
              <option key={value} value={value}>
                {exerciseOrderLabels[value]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {hasActiveFilters(filters) && <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtros activos">
        {filters.q && <Chip href={exercisesHref(filters, { q: undefined, page: 1 })} removeLabel="Quitar búsqueda">{filters.q}</Chip>}
        {filters.muscle && <Chip href={exercisesHref(filters, { muscle: undefined, page: 1 })} removeLabel="Quitar grupo muscular">{muscleGroupLabels[filters.muscle]}</Chip>}
        {filters.equipment && <Chip href={exercisesHref(filters, { equipment: undefined, page: 1 })} removeLabel="Quitar equipamiento">{equipmentLabels[filters.equipment]}</Chip>}
        {filters.environment && <Chip href={exercisesHref(filters, { environment: undefined, page: 1 })} removeLabel="Quitar entorno">{environmentLabels[filters.environment]}</Chip>}
      </div>}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {hasActiveFilters(filters) && (
          <ButtonLink
            variant="ghost"
            href={exercisesHref(exerciseList.empty, { vista: filters.vista, orden: filters.orden })}
          >
            Quitar filtros
          </ButtonLink>
        )}
      </div>
    </FilterForm>
  );
}
