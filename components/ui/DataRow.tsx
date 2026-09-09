import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";

/**
 * Fila densa de un listado: miniatura o icono a la izquierda, título con dos
 * campos secundarios en el centro, datos accesorios y un chevron a la derecha.
 * Es el patrón 1.3 de `docs/13-referencia-smart-fit.md` —«una fila de 56–64 px
 * con icono y chevron»— y la contraparte densa de `Card`.
 *
 * Mide 64 px de alto (`min-h-16`), por encima de los 44 px de objetivo táctil
 * que pide `CLAUDE.md`. El chevron es la señal de «esto lleva a otro sitio»; va
 * `aria-hidden` porque quien navega con lector ya tiene el enlace del título.
 *
 * **El `title` lo construye quien llama**, no esta primitiva: el catálogo pinta
 * ahí su `<h2 class="text-base font-semibold leading-6">` con el enlace dentro,
 * que `verify-catalog-list.test.mjs` lee por expresión regular y es contrato. El
 * enlace del título lleva `after:absolute after:inset-0`, así que toda la fila
 * es su área de clic.
 */
export function DataRow({
  media,
  icon,
  title,
  secondary,
  trailing,
  className,
}: {
  /** URL de una miniatura. Si falta, se pinta `icon` centrado. */
  media?: string | null;
  /** Icono de reserva cuando no hay miniatura. */
  icon?: ReactNode;
  /** El encabezado con su enlace. Lo aporta quien llama para no perder su marcado. */
  title: ReactNode;
  /** Una línea de apoyo bajo el título; se recorta con puntos suspensivos. */
  secondary?: ReactNode;
  /** Datos accesorios a la derecha (badges, estado). Ocultos por debajo de `lg`. */
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "relative flex min-h-16 items-center gap-3 border-b border-border px-2 py-2 transition-colors hover:bg-muted sm:gap-4 sm:px-3",
        className,
      )}
    >
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
        {media ? (
          // Sin `next/image`: el dominio del bucket cambia entre local y
          // producción.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          icon
        )}
      </div>

      <div className="min-w-0 flex-1">
        {title}
        {secondary && (
          <p className="truncate text-sm text-muted-foreground">{secondary}</p>
        )}
      </div>

      {trailing && (
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {trailing}
        </div>
      )}

      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
    </article>
  );
}
