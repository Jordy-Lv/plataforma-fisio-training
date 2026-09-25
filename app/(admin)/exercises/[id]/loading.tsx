import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/*
  Esqueleto de la ficha de un ejercicio. El grupo `(admin)` ya tiene un
  `loading.tsx`, pero dibuja tres tarjetas apiladas; esta ficha es la imagen a
  la izquierda y los datos a la derecha, con las indicaciones debajo.

  El contenedor repite el ancho y los márgenes del shell porque el shell lo
  monta cada página vía `Workspace`, no el layout del grupo.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando el ejercicio"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-4 h-5 w-full max-w-md" />

      <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
        <SkeletonCard className="aspect-square" />
        <div className="grid content-start gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-full max-w-sm" />
          ))}
        </div>
      </div>

      <SkeletonCard className="mt-8 h-48" />
    </div>
  );
}
