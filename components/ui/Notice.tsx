import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";

/**
 * Aviso en línea: el mensaje que acompaña a un formulario o encabeza una
 * pantalla y llega ya renderizado desde el servidor. Es la contraparte del
 * `Toast` de la fase 3, que solo existe tras una interacción en el cliente y
 * desaparece solo; esto se queda hasta que cambia la página.
 *
 * Antes de la fase 6 cada pantalla lo escribía a mano: unas con recuadro y
 * otras con una línea de texto roja, así que un error de validación y un aviso
 * de que todo fue bien se leían con el mismo peso. Los cuatro tonos salen de
 * los tokens semánticos, no de un color literal.
 *
 * Sin `title` el aviso es un `<p>` con el texto **directo** dentro, y no un
 * `<div>` con el texto envuelto. No es cosmética: las suites de `scripts/`
 * extraen el mensaje del HTML del servidor con `/role="alert"[^>]*>([^<]*)/` en
 * unas y `/role="alert"[^>]*>([\s\S]*?)<\/p>/` en otras, así que solo un
 * párrafo con el rol encima satisface a las dos. Con `title` sí hace falta un
 * `<div>`, porque dentro va más de un bloque; ese caso no lo usa ninguna suite.
 * `as` permite forzarlo cuando el contenido es un bloque (una lista, un botón).
 *
 * El rol lo decide el tono: `danger` interrumpe con `alert` porque el lector de
 * pantalla debe anunciarlo aunque el foco esté en otro sitio; el resto usa
 * `status`, que espera a que el lector termine la frase en curso. `role` puede
 * forzarse cuando la pantalla ya sabe cuál necesita.
 */
const tones = {
  info: "border-info/35 bg-info-soft text-info",
  success: "border-success/35 bg-success-soft text-success",
  warning: "border-warning/35 bg-warning-soft text-warning",
  danger: "border-danger/35 bg-danger-soft text-danger",
} as const;

export type NoticeTone = keyof typeof tones;

export function Notice({
  tone = "info",
  title,
  as,
  className,
  children,
  role,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  tone?: NoticeTone;
  title?: ReactNode;
  as?: "p" | "div";
}) {
  const Element = as ?? (title ? "div" : "p");
  return (
    <Element
      data-slot="notice"
      role={role ?? (tone === "danger" ? "alert" : "status")}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm leading-6",
        tones[tone],
        className,
      )}
      {...props}
    >
      {title && <p className="font-semibold">{title}</p>}
      {title ? <div className="mt-1">{children}</div> : children}
    </Element>
  );
}
