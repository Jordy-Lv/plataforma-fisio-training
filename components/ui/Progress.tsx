import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "cn";

/**
 * Barra de avance. Se apoya en `@base-ui/react`, que ya estaba instalado: no
 * añade dependencias. La primitiva pone los papeles de accesibilidad
 * (`role="progressbar"` con su valor, su mínimo y su máximo), que es lo que
 * hace que un lector de pantalla anuncie «3 de 6» sin que lo escribamos.
 *
 * No lleva `"use client"`: no tiene estado ni manejadores, así que se puede
 * pintar desde el servidor.
 */
export function Progress({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  /** Lo que anuncia la barra. Va a `aria-label`, no a la pantalla. */
  label: string;
  className?: string;
}) {
  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      aria-label={label}
      className={cn("w-full", className)}
    >
      <ProgressPrimitive.Track className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <ProgressPrimitive.Indicator className="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}
