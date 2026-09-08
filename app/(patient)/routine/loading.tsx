import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/*
  Esqueleto de las rutinas del paciente. Sustituye al «Cargando…» suelto: con una
  sola línea de texto la pantalla parecía vacía y en la conexión lenta del
  gimnasio daba la sensación de que la app se había caído.

  Repite la forma real de la pantalla: el título, la tarjeta de la sesión en
  curso, los días plegables de la rutina y el historial de abajo.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando tus rutinas"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <div>
        <Skeleton className="h-9 w-48 rounded-lg bg-muted" />
        <Skeleton className="mt-4 h-5 w-full max-w-md rounded-lg bg-muted" />

        <SkeletonCard className="mt-6 h-24 rounded-2xl border border-border bg-muted/60" />

        <div className="mt-8 grid gap-4">
          {[0, 1, 2].map((i) => (
            <SkeletonCard
              key={i}
              className="h-20 rounded-2xl border border-border bg-muted/60" />
          ))}
        </div>

        <Skeleton className="mt-10 h-6 w-40 rounded-lg bg-muted" />
        <div className="mt-4 grid gap-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard
              key={i}
              className="h-16 rounded-xl border border-border bg-muted/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
