import type { CSSProperties } from "react";

/*
  Las pantallas públicas —la portada y las de acceso— usan como dorado el
  amarillo luminoso del logo también en tema claro. Este estilo, puesto en su
  contenedor, redefine los tokens de marca a partir de `--brand-bright`, y todo
  lo de dentro lo hereda: textos en dorado, rellenos, foco y tema activo. El
  resto de la aplicación conserva su dorado oscuro.

  Coste conocido: como texto pequeño sobre blanco ese amarillo da 2,1:1.
*/
export const BRIGHT_BRAND_STYLE = {
  "--brand": "var(--brand-bright)",
  "--brand-foreground": "var(--brand-bright-foreground)",
  "--brand-soft": "var(--brand-bright)",
  "--brand-soft-foreground": "var(--brand-bright-foreground)",
  "--ring": "var(--brand-bright)",
} as CSSProperties;
