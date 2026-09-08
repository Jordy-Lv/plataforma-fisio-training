import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";

import { ButtonLink } from "@/components/ui/ButtonLink";

/**
 * Cabecera de una colección dentro de una pantalla: el título a la izquierda y
 * su acción —casi siempre el «Ver todas» que lleva al listado propio— a la
 * derecha, alineada con él. Es el patrón 1.6 de
 * `docs/13-referencia-smart-fit.md`, y la contraparte de `PageHeader`, que hace
 * lo mismo con el título de la pantalla entera.
 *
 * Existe porque veinte secciones repetían `<h2 className="text-xl
 * font-semibold">` con su propio margen, y el enlace al listado, cuando lo
 * había, quedaba suelto al final de la lista, donde no se ve sin desplazarse.
 *
 * `id` es para el `aria-labelledby` de la `<section>` que la envuelve: el
 * título tiene que seguir siendo quien nombra a la región.
 */
export function SectionHeader({
  id,
  title,
  count,
  description,
  action,
  as: Heading = "h2",
  className,
}: {
  id?: string;
  title: ReactNode;
  /** El recuento de la colección, junto al título y en tono secundario. */
  count?: number;
  description?: ReactNode;
  action?: ReactNode;
  /** `h3` cuando la colección cuelga de otra sección que ya tiene su `h2`. */
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("mb-4 grid gap-1", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Heading
          id={id}
          className={cn(
            "min-w-0 font-semibold",
            Heading === "h2" ? "text-xl" : "text-base",
          )}
        >
          {title}
          {count !== undefined && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {count}
            </span>
          )}
        </Heading>
        {action && (
          <div
            data-slot="header-actions"
            className="flex flex-wrap items-center gap-2"
          >
            {action}
          </div>
        )}
      </div>
      {description && (
        <div className="max-w-2xl leading-7 text-muted-foreground">
          {description}
        </div>
      )}
    </div>
  );
}

/**
 * El «Ver todas» de una colección. El rótulo se pasa entero —«Ver todas las
 * sesiones», «Ver el catálogo»— porque en español el género lo pone la
 * colección y un «Ver todas» suelto no dice adónde lleva a quien usa lector de
 * pantalla.
 */
export function SeeAllLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <ButtonLink variant="ghost" href={href}>
      {children}
      <ChevronRight aria-hidden="true" data-icon="inline-end" />
    </ButtonLink>
  );
}
