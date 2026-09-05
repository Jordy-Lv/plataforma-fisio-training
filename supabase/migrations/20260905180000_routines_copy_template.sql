create unique index routines_one_active_per_kind
  on public.routines (patient_id, kind) where status = 'active';

create function public.copy_routine_template(patient_id uuid, template_id uuid)
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

  return new_routine_id;
end;
$$;

revoke all on function public.copy_routine_template(uuid, uuid) from public, anon;
grant execute on function public.copy_routine_template(uuid, uuid) to authenticated;

comment on function public.copy_routine_template(uuid, uuid) is
  'Copia una plantilla completa bajo RLS y cierra la rutina anterior del mismo tipo en una sola transacción. El filtro de contraindicaciones se integra en la tarea 1.3.';
