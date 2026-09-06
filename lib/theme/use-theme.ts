"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_THEME,
  isTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from "./constants";

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    // `localStorage` lanza en navegación privada de algunos navegadores.
    return DEFAULT_THEME;
  }
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

/**
 * Lee y escribe la preferencia de tema. El primer render devuelve siempre
 * `DEFAULT_THEME` para que el HTML del servidor y el del cliente coincidan; el
 * valor real se lee en el efecto. Quien pinte con esto debe tolerar ese primer
 * render, porque la clase `dark` ya la aplicó el script en línea del `<head>`
 * antes de que React monte.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setThemeState(readStoredTheme());
    setIsReady(true);
  }, []);

  // Con la preferencia en `system`, seguir al sistema en vivo: quien tenga el
  // teléfono en cambio automático al anochecer lo ve sin recargar.
  useEffect(() => {
    if (theme !== "system") return;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento la preferencia dura lo que la pestaña, que es
      // preferible a romper el conmutador.
    }
  }, []);

  return { theme, setTheme, isReady };
}
