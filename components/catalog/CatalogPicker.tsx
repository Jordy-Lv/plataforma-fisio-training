import type { ReactNode } from "react";
import { cn } from "cn";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select } from "@/components/ui/Field";
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

      <FilterForm
        action={action}
        label="Buscar en el catálogo"
        className={cn(cardVariants({ padding: "sm" }), "sm:p-5")}
      >
        {Object.entries(hiddenParams).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

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

        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtros activos">
            {chips.map((chip) => (
              <Chip key={chip.removeLabel} href={chip.href} removeLabel={chip.removeLabel}>
                {chip.label}
              </Chip>
            ))}
          </div>
        )}

        {clearHref && (
          <div className="mt-5">
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
