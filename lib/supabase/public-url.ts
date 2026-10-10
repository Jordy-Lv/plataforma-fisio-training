/**
 * URL absoluta para un `NextResponse.redirect`.
 *
 * Detrás del proxy de Railway, `request.url` lleva el host **interno** del
 * servidor (`https://localhost:8080/…`), no el público: un redirect construido
 * con él saca al usuario de la aplicación. La base es la dirección pública
 * (`NEXT_PUBLIC_SITE_URL`), que no depende de ninguna cabecera de la petición;
 * sin ella —en local, o en las suites— vale la de la propia petición.
 */
export function publicUrl(path: string, request: Request): URL {
  return new URL(path, process.env.NEXT_PUBLIC_SITE_URL || request.url);
}
