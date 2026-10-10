## Why

El equipo quiere enseñar cada ejercicio con un vídeo de YouTube, no solo con la imagen o el
GIF del catálogo, y el paciente tiene que poder verlo **dentro de la aplicación**, entre
series, sin que el teléfono lo saque a YouTube. Pedido por Yordy el 2026-10-09. No es alojar
vídeos (eso sigue fuera, `docs/00`): solo se guarda el enlace.

## What Changes

- **Columna `exercises.video_url`** con una restricción que solo admite la forma normalizada
  `https://www.youtube.com/watch?v=<id>[&t=<n>s]`.
- **Formulario «Vídeo de YouTube»** en la ficha `/exercises/[id]`, aparte de la ficha
  completa, como el etiquetado clínico: lo usa el admin en cualquier ejercicio (también los
  importados) y el profesional en sus ejercicios propios. Acepta el enlace del navegador,
  `youtu.be`, Shorts, `embed` y minuto de inicio; vacío lo quita.
- **Reproductor integrado** (`ExerciseVideo`): miniatura del vídeo y, al pulsar, el iframe de
  `youtube-nocookie.com` con reproducción en línea. Nunca un enlace a YouTube.
- **El vídeo sustituye a la imagen** donde haya vídeo: la miniatura del vídeo es la vista
  previa en las tarjetas y filas del catálogo, y el reproductor ocupa el lugar de la imagen
  en la ficha, en la ficha rápida y en «Ver cómo se hace» de la sesión del paciente.
- **CSP**: `frame-src https://www.youtube-nocookie.com` e `img-src https://i.ytimg.com`.

## Capabilities

### New Capabilities

- `exercise-video`: el vídeo de YouTube de un ejercicio, quién lo pone y dónde se ve.

## Impact

- Migración `20261009130000_catalog_add_exercise_video_url.sql` y `lib/db/types.ts`.
- `lib/catalog/youtube.ts` (nuevo), `exercise-schemas.ts`, `exercise-actions.ts`,
  `queries.ts`; `lib/routines/session-queries.ts`.
- `components/catalog/ExerciseVideo.tsx` y `ExerciseVideoForm.tsx` (nuevos), `ExerciseCard`,
  `ExerciseRow`, `ExerciseSummary`; `components/routines/SessionItemForm.tsx`;
  `app/(admin)/exercises/[id]/page.tsx`; `next.config.ts`.
- **Contrato** (`docs/11`): el formulario nuevo va el último de la ficha, así que el orden de
  los existentes no cambia. Suite nueva `test:catalog:video`.
