import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
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
    <form
      method="get"
      action="/exercises"
      className={cn(cardVariants({ padding: "sm" }), "sm:p-5")}
    >
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

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Aplicar filtros
        </Button>
        {hasActiveFilters(filters) && (
          <ButtonLink
            variant="ghost"
            href={exercisesHref({
              q: undefined,
              muscle: undefined,
              equipment: undefined,
              environment: undefined,
              page: 1,
            })}
          >
            Quitar filtros
          </ButtonLink>
        )}
      </div>
    </form>
  );
}
