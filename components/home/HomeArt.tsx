import type { CSSProperties } from "react";

/*
  Fondo vectorial del panel de marca de la portada, en lugar de una foto: no
  descarga nada y pesa menos de 2 KB dentro del HTML.

  - Una trama de puntos muy tenue que se desvanece hacia los bordes.
  - Cuatro triángulos concéntricos que repiten la «A» del logo, cada uno más
    tenue que el anterior. En claro van más marcados (el dorado sobre blanco
    pierde mucho); en oscuro el dorado brilla solo y se quedan sutiles. En la
    franja del teléfono solo se ven los dos interiores, y más suaves, porque
    pasan junto al logo.
  - Tres diagonales finas en el color del texto, solo en escritorio.
*/
const fadeToEdges = {
  maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
  WebkitMaskImage:
    "radial-gradient(ellipse at center, black 20%, transparent 75%)",
} satisfies CSSProperties;

const desktopTriangles = [
  { d: "M0 -170 L196 170 L-196 170 Z", className: "opacity-75 dark:opacity-30" },
  { d: "M0 -250 L289 250 L-289 250 Z", className: "opacity-50 dark:opacity-15" },
  { d: "M0 -340 L393 340 L-393 340 Z", className: "opacity-30 dark:opacity-10" },
  { d: "M0 -440 L508 440 L-508 440 Z", className: "opacity-15 dark:opacity-5" },
];

/*
  En el teléfono el contenedor del logotipo es horizontal (~360x160). Se trazan
  triángulos concéntricos proporcionados a esa caja para que se vean completos:
  vértice superior sobre la «A», lados flanqueando el logotipo y base horizontal
  debajo, sin cortes en los bordes.
*/
const mobileTriangles = [
  { d: "M 190 18 L 295 146 L 85 146 Z", className: "opacity-60 dark:opacity-50" },
  { d: "M 190 10 L 320 154 L 60 154 Z", className: "opacity-45 dark:opacity-35" },
  { d: "M 190 2 L 345 162 L 35 162 Z", className: "opacity-30 dark:opacity-22" },
  { d: "M 190 -6 L 370 170 L 10 170 Z", className: "opacity-18 dark:opacity-12" },
];

export function HomeArt() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10">
      <div
        className="absolute inset-0 bg-[radial-gradient(color-mix(in_srgb,var(--foreground)_16%,transparent)_1px,transparent_1.4px)] bg-size-[22px_22px]"
        style={fadeToEdges}
      />
      {/* Versión móvil: vectores concéntricos grandes y prominentes abrazando el logotipo */}
      <svg
        className="absolute inset-0 size-full lg:hidden"
        viewBox="0 0 380 170"
        preserveAspectRatio="xMidYMid meet"
      >
        <g className="fill-none stroke-brand" strokeWidth={1.8}>
          {mobileTriangles.map(({ d, className }) => (
            <path key={d} d={d} className={className} />
          ))}
        </g>
      </svg>

      {/* Versión escritorio: panel vertical completo */}
      <svg
        className="absolute inset-0 size-full hidden lg:block"
        viewBox="0 0 560 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <g
          transform="translate(280 380)"
          className="fill-none stroke-brand"
          strokeWidth={1.4}
        >
          {desktopTriangles.map(({ d, className }) => (
            <path key={d} d={d} className={className} />
          ))}
        </g>
        <path
          d="M-40 640 L600 270 M-40 700 L600 330 M-40 760 L600 390"
          className="fill-none stroke-foreground opacity-10 dark:opacity-5"
        />
      </svg>
    </div>
  );
}
