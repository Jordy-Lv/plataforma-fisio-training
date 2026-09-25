import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/*
  Esqueleto del editor de una plantilla: la ficha de datos en cuatro columnas,
  el buscador del catálogo y los días apilados. El grupo `(admin)` dibuja tres
  tarjetas iguales; esta pantalla es mucho más larga y conviene que el hueco lo
  anuncie.

  El contenedor repite el ancho y los márgenes del shell porque el shell lo
  monta cada página vía `Workspace`, no el layout del grupo.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando la plantilla"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-4 h-5 w-full max-w-md" />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>

      <SkeletonCard className="mt-8 h-40" />

      <div className="mt-8 grid gap-4">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}
