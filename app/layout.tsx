import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Entrenamiento y fisioterapia",
  description:
    "Rutinas, seguimiento y progreso para entrenamiento y fisioterapia en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
