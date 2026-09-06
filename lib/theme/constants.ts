/**
 * Preferencia de tema del usuario. Tres estados, no dos: `system` es el valor
 * por defecto y sigue al sistema operativo, que es lo que espera quien ya tiene
 * el teléfono en modo oscuro.
 *
 * La preferencia se guarda en `localStorage` y se aplica como la clase `dark`
 * sobre `<html>`, que es la que activa el `@custom-variant dark` de
 * `app/globals.css`. `system` no guarda nada distinto: resuelve con
 * `prefers-color-scheme` en cada carga y reacciona en vivo si el sistema cambia.
 */
export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

export const DEFAULT_THEME: Theme = "system";

export const THEME_LABELS: Record<Theme, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Se inyecta como script en línea al principio del `<head>`, antes de que el
 * navegador pinte nada. Sin él, una app abierta de noche destella en blanco
 * antes de aplicar el modo oscuro.
 *
 * Va minificado a mano y envuelto en `try` porque `localStorage` lanza en
 * navegación privada de algunos navegadores y no queremos que eso rompa la
 * carga entera de la página.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
