import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";

/**
 * Estado vacío. La convención del proyecto es que un vacío explica qué hacer,
 * no dice «Sin datos»: por eso el texto de apoyo va como contenido y no es
 * opcional, y `action` ofrece la salida cuando la hay.
 *
 * El borde discontinuo distingue el hueco («aquí va a haber algo») de una
 * tarjeta con contenido real, que lleva borde sólido.
 */
export function EmptyState({
  title,
  action,
  className,
  children,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "rounded-2xl border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      <p className="font-semibold">{title}</p>
      <div className="mx-auto mt-2 max-w-md leading-7 text-muted-foreground">
        {children}
      </div>
      {action && <div className="mt-5 flex justify-center gap-3">{action}</div>}
    </div>
  );
}
