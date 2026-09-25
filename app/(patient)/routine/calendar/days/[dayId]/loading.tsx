import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/*
  Esqueleto de un día del calendario del paciente: la etiqueta del tipo de
  rutina y la lista numerada de ejercicios, cada uno en su tarjeta. El grupo
  `(patient)` dibuja una cuadrícula de dos columnas, que en el teléfono salta
  a una lista distinta de la que llega.

  El contenedor repite el ancho y los márgenes del shell porque el shell lo
  monta cada página vía `Workspace`, no el layout del grupo.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando el día"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-4 h-5 w-full max-w-md" />

      <Skeleton className="mt-6 h-7 w-32 rounded-full" />

      <div className="mt-5 grid gap-3">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
