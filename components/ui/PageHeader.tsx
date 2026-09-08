import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * Encabezado de página: título, explicación y acciones. Vive fuera del shell
 * porque cada pantalla decide su propio título, mientras que el shell solo se
 * ocupa de la navegación.
 *
 * `description` se limita a `max-w-2xl` para que el texto no supere las ~75
 * caracteres por línea en pantallas anchas.
 *
 * Las acciones van en píldoras a la derecha del título: el contenedor lleva
 * `data-slot="header-actions"` y la forma la aplica `buttonVariants`, así que
 * la pantalla sigue pasando sus `ButtonLink` como siempre.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 grid gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        {actions && (
          <div
            data-slot="header-actions"
            className="flex flex-wrap items-center gap-2"
          >
            {actions}
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
