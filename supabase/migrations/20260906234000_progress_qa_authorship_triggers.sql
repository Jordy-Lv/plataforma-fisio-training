-- =============================================================================
-- QA backend · BACK-004 — se podía falsificar quién tomó un tamizaje o registró
-- una asistencia.
--
-- Las políticas de `screenings` / `attendance` solo comprueban `patient_id`, así
-- que un profesional asignado (o el admin) que insertara por PostgREST directo
-- podía poner en `taken_by` / `registered_by` el UUID de un tercero. Las server
-- actions ya rellenan la autoría con el actor real, pero nada lo imponía en la
-- frontera persistente.
--
-- Se deriva la autoría en un trigger `before insert or update`:
--   - En alta, para cualquier petición con sesión (`auth.uid()` no nulo) la
--     autoría se fija al actor real, se ignore lo que venga en el payload.
--   - El seed y el job de cron corren con `service_role` (`auth.uid()` nulo):
--     ahí se conserva el valor explícito que traiga la fila.
--   - En edición, la autoría es inmutable: se restaura siempre el valor previo.
-- =============================================================================

-- --- tamizajes --------------------------------------------------------------

create or replace function public.screenings_pin_author()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.taken_by := coalesce(auth.uid(), new.taken_by);
  else
    new.taken_by := old.taken_by;
  end if;
  return new;
end;
$$;

comment on function public.screenings_pin_author() is
  'BACK-004: la autoría del tamizaje es la del actor de la petición y no se edita.';

create trigger screenings_pin_author
  before insert or update on public.screenings
  for each row execute function public.screenings_pin_author();

-- --- asistencia ------------------------------------------------------------

create or replace function public.attendance_pin_author()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.registered_by := coalesce(auth.uid(), new.registered_by);
  else
    new.registered_by := old.registered_by;
  end if;
  return new;
end;
$$;

comment on function public.attendance_pin_author() is
  'BACK-004: la autoría de la asistencia es la del actor de la petición y no se edita.';

create trigger attendance_pin_author
  before insert or update on public.attendance
  for each row execute function public.attendance_pin_author();
