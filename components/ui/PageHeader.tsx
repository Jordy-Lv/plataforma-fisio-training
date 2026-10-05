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
 *
 * La variante `hero` es la de las pantallas del paciente: título grande en
 * negrita y menos espacio debajo, porque detrás vienen sus pestañas.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  variant = "default",
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  variant?: "default" | "hero";
}) {
  const isHero = variant === "hero";
  return (
    <div className={cn(isHero ? "mb-3 grid gap-2" : "mb-8 grid gap-4", className)}>
      <div
        className={cn(
          "flex flex-wrap justify-between gap-4",
          isHero ? "items-center" : "items-start",
        )}
      >
        <h1
          className={cn(
            "tracking-tight text-balance",
            isHero
              ? "text-[32px] font-extrabold leading-tight sm:text-[40px]"
              : "text-3xl font-semibold sm:text-4xl",
          )}
        >
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
        <div
          className={cn(
            "max-w-2xl text-muted-foreground",
            isHero ? "text-sm leading-6" : "leading-7",
          )}
        >
          {description}
        </div>
      )}
    </div>
  );
}
