import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/**
 * 404 global. Se renderiza para cualquier `notFound()` —una URL mal escrita o
 * un recurso que el rol no puede ver— y también fuera de los grupos de rutas,
 * así que va sin shell ni navegación. Sin esta página, Next sirve su 404 por
 * defecto: fondo negro y texto en inglés, que rompe una aplicación en español
 * con sistema de diseño.
 */
export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-5 py-10 text-foreground">
      <Card padding="lg" className="grid max-w-xl gap-4 text-center">
        <p className="text-sm font-semibold text-muted-foreground">Error 404</p>
        <CardTitle className="text-2xl">No encontramos esta página</CardTitle>
        <CardDescription className="text-base leading-7">
          El enlace puede estar mal escrito, el contenido se movió o no tienes
          permiso para verlo. Vuelve al inicio y continúa desde ahí.
        </CardDescription>
        <ButtonLink href="/" variant="default" size="lg" className="justify-self-center">
          Volver al inicio
        </ButtonLink>
      </Card>
    </main>
  );
}
