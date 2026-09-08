"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "cn";

/**
 * Colección que se ojea, no que se recorre: crece a lo ancho con
 * desplazamiento horizontal y `scroll-snap`, y la tarjeta siguiente asoma por
 * el borde para que el ojo sepa que hay más. Es el patrón 1.1 de
 * `docs/13-referencia-smart-fit.md` —«las colecciones crecen a lo ancho, no a
 * lo largo»—.
 *
 * El `overflow-x` vive aquí, en la pista: el cuerpo de la página nunca se
 * desplaza en horizontal. Sin JavaScript sigue siendo una lista que se arrastra
 * con el dedo o el trackpad; el cliente sólo añade el control por teclado
 * (flechas izquierda y derecha mueven una tarjeta).
 *
 * La lista vertical se reserva para lo que se busca; esto, para lo que se ojea.
 */
export function Carousel({
  label,
  children,
  className,
}: {
  /** Nombre accesible de la colección: «Rutinas recomendadas», «Tus planes». */
  label: string;
  /** Una `CarouselItem` por tarjeta. */
  children: ReactNode;
  className?: string;
}) {
  const track = useRef<HTMLUListElement>(null);

  function step(direction: 1 | -1) {
    const list = track.current;
    if (!list) return;
    const first = list.querySelector<HTMLElement>(":scope > li");
    const amount = first ? first.offsetWidth + 16 : list.clientWidth * 0.8;
    list.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  }

  return (
    <ul
      ref={track}
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {children}
    </ul>
  );
}

/**
 * Una tarjeta del carrusel. Ocupa el 78 % del ancho a móvil —así la siguiente
 * asoma— y se topa en 20rem para que en escritorio quepan varias.
 */
export function CarouselItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "w-[min(78%,20rem)] shrink-0 snap-start",
        className,
      )}
    >
      {children}
    </li>
  );
}
