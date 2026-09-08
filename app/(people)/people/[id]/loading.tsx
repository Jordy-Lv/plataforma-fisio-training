import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/*
  Esqueleto de la ficha del paciente. El grupo `(people)` ya tenía un
  `loading.tsx`, pero dibujaba tres tarjetas apiladas; esta pantalla es una
  banda de pestañas, una cabecera con el resumen agregado y dos columnas
  —perfil y condiciones—, así que necesita su propia forma.

  El contenedor repite el ancho y los márgenes del shell porque el shell lo
  monta cada página vía `Workspace`, no el layout del grupo. `animate-pulse` se
  desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando la ficha del paciente"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <Skeleton className="h-9 w-64 rounded-lg bg-muted" />

      <div className="mt-6 flex gap-2 border-b border-border pb-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-lg bg-muted" />
        ))}
      </div>

      <SkeletonCard className="mt-6 h-28" />

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-2">
        <SkeletonCard className="h-80" />
        <SkeletonCard className="h-80" />
      </div>
    </div>
  );
}
