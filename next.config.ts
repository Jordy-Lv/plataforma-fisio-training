import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/*
  Origen de Supabase (API e imágenes del bucket del catálogo). Se lee al
  arrancar: `NEXT_PUBLIC_SUPABASE_URL` tiene que estar definida tanto en el
  build como en el arranque, y en Railway lo está para los dos.
*/
const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
})();

/*
  Política de contenido. Next inyecta scripts en línea para hidratar y no
  usamos nonces (obligaría a renderizar todo en cada petición), así que
  `script-src` admite 'unsafe-inline'. Lo que sí cierra:
  - nadie puede incrustar la aplicación en un iframe (clickjacking);
  - los formularios solo se envían a la propia aplicación;
  - imágenes y conexiones, solo a la app y a Supabase (más las miniaturas
    de YouTube de los vídeos de ejercicios);
  - el único iframe permitido es el reproductor sin cookies de YouTube.
  En desarrollo, React necesita 'unsafe-eval' para sus herramientas.
*/
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://i.ytimg.com ${supabaseOrigin}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin}`.trim(),
  "frame-src https://www.youtube-nocookie.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Los navegadores solo la respetan por HTTPS: en local no tiene efecto.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: isDev ? ".next-dev" : ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
