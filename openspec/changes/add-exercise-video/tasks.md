# Tasks

## 1. Datos

- [x] 1.1 Migración `catalog_add_exercise_video_url` con la restricción de forma normalizada y `lib/db/types.ts` regenerado. Verificación: `npm run db:reset` limpio.
- [x] 1.2 `lib/catalog/youtube.ts`: lectura de enlaces (`watch`, `youtu.be`, Shorts, `embed`, `live`, minuto de inicio), forma normalizada, URL del reproductor y miniatura. Verificación: `test:catalog:video`, primer test.

## 2. Escritura

- [x] 2.1 `exerciseVideoSchema` en `exercise-schemas.ts` y `updateExerciseVideo` en `exercise-actions.ts`. Verificación: `test:catalog:video`.
- [x] 2.2 `ExerciseVideoForm`, último formulario de `/exercises/[id]`, solo para quien puede editar. Verificación: `test:catalog:custom` sigue en verde.

## 3. Reproducción

- [x] 3.1 `ExerciseVideo`: miniatura y, al pulsar, iframe de `youtube-nocookie.com`. CSP con `frame-src` e `img-src` de YouTube. Verificación: reproducción en línea en Chromium a 375 px sin violaciones de CSP.
- [x] 3.2 El vídeo sustituye a la imagen en la ficha, la ficha rápida y la sesión del paciente; la miniatura es la vista previa en tarjetas y filas. Verificación: recorrido en el navegador.
- [ ] 3.3 Revisión en un teléfono real (cabe en la pasada de `docs/15` C.1).
