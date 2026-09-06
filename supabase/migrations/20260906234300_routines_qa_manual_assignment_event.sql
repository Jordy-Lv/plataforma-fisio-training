-- =============================================================================
-- QA backend · BACK-003 — la asignación manual directa no dejaba rastro.
--
-- `copy_routine_template` tiene `grant execute to authenticated` (decisión D1:
-- el profesional puede asignar una rutina sin pasar por el motor de reglas, es
-- una decisión clínica legítima). El problema no es el permiso: es que ese
-- camino —llamar la RPC directamente, sin `commit_routine_assignment`— crea una
-- rutina activa sin escribir ningún `routine_assignment_event`, así que el
-- equipo pierde la traza de quién asignó qué y cuándo.
--
-- Arreglo: el camino manual directo también deja un evento
-- (`outcome = 'assigned'`, `payload.source = 'manual'`). Cuando la copia la
-- invoca `commit_routine_assignment` (SECURITY DEFINER, se ejecuta con el rol
-- propietario) NO se duplica: esa RPC ya escribe su propio evento con la regla
-- aplicada y las exclusiones. La discriminación es por `current_user`: en la
-- llamada directa por PostgREST es `authenticated`; anidada en la RPC de commit
-- es el rol propietario de la función.
--
-- Estado de partida: el esquema tras aplicar las 9 migraciones anteriores.
-- =============================================================================

-- --- registro del evento con privilegios de propietario ---------------------

-- `routine_assignment_events` tiene revocado el INSERT para `authenticated` (no
-- es una API pública). Esta función SECURITY DEFINER es el único punto por el
-- que el camino manual puede dejar su traza, y se guarda de que solo se use
-- para una rutina que el actor acaba de crear:
--
--   * actor activo y con acceso al paciente (admin o profesional a cargo);
--   * la rutina existe, es de ese paciente y la creó este actor
--     (`assigned_by = auth.uid()`) hace un momento;
--   * todavía no tiene un evento asociado (idempotencia y anti-doble-registro).
create function public.record_manual_routine_assignment(target_routine uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_patient uuid;
  template_id uuid;
begin
  select r.patient_id, r.source_template_id into target_patient, template_id
  from public.routines r
  where r.id = target_routine
    and r.assigned_by = auth.uid()
    and r.created_at > now() - interval '5 minutes';
  if not found then
    return;
  end if;

  if not public.actor_is_active()
    or not (public.is_admin() or public.treats_patient(target_patient)) then
    return;
  end if;

  if exists (
    select 1 from public.routine_assignment_events e where e.routine_id = target_routine
  ) then
    return;
  end if;

  insert into public.routine_assignment_events(patient_id, routine_id, outcome, payload)
  values (
    target_patient,
    target_routine,
    'assigned',
    jsonb_build_object(
      'source', 'manual',
      'template_id', template_id,
      'assigned_by', auth.uid(),
      'message', 'Asignación manual directa: el profesional copió la plantilla sin pasar por el motor de reglas.'
    )
  );
end;
$$;

revoke all on function public.record_manual_routine_assignment(uuid) from public, anon;
grant execute on function public.record_manual_routine_assignment(uuid) to authenticated;

comment on function public.record_manual_routine_assignment(uuid) is
  'BACK-003: deja el `routine_assignment_event` del camino de asignación manual directa. No hace nada si la rutina no la acaba de crear el actor o si ya tiene evento.';

-- --- la copia directa deja su traza ----------------------------------------

-- Reescrita entera. Único cambio respecto de
-- `20260905180000_routines_copy_template.sql`: el bloque BACK-003 antes del
-- `return`.
create or replace function public.copy_routine_template(patient_id uuid, template_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source record;
  source_day record;
  new_routine_id uuid;
  new_day_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active
      and (public.is_admin() or public.treats_patient(copy_routine_template.patient_id))
  ) then
    raise exception 'Solo el administrador o el profesional a cargo puede asignar la rutina.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = copy_routine_template.patient_id and p.role = 'patient' and p.is_active
  ) then
    raise exception 'Selecciona un paciente activo al que tengas acceso.'
      using errcode = '22023';
  end if;

  -- Serializa las asignaciones del mismo paciente, incluso si aún no tiene rutina.
  perform pg_advisory_xact_lock(hashtextextended('routines:' || patient_id::text, 0));

  select t.name, t.kind, (
    select jsonb_agg(jsonb_build_object(
      'day_number', d.day_number, 'title', d.title,
      'items', (
        select jsonb_agg(jsonb_build_object(
          'exercise_id', i.exercise_id, 'position', i.position,
          'sets', i.sets, 'reps', i.reps, 'target_weight', i.target_weight,
          'rest_seconds', i.rest_seconds, 'notes', i.notes
        ) order by i.position)
        from public.template_items i where i.template_day_id = d.id
      )
    ) order by d.day_number)
    from public.template_days d where d.template_id = t.id
  ) as days into source
  from public.routine_templates t
  where t.id = copy_routine_template.template_id and t.is_active;

  if not found then
    raise exception 'Selecciona una plantilla activa disponible.' using errcode = '22023';
  end if;
  if source.days is null then
    raise exception 'La plantilla no tiene días. Completa su contenido antes de asignarla.'
      using errcode = '22023';
  end if;

  update public.routines r set status = 'completed', ends_on = current_date
  where r.patient_id = copy_routine_template.patient_id
    and r.kind = source.kind and r.status = 'active';

  insert into public.routines (patient_id, kind, source_template_id, assigned_by, name, starts_on)
  values (patient_id, source.kind, template_id, auth.uid(), source.name, current_date)
  returning id into new_routine_id;

  for source_day in
    select * from jsonb_to_recordset(source.days)
      as d(day_number smallint, title text, items jsonb)
  loop
    if source_day.items is null or source_day.items = 'null'::jsonb then
      raise exception 'El día % no tiene ejercicios. Completa la plantilla antes de asignarla.', source_day.day_number
        using errcode = '22023';
    end if;

    insert into public.routine_days (routine_id, day_number, title)
    values (new_routine_id, source_day.day_number, source_day.title)
    returning id into new_day_id;

    insert into public.routine_items (
      routine_day_id, exercise_id, position, sets, reps, target_weight, rest_seconds, notes
    )
    select new_day_id, i.exercise_id, i.position, i.sets, i.reps,
      i.target_weight, i.rest_seconds, i.notes
    from jsonb_to_recordset(source_day.items) as i(
      exercise_id uuid, position smallint, sets smallint, reps smallint,
      target_weight numeric(6, 2), rest_seconds smallint, notes text
    );
  end loop;

  -- BACK-003: la copia directa por RPC (camino manual, sin motor de reglas)
  -- deja su traza en el registro de decisiones. Anidada en
  -- `commit_routine_assignment` (SECURITY DEFINER, rol propietario) esta rama
  -- no entra: esa RPC escribe su propio evento con la regla aplicada.
  if current_user = 'authenticated' then
    perform public.record_manual_routine_assignment(new_routine_id);
  end if;

  return new_routine_id;
end;
$$;

revoke all on function public.copy_routine_template(uuid, uuid) from public, anon;
grant execute on function public.copy_routine_template(uuid, uuid) to authenticated;

comment on function public.copy_routine_template(uuid, uuid) is
  'Copia una plantilla completa bajo RLS y cierra la rutina anterior del mismo tipo en una sola transacción. El camino manual directo (invocado por `authenticated`) deja un `routine_assignment_event` de tipo manual; anidado en `commit_routine_assignment` no lo duplica.';
