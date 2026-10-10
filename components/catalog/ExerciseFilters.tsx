import { ListFilters } from "@/components/ui/ListFilters";
import {
  exerciseOrderLabels,
  exerciseOrders,
  exercisesHref,
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

const options = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  Object.fromEntries(values.map((value) => [value, labels[value]]));

/**
 * Formulario `GET` sin JavaScript: la URL es el estado del listado, así se
 * puede compartir un filtro y el botón de retroceso funciona. No incluye
 * `page` a propósito, para que cambiar un filtro vuelva a la primera página.
 *
 * Usa la barra compacta de `ListFilters`, como los demás listados: antes era
 * una tarjeta con un campo por fila que, a 375 px, llenaba la primera pantalla
 * entera antes del primer ejercicio.
 */
export function ExerciseFilters({ filters }: { filters: Filters }) {
  const chips = [
    filters.q && {
      label: filters.q,
      href: exercisesHref(filters, { q: undefined, page: 1 }),
      removeLabel: "Quitar búsqueda",
    },
    filters.muscle && {
      label: muscleGroupLabels[filters.muscle],
      href: exercisesHref(filters, { muscle: undefined, page: 1 }),
      removeLabel: "Quitar grupo muscular",
    },
    filters.equipment && {
      label: equipmentLabels[filters.equipment],
      href: exercisesHref(filters, { equipment: undefined, page: 1 }),
      removeLabel: "Quitar equipamiento",
    },
    filters.environment && {
      label: environmentLabels[filters.environment],
      href: exercisesHref(filters, { environment: undefined, page: 1 }),
      removeLabel: "Quitar entorno",
    },
  ].filter((chip) => !!chip);

  return (
    <ListFilters
      action="/exercises"
      label="Filtros del catálogo"
      values={filters}
      search={{ label: "Buscar por nombre", placeholder: "Sentadilla, plancha, remo…" }}
      // La vista no es un filtro, pero sí estado del listado: sin este campo,
      // cambiar un desplegable devolvería al usuario a la vista de tarjetas.
      extra={<input type="hidden" name="vista" value={filters.vista} />}
      choices={[
        { name: "muscle", label: "Músculo", options: options(muscleGroups, muscleGroupLabels) },
        { name: "equipment", label: "Equipo", options: options(equipmentOptions, equipmentLabels) },
        { name: "environment", label: "Entorno", options: options(environments, environmentLabels) },
        // No restringe resultados, solo cambia su orden: nunca está «sin elegir».
        { name: "orden", label: "Orden", options: options(exerciseOrders, exerciseOrderLabels), required: true },
      ]}
      chips={chips}
    />
  );
}
