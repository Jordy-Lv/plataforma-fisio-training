"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useToast } from "@/components/ui/Toast";

/*
  Convierte un acuse que viaja en la URL (`?nueva=1`, `?eliminada=1`, …) en un
  aviso efímero, y luego limpia ese parámetro para que el acuse no reaparezca al
  recargar ni al compartir el enlace.

  No envuelve ninguna server action —hacerlo rompería el `$ACTION_ID` y dejaría
  la acción sin funcionar sin JavaScript (ADR-0008)—: solo lee la URL después de
  que la navegación ya ocurrió.

  El `<p role="status">` que el servidor pinta con el mismo mensaje se mantiene
  en la pantalla: es el acuse accesible sin JavaScript y lo que leen las suites
  HTTP. Este componente no lo sustituye, lo acompaña; cuando hay JavaScript, el
  aviso efímero aparece y el parámetro desaparece de la barra de direcciones.
*/
export function FlashToast({
  param,
  value = "1",
  message,
  description,
}: {
  /** Nombre del parámetro de acuse, p. ej. `"nueva"`. */
  param: string;
  /** Valor que activa el aviso. Por defecto `"1"`. */
  value?: string;
  /** Texto del aviso. Suele coincidir con el del `<p role="status">`. */
  message: string;
  /** Segunda línea opcional del aviso. */
  description?: string;
}) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const shown = useRef(false);

  useEffect(() => {
    // Un solo aviso por montaje: si el efecto se reejecuta tras limpiar la URL
    // no debe volver a dispararse.
    if (shown.current) return;
    if (search.get(param) !== value) return;

    shown.current = true;
    toast.success(message, description ? { description } : undefined);

    const next = new URLSearchParams(search);
    next.delete(param);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [search, param, value, message, description, toast, router, pathname]);

  return null;
}
