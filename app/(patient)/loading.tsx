import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/*
  Esqueleto de la vista del paciente. Sustituye al «Cargando…» suelto: con una
  sola línea de texto la pantalla parecía vacía y en una conexión lenta —la
  habitual en el gimnasio— daba la sensación de que la app se había caído.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando tu espacio"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <div>
        <Skeleton className="h-9 w-56 rounded-lg bg-muted" />
        <Skeleton className="mt-4 h-5 w-full max-w-md rounded-lg bg-muted" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard
              key={i}
              className="h-28 rounded-2xl border border-border bg-muted/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
