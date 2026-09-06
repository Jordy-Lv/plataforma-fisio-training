-- =============================================================================
-- QA backend · BACK-007 — cualquier profesional podía sobrescribir objetos de
-- otro y escribir fuera del prefijo previsto.
--
-- Las políticas de `storage.objects` para `exercise-media` aceptaban cualquier
-- nombre de objeto para cualquier profesional: un profesional B podía hacer
-- upsert sobre la ruta creada por el profesional A y cambiar los bytes, o
-- escribir bajo `imported/...` en vez de `custom/...`. Storage no registra
-- propiedad ni valida la carpeta por sí mismo.
--
-- Nuevo reparto del bucket:
--   - Lectura: pública (sin cambios; una imagen de ejercicio no es dato de salud).
--   - Admin: gestiona todo el bucket, cualquier prefijo (incluye el material
--     genérico y lo `imported/` de la importación).
--   - Profesional: solo objetos propios (`owner = auth.uid()`) y solo dentro de
--     `custom/`, que es el único prefijo al que sube la aplicación. Alcanza al
--     insert, al replace y al borrado de su propio archivo (p. ej. limpiar una
--     subida que quedó huérfana). Un profesional inactivo no escribe: lo corta
--     `current_role()` (BACK-001).
-- =============================================================================

drop policy "admin y profesional suben contenido de ejercicios" on storage.objects;
drop policy "admin y profesional reemplazan contenido de ejercicios" on storage.objects;
drop policy "admin borra contenido de ejercicios" on storage.objects;

-- El admin, sin restricción de prefijo dentro del bucket.
create policy "el admin gestiona el contenido de ejercicios"
  on storage.objects for all to authenticated
  using (bucket_id = 'exercise-media' and public.is_admin())
  with check (bucket_id = 'exercise-media' and public.is_admin());

-- El profesional: su propio archivo, dentro de `custom/`.
create policy "el profesional sube su contenido de ejercicios"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exercise-media'
    and public.current_role() = 'professional'
    and (storage.foldername(name))[1] = 'custom'
    and owner = auth.uid()
  );

create policy "el profesional reemplaza su contenido de ejercicios"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'exercise-media'
    and public.current_role() = 'professional'
    and (storage.foldername(name))[1] = 'custom'
    and owner = auth.uid()
  )
  with check (
    bucket_id = 'exercise-media'
    and public.current_role() = 'professional'
    and (storage.foldername(name))[1] = 'custom'
    and owner = auth.uid()
  );

create policy "el profesional borra su contenido de ejercicios"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'exercise-media'
    and public.current_role() = 'professional'
    and (storage.foldername(name))[1] = 'custom'
    and owner = auth.uid()
  );
