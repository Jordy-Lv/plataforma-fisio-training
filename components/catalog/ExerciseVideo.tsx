"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "cn";
import {
  parseYouTubeUrl,
  youTubeEmbedUrl,
  youTubeThumbnailUrl,
} from "@/lib/catalog/youtube";

/**
 * Vídeo de YouTube reproducido dentro de la aplicación.
 *
 * Hasta que la persona pulsa, solo se pinta la miniatura: el reproductor de
 * YouTube pesa cerca de un megabyte y el paciente lo abre con datos móviles,
 * entre series. Al pulsar se monta el iframe de `youtube-nocookie.com`, que no
 * deja cookies antes de reproducir, y arranca solo; nunca se sale a YouTube.
 */
export function ExerciseVideo({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const video = parseYouTubeUrl(url);
  if (!video) return null;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-xl bg-muted",
        className,
      )}
    >
      {playing ? (
        <iframe
          src={youTubeEmbedUrl(video)}
          title={`Vídeo: ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex size-full items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Reproducir el vídeo de ${title}`}
        >
          {/* Miniatura pública de YouTube; `next/image` exigiría declarar su dominio. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youTubeThumbnailUrl(video)}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
          <span className="relative flex size-16 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition-transform group-hover:scale-105">
            <Play aria-hidden className="ml-1 size-7 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}
