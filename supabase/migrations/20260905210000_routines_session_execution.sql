-- Cada marca conserva la prescripción y el ejercicio que existían al registrarla.
alter table public.session_logs
  add column prescribed_sets smallint,
  add column prescribed_reps smallint,
  add column prescribed_weight numeric(6,2),
  add column exercise_id uuid references public.exercises(id) on delete restrict;
update public.session_logs l set prescribed_sets = i.sets, prescribed_reps = i.reps,
  prescribed_weight = i.target_weight, exercise_id = i.exercise_id
from public.routine_items i where i.id = l.routine_item_id;
alter table public.session_logs add constraint session_log_exercise_required check (exercise_id is not null);
-- Quitar un ejercicio con historia no debe borrar lo ejecutado por el paciente.
alter table public.session_logs drop constraint session_logs_routine_item_id_fkey;
alter table public.session_logs add constraint session_logs_routine_item_id_fkey
  foreign key (routine_item_id) references public.routine_items(id) on delete no action deferrable initially immediate;
alter table public.session_logs add constraint session_log_item_unique unique(session_id, routine_item_id);
alter table public.session_logs add constraint session_log_pain_zone check (
  pain_location is null or pain_location in ('neck','shoulder','elbow','wrist','upper_back','lower_back','hip','knee','ankle','foot','core','other'));
alter table public.session_logs add constraint session_log_values check (
  (actual_sets is null or actual_sets between 0 and 100) and
  (actual_reps is null or actual_reps between 0 and 1000) and
  (actual_weight is null or actual_weight between 0 and 9999.99));
-- Los registros históricos anteriores conservan sus datos; las nuevas escrituras se validan completas.
alter table public.session_logs add constraint session_log_reason check (
  (status <> 'skipped' or (pain_level is not null and pain_location is not null and length(btrim(notes)) > 0 and notes is not null)) and
  (coalesce(pain_level, 0) = 0 or pain_location is not null) and
  (replaced_by_exercise_id is null or status = 'modified')) not valid;
create unique index sessions_open_day_unique on public.sessions(patient_id, routine_day_id, performed_on) where status = 'in_progress';

create function public.guard_session_execution() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'patient' and is_active) or new.patient_id <> auth.uid() then
    raise exception 'Solo el paciente activo puede registrar su sesión.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if (new.id, new.patient_id, new.routine_id, new.routine_day_id, new.performed_on, new.created_at)
      is distinct from (old.id, old.patient_id, old.routine_id, old.routine_day_id, old.performed_on, old.created_at) then
      raise exception 'No puedes cambiar el origen de una sesión.' using errcode = '22023';
    end if;
    if old.status <> 'in_progress' then
      raise exception 'Esta sesión ya está cerrada.' using errcode = '22023';
    end if;
  else
    if new.status <> 'in_progress' then
      raise exception 'Inicia la sesión antes de cerrarla.' using errcode = '22023';
    end if;
    new.performed_on := (now() at time zone 'America/Bogota')::date;
    new.created_at := now();
  end if;
  if not exists (select 1 from public.routine_days d join public.routines r on r.id = d.routine_id
    where d.id = new.routine_day_id and r.id = new.routine_id and r.patient_id = new.patient_id
      and (tg_op = 'UPDATE' or r.status = 'active')) then
    raise exception 'El día debe pertenecer a tu rutina activa.' using errcode = '42501';
  end if;
  if new.status = 'completed' and exists (
    select 1 from public.routine_items i where i.routine_day_id = new.routine_day_id
    and not exists(select 1 from public.session_logs l where l.session_id = new.id and l.routine_item_id = i.id)) then
    raise exception 'Marca cada ejercicio como hecho, saltado o modificado antes de cerrar.' using errcode = '22023';
  end if;
  new.completed_at := case when new.status = 'completed' then now() else null end;
  return new;
end;
$$;
create trigger session_execution_guard before insert or update on public.sessions
for each row execute function public.guard_session_execution();

create function public.guard_session_log() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare target public.sessions; item public.routine_items;
begin
  select * into target from public.sessions where id = new.session_id for update;
  if target.id is null or target.patient_id <> new.patient_id then
    raise exception 'El registro no pertenece a esta sesión.' using errcode = '42501';
  end if;
  if auth.uid() is not null and (not exists (select 1 from public.profiles where id = auth.uid() and role = 'patient' and is_active) or target.patient_id <> auth.uid()) then
    raise exception 'Solo puedes registrar tu propia ejecución.' using errcode = '42501';
  end if;
  if auth.uid() is not null and target.status <> 'in_progress' then
    raise exception 'Esta sesión ya está cerrada.' using errcode = '22023';
  end if;
  select * into item from public.routine_items where id = new.routine_item_id;
  if item.id is null or item.routine_day_id <> target.routine_day_id then
    raise exception 'El ejercicio debe pertenecer al día de esta sesión.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if (new.id, new.patient_id, new.session_id, new.routine_item_id) is distinct from
       (old.id, old.patient_id, old.session_id, old.routine_item_id) then
      raise exception 'No puedes mover un registro a otra sesión o ejercicio.' using errcode = '22023';
    end if;
    new.exercise_id := old.exercise_id;
    new.prescribed_sets := old.prescribed_sets;
    new.prescribed_reps := old.prescribed_reps;
    new.prescribed_weight := old.prescribed_weight;
    new.created_at := old.created_at;
  else
    new.exercise_id := item.exercise_id;
    new.prescribed_sets := item.sets;
    new.prescribed_reps := item.reps;
    new.prescribed_weight := item.target_weight;
    new.created_at := now();
  end if;
  if new.replaced_by_exercise_id is not null and not exists (
    select 1 from public.exercises where id = new.replaced_by_exercise_id) then
    raise exception 'Selecciona una sustitución del catálogo.' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger session_log_guard before insert or update on public.session_logs
for each row execute function public.guard_session_log();

create function public.start_routine_session(target_day uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare day public.routine_days; result uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'patient' and is_active) then
    raise exception 'Solo el paciente activo puede iniciar una sesión.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_day::text || coalesce(auth.uid()::text, ''), 31));
  select * into day from public.routine_days where id = target_day;
  if day.id is null then raise exception 'No tienes acceso a este día.' using errcode = '42501'; end if;
  select id into result from public.sessions where routine_day_id = target_day and patient_id = auth.uid()
    and performed_on = (now() at time zone 'America/Bogota')::date and status = 'in_progress';
  if result is null then
    insert into public.sessions(routine_id, routine_day_id, patient_id)
    values(day.routine_id, day.id, auth.uid()) returning id into result;
  end if;
  return result;
end;
$$;
revoke all on function public.start_routine_session(uuid) from public, anon;
grant execute on function public.start_routine_session(uuid) to authenticated;

-- Solo los procesos autorizados generan alertas. El destinatario únicamente cambia su lectura.
drop policy "generación de alertas" on public.alerts;
drop policy "lectura de las alertas dirigidas a uno mismo" on public.alerts;
create policy "lectura de alertas con vínculo vigente" on public.alerts for select to authenticated
using (public.is_admin() or (public.current_role() = 'professional' and recipient_id = auth.uid() and public.treats_patient(patient_id)));
drop policy "marcar como leída la alerta propia" on public.alerts;
create policy "destinatario marca su propia lectura" on public.alerts for update to authenticated
using (recipient_id = auth.uid() and (public.is_admin() or (public.current_role() = 'professional' and public.treats_patient(patient_id))))
with check (recipient_id = auth.uid() and (public.is_admin() or (public.current_role() = 'professional' and public.treats_patient(patient_id))));
revoke update on public.alerts from authenticated;
grant update(read_at) on public.alerts to authenticated;
alter table public.alert_settings add constraint clinical_threshold_values check (
  key not in ('pain_level_threshold','pain_occurrences','pain_window_days','skipped_occurrences') or
  (value = trunc(value) and value >= 1 and (key <> 'pain_level_threshold' or value <= 10)));

create function public.evaluate_session_alerts() returns trigger
language plpgsql security definer set search_path = '' as $$
declare threshold int; occurrences int; window_days int; skipped_count int; finding record;
begin
  if new.status <> 'completed' or old.status <> 'in_progress' then return new; end if;
  -- Serializa cierres distintos del mismo paciente para evaluar también el cierre anterior.
  perform pg_advisory_xact_lock(hashtextextended(new.patient_id::text, 30));
  select value::int into strict threshold from public.alert_settings where key = 'pain_level_threshold';
  select value::int into strict occurrences from public.alert_settings where key = 'pain_occurrences';
  select value::int into strict window_days from public.alert_settings where key = 'pain_window_days';
  select value::int into strict skipped_count from public.alert_settings where key = 'skipped_occurrences';
  for finding in
    with records as (
      select l.*, s.performed_on from public.session_logs l join public.sessions s on s.id = l.session_id
      where s.patient_id = new.patient_id and s.status = 'completed'
        and s.performed_on between new.performed_on - (window_days - 1) and new.performed_on
        and l.pain_level >= threshold
    ), dimensions as (
      select r.*, 'exercise' as dimension, coalesce(r.replaced_by_exercise_id, r.exercise_id)::text as value from records r
      union all
      select r.*, 'zone', r.pain_location from records r where r.pain_location is not null
    )
    select dimension, value, jsonb_agg(jsonb_build_object('session_id', session_id, 'performed_on', performed_on,
      'exercise_id', coalesce(replaced_by_exercise_id, exercise_id), 'pain_level', pain_level, 'pain_location', pain_location, 'notes', notes)
      order by performed_on, created_at) as evidence
    from dimensions group by dimension, value
    having count(distinct session_id) >= occurrences and bool_or(session_id = new.id)
  loop
    insert into public.alerts(type, patient_id, recipient_id, severity, payload)
    select 'pain', new.patient_id, p.id, 'critical', jsonb_build_object(
      'session_id', new.id, 'dimension', finding.dimension, 'value', finding.value,
      'threshold', threshold, 'occurrences', occurrences, 'window_days', window_days, 'evidence', finding.evidence)
    from public.profiles p where p.is_active and (p.role = 'admin' or
      (p.role = 'professional' and exists(select 1 from public.care_assignments ca where ca.patient_id = new.patient_id
        and ca.professional_id = p.id and ca.ended_at is null)));
  end loop;
  for finding in
    with current_exercises as (
      select distinct exercise_id from public.session_logs where session_id = new.id and status = 'skipped'
    ), per_session as (
      select l.exercise_id, s.id, s.performed_on, s.completed_at, bool_and(l.status = 'skipped') as is_skipped,
        jsonb_agg(jsonb_build_object('session_id', s.id, 'performed_on', s.performed_on, 'notes', l.notes,
          'pain_level', l.pain_level, 'pain_location', l.pain_location)) as evidence
      from public.session_logs l join public.sessions s on s.id = l.session_id
      join current_exercises c on c.exercise_id = l.exercise_id
      where s.patient_id = new.patient_id and s.status = 'completed'
      group by l.exercise_id, s.id
    ), ranked as (
      select *, row_number() over(partition by exercise_id order by performed_on desc, completed_at desc, id) as position from per_session
    )
    select exercise_id, jsonb_agg(evidence order by position) as evidence from ranked where position <= skipped_count
    group by exercise_id having count(*) = skipped_count and bool_and(is_skipped) and bool_or(id = new.id)
  loop
    insert into public.alerts(type, patient_id, recipient_id, severity, payload)
    select 'skipped', new.patient_id, p.id, 'warning', jsonb_build_object('session_id', new.id,
      'exercise_id', finding.exercise_id, 'occurrences', skipped_count, 'evidence', finding.evidence)
    from public.profiles p where p.is_active and (p.role = 'admin' or
      (p.role = 'professional' and exists(select 1 from public.care_assignments ca where ca.patient_id = new.patient_id
        and ca.professional_id = p.id and ca.ended_at is null)));
  end loop;
  return new;
end;
$$;
revoke all on function public.evaluate_session_alerts() from public, anon, authenticated;
create trigger session_alerts_on_completion after update of status on public.sessions
for each row execute function public.evaluate_session_alerts();
