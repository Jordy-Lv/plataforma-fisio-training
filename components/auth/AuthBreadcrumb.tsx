"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/*
  Migas de pan de las pantallas de acceso: «← Inicio › <pantalla>», para volver
  a la portada. Va dentro del panel de marca, que es siempre oscuro, así que el
  texto sale claro sin escribir un color a mano.

  En el teléfono solo se ve «← Inicio»: el nombre de la pantalla chocaría con el
  conmutador de tema, y el título de la tarjeta ya lo dice justo debajo.

  Es de cliente solo para leer la ruta: el layout de `(auth)` envuelve las tres
  pantallas y no sabe cuál se está mostrando.
*/
const PAGE_LABELS: Record<string, string> = {
  "/login": "Iniciar sesión",
  "/recuperar": "Recuperar acceso",
  "/actualizar-contrasena": "Nueva contraseña",
};

export function AuthBreadcrumb({ className }: { className?: string }) {
  const current = PAGE_LABELS[usePathname()];

  return (
    <nav aria-label="Ruta de navegación" className={className}>
      <ol className="flex items-center gap-1.5 text-sm text-foreground">
        <li>
          <Link
            href="/"
            className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 font-medium underline underline-offset-4 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Inicio
          </Link>
        </li>
        {current && (
          <>
            <li aria-hidden="true" className="hidden sm:block">
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </li>
            <li aria-current="page" className="hidden text-muted-foreground sm:block">
              {current}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
