import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { BRAND_COLOR } from "@/lib/pwa/theme";
import "./globals.css";

// URL pública de la app: en local es `http://localhost:3000`; en el despliegue
// la define `NEXT_PUBLIC_SITE_URL` (ver `.env.example`). Sirve de base para que
// las URL de los iconos y del manifest se resuelvan de forma absoluta.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Entrenamiento y fisioterapia",
  title: "Entrenamiento y fisioterapia",
  description:
    "Rutinas, seguimiento y progreso para entrenamiento y fisioterapia en un solo lugar.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fisio Training",
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
  themeColor: BRAND_COLOR,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
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
