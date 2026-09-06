-- =============================================================================
-- Slice 2 · Catálogo — almacenamiento del contenido visual de los ejercicios.
--
-- Las imágenes de free-exercise-db se copian a un bucket propio: durante la
-- demostración no puede haber una dependencia externa que falle, y así el
-- material genérico se reemplaza por el del negocio sin cambiar de mecanismo.
-- Ver docs/adr/0005-biblioteca-de-ejercicios.md.
-- =============================================================================

-- El bucket es público de lectura: una imagen de ejercicio no es un dato de
-- salud y el paciente la abre desde el teléfono, entre series, sin negociar
-- una URL firmada por cada movimiento de su rutina.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-media',
  'exercise-media',
  true,
  5242880, -- 5 MiB: una imagen o un GIF corto, nunca un video.
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --- políticas de storage.objects --------------------------------------------
-- Mismo criterio que public.exercises: todo el mundo lee el catálogo, solo el
-- equipo escribe en él. El paciente no sube nada.

create policy "lectura pública del contenido de ejercicios"
  on storage.objects for select to public
  using (bucket_id = 'exercise-media');

create policy "admin y profesional suben contenido de ejercicios"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exercise-media'
    and (public.is_admin() or public.current_role() = 'professional')
  );

create policy "admin y profesional reemplazan contenido de ejercicios"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'exercise-media'
    and (public.is_admin() or public.current_role() = 'professional')
  )
  with check (
    bucket_id = 'exercise-media'
    and (public.is_admin() or public.current_role() = 'professional')
  );

-- El borrado sí es exclusivo del admin: una imagen borrada deja sin contenido
-- visual a las rutinas ya asignadas que apuntan a ella.
create policy "admin borra contenido de ejercicios"
  on storage.objects for delete to authenticated
  using (bucket_id = 'exercise-media' and public.is_admin());
