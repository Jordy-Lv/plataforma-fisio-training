/** Identidad entregada por el cliente el 7 de septiembre de 2026. */
export const CLIENT_NAME = "AmadorTrainer";
export const CLIENT_TAGLINE = "Entrena tu mejor versión";
export const CLIENT_LOGOS = {
  gold: "/brand/amadortrainer/logo-dorado-original.png",
  white: "/brand/amadortrainer/logo-blanco-original.png",
  monochromeReference: "/brand/amadortrainer/variantes-monocromas-original.png",
} as const;

/**
 * Foto de fondo del panel de las pantallas de acceso: 626 px, en gris y en
 * WebP (9 KB). Va atenuada detrás del logo, así que no necesita más resolución.
 */
export const CLIENT_AUTH_BACKGROUND = "/brand/amadortrainer/fondo-acceso.webp";

/**
 * El símbolo del logo (la «A» con la flecha) en blanco sobre transparente,
 * recortado de `logo-blanco-original.png` sin retocarlo: 174 × 145 px. Hace de
 * «A» en la marca de la barra del paciente (`ClientWordmark`).
 */
export const CLIENT_SYMBOL_WHITE = "/brand/amadortrainer/simbolo-blanco.png";
