"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/theme/use-theme";
import { cn } from "cn";

/**
 * Un solo botón para el tema: el sol indica modo claro y la luna, modo oscuro;
 * al pulsarlo pasa al otro. Para pantallas donde el grupo de tres opciones de
 * `ThemeToggle` ocupa demasiado (la portada en el teléfono).
 *
 * Solo alterna claro y oscuro. Si la preferencia guardada es «sistema», el
 * icono muestra el modo que el sistema está aplicando y el primer toque fija el
 * contrario.
 *
 * Se usa en el teléfono de la portada, del acceso y de la barra del paciente; en
 * escritorio y en las pantallas del personal sigue `ThemeToggle`. `test:smoke` espera, al abrir cada pantalla, a que
 * el control de tema visible esté hidratado: el grupo con su opción marcada o
 * este botón con `data-ready="true"` (`docs/11`).
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme, isReady } = useTheme();
  const [isDark, setIsDark] = useState(false);

  // El modo aplicado vive en la clase `dark` de `<html>`, que pone el script
  // del `<head>` antes de pintar; se lee al hidratar y tras cada cambio.
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, [theme, isReady]);

  const label = isDark ? "Modo oscuro. Cambiar a claro" : "Modo claro. Cambiar a oscuro";
  const Icon = isDark ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      data-theme-switch=""
      data-ready={isReady ? "true" : "false"}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
