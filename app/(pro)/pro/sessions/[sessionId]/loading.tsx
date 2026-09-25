import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/*
  Esqueleto del informe de una sesión registrada: el resumen de la sesión y un
  bloque por ejercicio con lo que el paciente anotó. El grupo `(pro)` dibuja el
  panel del profesional, que no se parece a esto.

  El contenedor repite el ancho y los márgenes del shell porque el shell lo
  monta cada página vía `Workspace`, no el layout del grupo.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando la sesión"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-4 h-5 w-full max-w-md" />

      <SkeletonCard className="mt-8 h-24" />

      <div className="mt-6 grid gap-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
