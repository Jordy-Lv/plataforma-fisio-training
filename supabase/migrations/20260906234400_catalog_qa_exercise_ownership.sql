-- =============================================================================
-- QA backend · BACK-006 — el profesional no podía editar el ejercicio propio
-- que creó.
--
-- OpenSpec exige que el equipo pueda «crear y editar ejercicios propios»
-- (`exercise-library/spec.md`), pero la política de UPDATE de `public.exercises`
-- solo dejaba pasar al admin y el modelo no guardaba quién creó cada ejercicio.
-- Una prueba heredada fijaba ese comportamiento «solo admin», no el contrato.
--
-- Decisión D4: se resuelve a favor de OpenSpec.
--   * `exercises.created_by` guarda el autor del ejercicio propio.
--   * Un trigger deriva la autoría del actor de la petición en el alta y la
--     deja inmutable en edición (mismo patrón que BACK-004).
--   * La política de UPDATE deja editar al admin (todo el catálogo) y al
--     profesional activo que sea autor de un ejercicio propio (`is_custom`).
--   * Los ejercicios importados por la siembra y los `is_custom` anteriores a
--     esta migración quedan con `created_by = null`: solo el admin los edita,
--     igual que hasta ahora. No hay rastro de autoría que permita rellenarlos.
--
-- Estado de partida: el esquema tras aplicar las 10 migraciones anteriores.
-- =============================================================================

alter table public.exercises
  add column created_by uuid references public.profiles(id) on delete set null;

comment on column public.exercises.created_by is
  'Autor del ejercicio propio. Null en los importados por la siembra y en los custom anteriores a BACK-006. El profesional solo edita los suyos; el admin, todos.';

-- --- autoría derivada del actor, inmutable en edición ---------------------

-- Mismo patrón que `screenings_pin_author` / `attendance_pin_author` (BACK-004):
--   * en alta, cualquier petición con sesión (`auth.uid()` no nulo) queda como
--     autora; el seed corre con `service_role` (`auth.uid()` nulo) y el
--     ejercicio queda sin autor (importado);
--   * en edición, la autoría no se reasigna nunca.
create or replace function public.exercises_pin_author()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

comment on function public.exercises_pin_author() is
  'BACK-006: el autor del ejercicio es el del actor de la petición y no se edita.';

create trigger exercises_pin_author
  before insert or update on public.exercises
  for each row execute function public.exercises_pin_author();

-- --- la edición deja de ser exclusiva del admin -------------------------

drop policy "admin edita el catálogo" on public.exercises;

create policy "el catálogo lo edita el admin o el autor del ejercicio propio"
  on public.exercises for update to authenticated
  using (
    public.is_admin()
    or (is_custom and created_by = auth.uid() and public.actor_is_active())
  )
  with check (
    public.is_admin()
    or (is_custom and created_by = auth.uid() and public.actor_is_active())
  );
