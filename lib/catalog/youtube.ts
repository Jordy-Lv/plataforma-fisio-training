/**
 * Vídeos de YouTube en la ficha del ejercicio.
 *
 * El equipo pega el enlace tal como lo copia (de la barra del navegador, del
 * botón «Compartir» o de un Short) y se guarda siempre en una forma única,
 * `https://www.youtube.com/watch?v=<id>[&t=<segundos>s]`, que es la que admite
 * la restricción de `exercises.video_url`. La aplicación nunca redirige a
 * YouTube: el vídeo se reproduce dentro, desde `youtube-nocookie.com`.
 */

export type YouTubeVideo = { id: string; start: number };

const videoId = /^[A-Za-z0-9_-]{11}$/;

const hosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
]);

/** `90`, `90s`, `1m30s` o `1h2m3s` → segundos. Cualquier otra cosa, 0. */
function parseStart(value: string | null): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match || !match[0]) return 0;
  const [, h = "0", m = "0", s = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/** Devuelve el vídeo de un enlace de YouTube, o `null` si no lo es. */
export function parseYouTubeUrl(input: string): YouTubeVideo | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (!hosts.has(host)) return null;

  let id: string | undefined;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1];
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v") ?? undefined;
  } else {
    const [, kind, value] = url.pathname.split("/");
    if (
      kind === "shorts" ||
      kind === "embed" ||
      kind === "live" ||
      kind === "v"
    )
      id = value;
  }
  if (!id || !videoId.test(id)) return null;

  const start = parseStart(
    url.searchParams.get("t") ?? url.searchParams.get("start"),
  );
  return { id, start };
}

/** La forma única en que se guarda: la misma que exige la base de datos. */
export function canonicalYouTubeUrl({ id, start }: YouTubeVideo): string {
  return `https://www.youtube.com/watch?v=${id}${start > 0 ? `&t=${start}s` : ""}`;
}

/** Reproductor sin cookies hasta que la persona pulsa «reproducir». */
export function youTubeEmbedUrl({ id, start }: YouTubeVideo): string {
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
  });
  if (start > 0) params.set("start", String(start));
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

/**
 * La vista previa de un ejercicio: si tiene vídeo, su miniatura —la imagen
 * subida deja de mostrarse—; si no, la imagen o el GIF del catálogo.
 */
export function exercisePreviewUrl(exercise: {
  media_url: string | null;
  video_url?: string | null;
}): string | null {
  const video = exercise.video_url ? parseYouTubeUrl(exercise.video_url) : null;
  return video ? youTubeThumbnailUrl(video) : exercise.media_url;
}

/** Miniatura pública del vídeo; se pinta antes de cargar el reproductor. */
export function youTubeThumbnailUrl({ id }: YouTubeVideo): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
