import Link from "next/link";
import { cn } from "cn";
import { bodyPartLabels } from "@/lib/catalog/body-parts";
import {
  difficultyLabels,
  environmentLabels,
  goalLabels,
  labelFor,
} from "@/lib/catalog/vocabulary";
import type { AssignableTemplate } from "@/lib/routines/assignment-queries";
import { cardVariants } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";

/**
 * Una plantilla que el profesional puede elegir. El formulario lleva solo
 * `templateId`: el paciente va ligado a la acción con `.bind` en la página, así
 * que aquí **no hay `name="patientId"`** y el primer formulario con ese marcador
 * sigue siendo el de confirmar (`docs/11` §3).
 *
 * Se pinta dentro de `AssignmentFlow`, que es quien guarda el estado de la
 * acción: el acuse «Borrador creado» se ve en el paso siguiente, cuando esta
 * tarjeta ya no está.
 */
export function TemplateChoice({
  template,
  action,
}: {
  template: AssignableTemplate;
  action: (form: FormData) => void;
}) {
  const facts = [
    `${template.days_per_week} ${template.days_per_week === 1 ? "día" : "días"} por semana`,
    template.goal ? labelFor(goalLabels, template.goal) : null,
    template.level ? labelFor(difficultyLabels, template.level) : null,
    template.environment ? labelFor(environmentLabels, template.environment) : null,
  ].filter(Boolean);
  const removed = template.excludedNames.length;

  return (
    <li className={cn(cardVariants({ padding: "sm" }), "grid gap-3 sm:p-5")}>
      <div className="grid gap-1">
        <h3 className="break-words text-lg font-semibold">{template.name}</h3>
        <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>
        <p className="text-sm text-muted-foreground">
          {template.exerciseCount} ejercicios en {template.dayCount}{" "}
          {template.dayCount === 1 ? "día" : "días"}.
        </p>
        {removed > 0 && (
          <p className="text-sm text-warning">
            Se {removed === 1 ? "quitará 1 ejercicio" : `quitarán ${removed} ejercicios`} por{" "}
            {template.excludedFor.map((part) => labelFor(bodyPartLabels, part)).join(" y ")}:{" "}
            {template.excludedNames.join(", ")}.
          </p>
        )}
      </div>
      <form action={action}>
        <input type="hidden" name="templateId" value={template.id} />
        <SubmitButton
          className="w-full sm:w-auto"
          pendingLabel="Creando el borrador…"
          aria-label={`Usar esta plantilla: ${template.name}`}
        >
          Usar esta plantilla
        </SubmitButton>
      </form>
    </li>
  );
}

export type FilterGroup = {
  label: string;
  options: { label: string; href: string; selected: boolean }[];
};

/**
 * Filtros de la lista de plantillas: **enlaces, no un `<form>`**, como pide
 * `docs/11` §5 («Acotar una lista sin añadir un `<form>`»). Un valor elegido se
 * quita volviendo a pulsarlo.
 */
export function TemplateFilterLinks({
  groups,
  clearHref,
}: {
  groups: FilterGroup[];
  clearHref?: string;
}) {
  const visible = groups.filter((group) => group.options.length > 1);
  if (!visible.length) return null;
  return (
    <nav aria-label="Filtrar plantillas" className="grid gap-3">
      {visible.map((group) => (
        <div key={group.label} className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{group.label}:</span>
          {group.options.map((option) => (
            <Link
              key={option.label}
              href={option.href}
              prefetch={false}
              scroll={false}
              aria-current={option.selected ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                option.selected
                  ? "border-brand bg-brand-soft font-semibold text-brand-soft-foreground"
                  : "border-border",
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      ))}
      {clearHref && (
        <Link
          href={clearHref}
          prefetch={false}
          scroll={false}
          className="inline-flex min-h-11 items-center justify-self-start text-sm font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        >
          Quitar los filtros
        </Link>
      )}
    </nav>
  );
}
