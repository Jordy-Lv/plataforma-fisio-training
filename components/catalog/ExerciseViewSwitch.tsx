import { LayoutGrid, List } from "lucide-react";
import { cn } from "cn";
import {
  exercisesHref,
  type ExerciseFilters,
  type ExerciseView,
} from "@/lib/catalog/schemas";

/*
  Dos enlaces, no un `<form method="get">`.

  `docs/11-contratos-de-las-suites-http.md` avisa de que un formulario nuevo
  colocado antes de otro puede secuestrar su marcador, y `auth-http.mjs` exige
  que el formulario que encuentra lleve un `$ACTION_*`, que un `GET` no tiene.
  Con enlaces no hay formulario que colocar y el conmutador funciona igual sin
  JavaScript. El estado va en la URL, así que el botón de retroceso deshace el
  cambio de vista como cualquier otro.

  Al conmutar se vuelve a la página 1: la vista de lista trae 60 por página y la
  de tarjetas 24, así que la página 3 de una no es la página 3 de la otra.
*/
const opciones: { vista: ExerciseView; label: string; icono: typeof List }[] = [
  { vista: "tarjetas", label: "Tarjetas", icono: LayoutGrid },
  { vista: "lista", label: "Lista", icono: List },
];

export function ExerciseViewSwitch({ filters }: { filters: ExerciseFilters }) {
  return (
    <div
      className="inline-flex rounded-lg border border-border p-0.5"
      role="group"
      aria-label="Cómo se ve el catálogo"
    >
      {opciones.map(({ vista, label, icono: Icono }) => {
        const activa = filters.vista === vista;
        return (
          <a
            key={vista}
            href={exercisesHref(filters, { vista, page: 1 })}
            aria-current={activa ? "true" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              activa
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icono aria-hidden="true" className="size-4" />
            {label}
          </a>
        );
      })}
    </div>
  );
}
