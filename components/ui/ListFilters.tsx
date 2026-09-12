import type { ReactNode } from "react";
import { FilterForm } from "@/components/ui/FilterForm";
import { Field, Input, Select } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";

/**
 * `required` es para un `<select>` que nunca está «sin elegir» —el orden de un
 * listado, por ejemplo—: sin él se ofrecería un «Todos» que no filtra nada.
 */
type Choice = { name: string; label: string; options: Record<string, string>; required?: boolean };

/**
 * La barra de filtros de un listado: un `<form method="get">` renderizado en el
 * servidor —así funciona sin JavaScript— y, debajo y **fuera** del formulario,
 * las píldoras que quitan cada filtro.
 *
 * `search` acepta `false` para las pantallas que no buscan por nombre, y
 * `extra` sirve para el control que no encaja en un `<select>` —el mes de
 * `/attendance`, por ejemplo—.
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
  return <div className="mb-6 grid gap-3">
    <FilterForm action={action} label={label} className={cardVariants({padding:"sm"})}>
      {searchField && <Field label={searchField.label}><Input type="search" name="q" maxLength={80}
        defaultValue={typeof values.q === "string" ? values.q : ""} placeholder={searchField.placeholder} /></Field>}
      {extra}
      {choices.length > 0 && <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {choices.map((choice) => <Field key={choice.name} label={choice.label}>
          <Select name={choice.name} defaultValue={values[choice.name] === true ? "1" : String(values[choice.name] ?? "")}>
            {!choice.required && <option value="">Todos</option>}
            {Object.entries(choice.options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>)}
      </div>}
    </FilterForm>
    {chips.length > 0 && <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
      {chips.map((chip) => <Chip key={chip.removeLabel} href={chip.href} removeLabel={chip.removeLabel}>{chip.label}</Chip>)}
      <ButtonLink variant="ghost" href={action}>Quitar filtros</ButtonLink>
    </div>}
  </div>;
}
