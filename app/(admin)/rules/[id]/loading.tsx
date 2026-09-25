import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/*
  Esqueleto de la ficha de una regla: la sección de condiciones con su lista de
  pares término–valor y, debajo, las secciones de edición. El grupo `(admin)`
  dibuja tres tarjetas iguales, que no se parecen a esto.

  El contenedor repite el ancho y los márgenes del shell porque el shell lo
  monta cada página vía `Workspace`, no el layout del grupo.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando la regla"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-4 h-5 w-full max-w-md" />

      <SkeletonCard className="mt-8 h-56" />

      <div className="mt-8 grid gap-6">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-24" />
      </div>
    </div>
  );
}
