import { cn } from "cn";

/**
 * Barra de avance sin JavaScript de cliente: no tiene estado ni manejadores,
 * así que el servidor puede entregar el ancho ya calculado.
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
  const safeMax = Math.max(max, 1);
  const current = Math.min(Math.max(value, 0), safeMax);
  const percentage = (current / safeMax) * 100;

  return (
    <div
      aria-label={label}
      aria-valuemax={safeMax}
      aria-valuemin={0}
      aria-valuenow={current}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      role="progressbar"
    >
      <div
        className="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
