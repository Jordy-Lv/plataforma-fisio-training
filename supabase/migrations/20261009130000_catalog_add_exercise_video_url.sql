-- =============================================================================
-- Vídeo de YouTube en la ficha del ejercicio (change add-exercise-video).
--
-- El equipo pega un enlace de YouTube y la aplicación lo reproduce dentro de la
-- propia ficha y de la sesión del paciente, sin mandarlo a YouTube. No se aloja
-- ningún vídeo: solo se guarda el enlace.
--
-- La server action normaliza cualquier forma del enlace (youtu.be, Shorts,
-- embed, con o sin minuto de inicio) a una sola, y la restricción impide que
-- llegue otra cosa por otra vía: así el reproductor nunca recibe una URL ajena.
--
-- Sin políticas nuevas: la columna la escribe quien ya puede editar el
-- ejercicio (el admin, todo el catálogo; el profesional, sus ejercicios
-- propios) y la lee quien ya lee el catálogo.
-- =============================================================================

alter table public.exercises
  add column video_url text,
  add constraint exercises_video_url_youtube check (
    video_url is null
    or video_url ~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}(&t=[0-9]+s)?$'
  );

comment on column public.exercises.video_url is
  'Vídeo de YouTube del ejercicio, normalizado a https://www.youtube.com/watch?v=<id>[&t=<n>s]. Se reproduce embebido (youtube-nocookie.com), nunca redirigiendo.';
