/**
 * Réplica de los tokens de color de `app/globals.css`.
 *
 * El manifest de la PWA y las etiquetas `<meta>` del `<head>` no pueden leer
 * variables CSS, así que estos valores se fijan aquí una sola vez y los usan
 * `app/manifest.ts` y `app/layout.tsx`. Si cambia el token en `globals.css`
 * (por ejemplo, en el cambio de identidad visual de la semana 2), hay que
 * actualizar este archivo también.
 *
 * `BRAND_COLOR` y `BACKGROUND_COLOR` son los de la paleta clara. Un manifest
 * solo admite un `theme_color`, así que se queda con el claro; el `<meta>`
 * `theme-color` del viewport sí varía por modo y usa además los dos valores
 * oscuros de más abajo, que son los que pinta el navegador alrededor de la app
 * instalada cuando el teléfono está en modo oscuro.
 */
export const BRAND_COLOR = "#146c5b";
export const BACKGROUND_COLOR = "#f7f9f8";
export const DARK_BRAND_COLOR = "#4db6a0";
export const DARK_BACKGROUND_COLOR = "#0d1614";
