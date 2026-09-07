import { Skeleton } from "@/components/ui/Skeleton";

/*
  Esqueleto del formulario de acceso, con la misma forma que ocupará el
  contenido: título, dos campos y el botón. Una línea de «Cargando…» dejaba la
  tarjeta casi vacía y parecía que la pantalla se había roto.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div role="status" aria-label="Cargando tu acceso" className="grid gap-5">
      <div>
        <Skeleton className="h-8 w-52 rounded-lg bg-muted" />
        <Skeleton className="mt-4 h-5 w-full max-w-xs rounded-lg bg-muted" />
        <div className="mt-8 grid gap-5">
          <Skeleton className="h-12 rounded-lg bg-muted" />
          <Skeleton className="h-12 rounded-lg bg-muted" />
          <Skeleton className="h-12 rounded-lg bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
