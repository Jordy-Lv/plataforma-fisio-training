import { CLIENT_NAME } from "@/lib/brand/client";
import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import {
  BACKGROUND_COLOR,
  DARK_BACKGROUND_COLOR,
} from "@/lib/pwa/theme";
import { THEME_INIT_SCRIPT } from "@/lib/theme/constants";
import "./globals.css";

// URL pública de la app: en local es `http://localhost:3000`; en el despliegue
// la define `NEXT_PUBLIC_SITE_URL` (ver `.env.example`). Sirve de base para que
// las URL de los iconos y del manifest se resuelvan de forma absoluta.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Figtree se autoaloja: `next/font` descarga los archivos en el build y los
// sirve desde nuestro dominio, así que la app se ve igual en Android y en
// Windows, donde Avenir no existe. `display: "swap"` más el ajuste automático
// de métricas de Next evitan el salto de texto al terminar de cargar.
const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: CLIENT_NAME,
  title: CLIENT_NAME,
  description:
    "Rutinas, seguimiento y progreso para entrenamiento y fisioterapia en un solo lugar.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: CLIENT_NAME,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  // El color que el navegador pinta alrededor de la app instalada. Con las dos
  // variantes, la barra de estado del teléfono acompaña al modo en vez de
  // quedarse clara sobre una app oscura.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BACKGROUND_COLOR },
    { media: "(prefers-color-scheme: dark)", color: DARK_BACKGROUND_COLOR },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={figtree.variable} suppressHydrationWarning>
      <head>
        {/*
          Aplica el tema antes del primer pintado. Va aquí, en línea y lo primero
          del `<head>`, porque cualquier otra colocación deja un destello blanco
          al abrir la app de noche. `suppressHydrationWarning` en `<html>` es
          necesario: este script añade la clase `dark` que el HTML del servidor
          no puede conocer.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/*
          Next 15 solo emite `mobile-web-app-capable` desde `appleWebApp.capable`;
          iOS anterior a 17 aún necesita la variante con prefijo `apple-` para
          arrancar en modo aplicación. Se pone aquí a mano porque hacerlo vía
          `metadata.other` rompe el traslado del resto de etiquetas al `<head>`.
        */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
