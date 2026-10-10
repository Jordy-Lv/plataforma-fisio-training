import type { ReactNode } from "react";
import { cn } from "cn";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input, Select } from "@/components/ui/Field";
import { FiltersToggle, FilterField, filterControlClass } from "@/components/ui/ListFilters";
import { Search } from "lucide-react";
import { FilterForm } from "@/components/ui/FilterForm";
import { Pagination } from "@/components/ui/Pagination";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { ExerciseListItem } from "@/lib/catalog/queries";
import type { ExerciseFilters } from "@/lib/catalog/schemas";
import {
  equipmentLabels,
  equipment as equipmentOptions,
  environmentLabels,
  environments,
  muscleGroupLabels,
  muscleGroups,
} from "@/lib/catalog/vocabulary";

/**
 * Buscador de catálogo único y permanente, embebido en `/templates/[id]` y en
 * `/pro/routines/[patientId]`. Filtros con autoenvío, paginación y un control de
 * añadir por resultado —el `children`, que cada pantalla cablea a su acción—.
 *
 * El `<form method="get">` de los filtros sigue en el HTML del servidor y
 * funciona sin JavaScript. **No emite ningún uuid como filtro** —los filtros
 * son enums—; los únicos ocultos son `dia`/`item`, que son estado de la
 * pantalla y ya viajaban así en el buscador anterior. Ningún marcador de las
 * suites de estas pantallas es «un uuid cualquiera», así que un `dia`/`item`
 * oculto no captura el formulario de añadir ni el de sustituir (ver `docs/11`).
 */
export function CatalogPicker({
  id = "catalogo-buscador",
  action,
  filters,
  hiddenParams = {},
  heading,
  description,
  closeHref,
  closeLabel = "Salir",
  chips = [],
  clearHref,
  exercises,
  pages,
  hrefForPage,
  emptyHint,
  children,
}: {
  id?: string;
  /** Ruta de la pantalla, sin query. */
  action: string;
  filters: ExerciseFilters;
  /** Parámetros de la pantalla que hay que conservar al filtrar. */
  hiddenParams?: Record<string, string>;
  heading: string;
  description?: ReactNode;
  /** En modo enfocado (`?dia=`/`?item=`), enlace para volver al buscador general. */
  closeHref?: string;
  closeLabel?: string;
  chips?: { label: string; href: string; removeLabel: string }[];
  clearHref?: string;
  exercises: ExerciseListItem[];
  pages: number;
  hrefForPage: (page: number) => string;
  emptyHint: ReactNode;
  /** El control de añadir o sustituir para cada ejercicio. */
  children: (exercise: ExerciseListItem) => ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(cardVariants({ padding: "lg" }), "mt-10")}
    >
      <SectionHeader
        as="h3"
        id={id}
        title={heading}
        description={description}
        action={
          closeHref ? (
            <ButtonLink variant="ghost" href={closeHref}>
              {closeLabel}
            </ButtonLink>
          ) : undefined
        }
      />

      {/* Sin tarjeta propia: ya va dentro de la sección. En el teléfono, solo
          el buscador y «Filtros» (docs/10, regla 8). */}
      <FilterForm
        action={action}
        label="Buscar en el catálogo"
        className="mt-4 grid gap-2"
      >
        {Object.entries(hiddenParams).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <div className="flex gap-2">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Buscar por nombre</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              type="search"
              defaultValue={filters.q ?? ""}
              maxLength={80}
              autoCapitalize="none"
              spellCheck={false}
              className="min-h-11 pl-9"
              placeholder="Sentadilla, plancha, remo…"
            />
          </label>
          <FiltersToggle
            active={[filters.muscle, filters.equipment, filters.environment].filter(Boolean).length}
          />
        </div>

        <div className="hidden flex-wrap gap-2 group-has-[[data-filters-toggle]:checked]/filters:flex sm:flex">
          <FilterField label="Músculo">
            <Select name="muscle" defaultValue={filters.muscle ?? ""} className={filterControlClass}>
              <option value="">Todos</option>
              {muscleGroups.map((value) => (
                <option key={value} value={value}>
                  {muscleGroupLabels[value]}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Equipo">
            <Select name="equipment" defaultValue={filters.equipment ?? ""} className={filterControlClass}>
              <option value="">Todos</option>
              {equipmentOptions.map((value) => (
                <option key={value} value={value}>
                  {equipmentLabels[value]}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Entorno">
            <Select name="environment" defaultValue={filters.environment ?? ""} className={filterControlClass}>
              <option value="">Todos</option>
              {environments.map((value) => (
                <option key={value} value={value}>
                  {environmentLabels[value]}
                </option>
              ))}
            </Select>
          </FilterField>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Filtros activos">
            {chips.map((chip) => (
              <Chip key={chip.removeLabel} href={chip.href} removeLabel={chip.removeLabel}>
                {chip.label}
              </Chip>
            ))}
          </div>
        )}

        {clearHref && (
          <div>
            <ButtonLink variant="ghost" href={clearHref}>
              Quitar filtros
            </ButtonLink>
          </div>
        )}
      </FilterForm>

      {exercises.length === 0 ? (
        <p className="mt-6 leading-7 text-muted-foreground">{emptyHint}</p>
      ) : (
        <>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {exercises.map((exercise) => (
              <li
                key={exercise.id}
                className={cn(
                  cardVariants({ padding: "none" }),
                  "grid gap-2 rounded-xl p-3",
                )}
              >
                <p className="text-sm font-medium">{exercise.name}</p>
                {children(exercise)}
              </li>
            ))}
          </ul>
          <Pagination
            page={filters.page}
            pages={pages}
            hrefFor={hrefForPage}
            label="Páginas del catálogo"
          />
        </>
      )}
    </section>
  );
}
