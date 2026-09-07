import { FilterForm } from "@/components/ui/FilterForm";
import { Field, Input, Select } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cardVariants } from "@/components/ui/Card";

type Choice = { name: string; label: string; options: Record<string, string> };
/** Los enlaces para quitar filtros viven fuera del formulario GET. */
export function ListFilters({ action, label, values, choices, chips }: {
  action: string; label: string; values: Record<string, unknown>; choices: Choice[];
  chips: { label: string; href: string; removeLabel: string }[];
}) {
  return <div className="mb-6 grid gap-3">
    <FilterForm action={action} label={label} className={cardVariants({padding:"sm"})}>
      <Field label="Buscar por nombre"><Input type="search" name="q" maxLength={80}
        defaultValue={typeof values.q === "string" ? values.q : ""} placeholder="Escribe un nombre…" /></Field>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {choices.map((choice) => <Field key={choice.name} label={choice.label}>
          <Select name={choice.name} defaultValue={values[choice.name] === true ? "1" : String(values[choice.name] ?? "")}>
            <option value="">Todos</option>
            {Object.entries(choice.options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>)}
      </div>
    </FilterForm>
    {chips.length > 0 && <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
      {chips.map((chip) => <Chip key={chip.removeLabel} href={chip.href} removeLabel={chip.removeLabel}>{chip.label}</Chip>)}
      <ButtonLink variant="ghost" href={action}>Quitar filtros</ButtonLink>
    </div>}
  </div>;
}
