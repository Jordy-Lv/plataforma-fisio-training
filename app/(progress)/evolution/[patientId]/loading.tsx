import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/*
  Esqueleto de la evolución de un paciente: las pestañas de la ficha y las dos
  gráficas apiladas, peso y medidas arriba y cargas debajo. El grupo
  `(progress)` dibuja tres tarjetas bajas, sin las pestañas.

  El contenedor repite el ancho y los márgenes del shell porque el shell lo
  monta cada página vía `Workspace`, no el layout del grupo.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando la evolución del paciente"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-4 h-5 w-full max-w-md" />

      <div className="mt-6 flex gap-2 overflow-hidden border-b border-border pb-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-20 shrink-0" />
        ))}
      </div>

      <div className="mt-8 grid gap-10">
        {[0, 1].map((i) => (
          <div key={i} className="grid gap-3">
            <Skeleton className="h-7 w-48" />
            <SkeletonCard className="h-72" />
          </div>
        ))}
      </div>
    </div>
  );
}
