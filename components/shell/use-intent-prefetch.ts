"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
// `PrefetchKind` no se reexporta desde `next/navigation`; es el mismo enum que
// usa `<Link prefetch>` por dentro. Si una versión de Next lo moviera, el
// `typecheck` lo diría.
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";

/*
  Precarga una pantalla cuando el usuario muestra intención de abrirla: al pasar
  el ratón, al enfocarla con el teclado o al empezar a tocarla. Pide la pantalla
  **completa**, con sus datos, así que normalmente llega antes del clic y el
  cambio de sección es inmediato, sin esqueleto de carga.

  Por qué no la precarga normal de `<Link>`: esa se dispara para todo enlace
  visible en cuanto se pinta la pantalla, y en `/routine/sessions/[id]` competía
  con el guardado de cada ejercicio (KAN-19, ver `MobileNav`). Aquí solo se pide
  la pantalla que el usuario está a punto de abrir, y una sola vez por enlace.

  Uso: `<Link prefetch={false} {...intent(href)}>`.
*/
export function useIntentPrefetch() {
  const router = useRouter();
  const requested = useRef(new Set<string>());

  return function intent(href: string) {
    const prefetch = () => {
      if (requested.current.has(href)) return;
      requested.current.add(href);
      router.prefetch(href, { kind: PrefetchKind.FULL });
    };
    return {
      onMouseEnter: prefetch,
      onFocus: prefetch,
      onTouchStart: prefetch,
    };
  };
}
