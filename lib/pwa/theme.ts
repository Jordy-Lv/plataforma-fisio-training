/**
 * Réplica de los tokens `--brand` y `--background` de `app/globals.css`.
 *
 * El manifest de la PWA y las etiquetas `<meta>` del `<head>` no pueden leer
 * variables CSS, así que estos valores se fijan aquí una sola vez y los usan
 * `app/manifest.ts` y `app/layout.tsx`. Si cambia el token en `globals.css`
 * (por ejemplo, en el cambio de identidad visual de la semana 2), hay que
 * actualizar este archivo también.
 */
export const BRAND_COLOR = "#146c5b";
export const BACKGROUND_COLOR = "#f7f9f8";
