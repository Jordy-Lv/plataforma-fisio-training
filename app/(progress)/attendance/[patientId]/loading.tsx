import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/*
  Esqueleto de la asistencia de un paciente: las pestañas de la ficha, el
  historial a la izquierda y el formulario de registro a la derecha. El grupo
  `(progress)` dibuja tres tarjetas apiladas, sin las pestañas ni las dos
  columnas.

  El contenedor repite el ancho y los márgenes del shell porque el shell lo
  monta cada página vía `Workspace`, no el layout del grupo.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando la asistencia del paciente"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-4 h-5 w-full max-w-md" />

      <div className="mt-6 flex gap-2 overflow-hidden border-b border-border pb-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-20 shrink-0" />
        ))}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
        <div className="grid gap-4">
          <Skeleton className="h-7 w-40" />
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-28" />
          ))}
        </div>
        <SkeletonCard className="h-96" />
      </div>
    </div>
  );
}
