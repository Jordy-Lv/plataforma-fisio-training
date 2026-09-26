import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "cn";
import { FilterForm } from "@/components/ui/FilterForm";
import { Input, Select } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/ButtonLink";

/**
 * `required` es para un `<select>` que nunca está «sin elegir» —el orden de un
 * listado, por ejemplo—: sin él se ofrecería un «Todos» que no filtra nada.
 */
type Choice = { name: string; label: string; options: Record<string, string>; required?: boolean };

/**
 * Un filtro con el rótulo **dentro** del control: «Estado  Todos ⌄». Es un
 * `<label>` con aspecto de campo que envuelve al control, así que el lector de
 * pantalla anuncia el nombre y todo el recuadro es el objetivo táctil de 44 px.
 *
 * A 375 px ocupa medio ancho; desde `sm`, lo que mida su contenido. El control
 * que va dentro se pinta sin borde propio con `filterControlClass`.
 */
export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-h-11 min-w-0 flex-1 basis-[calc(50%-0.25rem)] items-center gap-2 rounded-lg border border-input bg-surface pl-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring sm:flex-none sm:basis-auto">
    <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
    {children}
  </label>;
}

/** Lo que se añade a `inputClass` para el control que va dentro de `FilterField`. */
export const filterControlClass =
  "min-h-0 min-w-0 flex-1 self-stretch truncate border-0 bg-transparent py-0 pl-0 focus-visible:outline-none";

/**
 * La barra de filtros de un listado: un `<form method="get">` renderizado en el
 * servidor —así funciona sin JavaScript— y, debajo y **fuera** del formulario,
 * las píldoras que quitan cada filtro.
 *
 * El buscador ocupa una fila y los desplegables se reparten en la siguiente,
 * dos por fila en el teléfono; en escritorio, todo en una. El rótulo del
 * buscador no se ve —el marcador de posición ya dice qué hace— pero sigue
 * siendo su nombre accesible.
 *
 * `search` acepta `false` para las pantallas que no buscan por nombre, y
 * `extra` sirve para el control que no encaja en un `<select>` —el mes de
 * `/attendance`, por ejemplo—: va en la fila de los desplegables y se pinta
 * con `FilterField`.
 */
export function ListFilters({
  action, label, values, choices, chips, search, extra,
}: {
  action: string; label: string; values: Record<string, unknown>; choices: Choice[];
  chips: { label: string; href: string; removeLabel: string }[];
  search?: false | { label: string; placeholder?: string };
  extra?: ReactNode;
}) {
  const searchField = search ?? { label: "Buscar por nombre", placeholder: "Escribe un nombre…" };
  const hasControls = Boolean(extra) || choices.length > 0;
  return <div className="mb-6 grid gap-3">
    <FilterForm action={action} label={label}
      className={cn("grid gap-2", searchField && hasControls && "lg:grid-cols-[minmax(16rem,1fr)_auto] lg:items-start")}>
      {searchField && <label className="relative block">
        <span className="sr-only">{searchField.label}</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" name="q" maxLength={80} className="min-h-11 pl-9"
          defaultValue={typeof values.q === "string" ? values.q : ""} placeholder={searchField.placeholder} />
      </label>}
      {hasControls && <div className="flex flex-wrap gap-2">
        {extra}
        {choices.map((choice) => <FilterField key={choice.name} label={choice.label}>
          <Select name={choice.name} className={filterControlClass}
            defaultValue={values[choice.name] === true ? "1" : String(values[choice.name] ?? "")}>
            {!choice.required && <option value="">Todos</option>}
            {Object.entries(choice.options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </FilterField>)}
      </div>}
    </FilterForm>
    {chips.length > 0 && <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
      {chips.map((chip) => <Chip key={chip.removeLabel} href={chip.href} removeLabel={chip.removeLabel}>{chip.label}</Chip>)}
      <ButtonLink variant="ghost" href={action}>Quitar filtros</ButtonLink>
    </div>}
  </div>;
}
