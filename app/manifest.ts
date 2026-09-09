import { CLIENT_NAME } from "@/lib/brand/client";
import type { MetadataRoute } from "next";

import { BACKGROUND_COLOR, BRAND_COLOR } from "@/lib/pwa/theme";

/**
 * Manifest de la PWA. Next.js lo sirve en `/manifest.webmanifest` con el
 * `Content-Type: application/manifest+json` correcto.
 *
 * `start_url` y `scope` son relativos a propósito: así funcionan igual en local
 * (`http://localhost:3000`) y en el despliegue sin depender de una variable de
 * entorno.
 *
 * `start_url` apunta a `/login` porque la app va detrás de acceso: si la sesión
 * sigue viva (la cookie persiste en la ventana instalada), `/login` redirige de
 * inmediato a la vista del rol; si no, muestra el formulario de acceso. Así el
 * icono no rompe el flujo de sesión en ningún caso.
 *
 * Los colores replican los tokens de `app/globals.css` (`--brand` y
 * `--background`); un manifest no puede leer variables CSS, así que se fijan
 * aquí con el mismo valor.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: CLIENT_NAME,
    short_name: CLIENT_NAME,
    description:
      "Rutinas, seguimiento y progreso para entrenamiento y fisioterapia en un solo lugar.",
    lang: "es",
    dir: "ltr",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: BACKGROUND_COLOR,
    theme_color: BRAND_COLOR,
    categories: ["health", "fitness", "medical"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
