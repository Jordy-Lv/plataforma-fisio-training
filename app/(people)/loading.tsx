/*
  Esqueleto de la ficha de la persona. Sustituye al «Cargando…» suelto: una sola línea de texto
  dejaba la pantalla en blanco y parecía que la app se había caído. El
  contenedor repite el ancho y los márgenes del shell para que los bloques
  caigan donde luego cae el contenido.

  `animate-pulse` se desactiva solo con `prefers-reduced-motion`.
*/
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando tu espacio"
      className="mx-auto max-w-[86rem] px-5 py-8 sm:px-8"
    >
      <div className="animate-pulse motion-reduce:animate-none">
        <div className="h-9 w-56 rounded-lg bg-muted" />
        <div className="mt-4 h-5 w-full max-w-md rounded-lg bg-muted" />
        <div className="mt-8 grid gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border border-border bg-muted/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
