import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/*
  Esqueleto de la sesión en curso. Sustituye al «Cargando…» suelto: con una sola
  línea de texto la pantalla parecía vacía y a mitad de entrenamiento —conexión
  lenta y teléfono en la mano— daba la sensación de que la app se había caído.

  Repite la forma real: el título, la banda de avance fija y los bloques de
  registro de cada ejercicio.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando la sesión"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <div>
        <Skeleton className="h-9 w-56 rounded-lg bg-muted" />
        <Skeleton className="mt-4 h-5 w-full max-w-sm rounded-lg bg-muted" />

        <SkeletonCard className="mt-6 h-20 rounded-2xl border border-border bg-muted/60" />

        <div className="mt-8 grid gap-5">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard
              key={i}
              className="h-24 rounded-2xl border border-border bg-muted/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
