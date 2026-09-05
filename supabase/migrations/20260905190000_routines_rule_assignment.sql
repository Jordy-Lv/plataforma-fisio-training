alter type public.routine_status add value if not exists 'pending_review';
alter type public.alert_type add value if not exists 'routine_assignment';

create function public.routine_assignment_context(target_patient uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_active)
    or not (public.is_admin() or public.treats_patient(target_patient)) then
    raise exception 'Solo el administrador o el profesional a cargo puede asignar rutinas.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'profile', jsonb_build_object('goal', d.goal, 'level', d.level,
      'environment', d.environment, 'equipment', d.equipment,
      'age', extract(year from age(current_date, d.birth_date)),
      'conditions', coalesce((select jsonb_agg(distinct c.body_part order by c.body_part)
        from public.patient_conditions c where c.patient_id = p.id and c.is_active), '[]'::jsonb)),
    'onboarding_step', d.onboarding_step,
    'rules', coalesce((select jsonb_agg(to_jsonb(r) order by r.priority, r.created_at, r.id)
      from public.assignment_rules r), '[]'::jsonb),
    'templates', coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'name', t.name, 'is_active', t.is_active, 'kind', t.kind,
      'days', coalesce((select jsonb_agg(jsonb_build_object(
        'day_number', td.day_number, 'title', td.title,
        'items', coalesce((select jsonb_agg(jsonb_build_object(
          'position', ti.position, 'sets', ti.sets, 'reps', ti.reps,
          'target_weight', ti.target_weight, 'rest_seconds', ti.rest_seconds, 'notes', ti.notes,
          'exercise', jsonb_build_object('id', e.id, 'name', e.name, 'contraindications', e.contraindications)
        ) order by ti.position) from public.template_items ti
        join public.exercises e on e.id = ti.exercise_id where ti.template_day_id = td.id), '[]'::jsonb)
      ) order by td.day_number) from public.template_days td where td.template_id = t.id), '[]'::jsonb)
    ) order by t.id) from public.routine_templates t
      where exists (select 1 from public.assignment_rules r where r.template_id = t.id)), '[]'::jsonb)
  ) into result from public.profiles p
  join public.patient_details d on d.profile_id = p.id
  where p.id = target_patient and p.role = 'patient' and p.is_active;
  if result is null then
    raise exception 'Selecciona un paciente activo con su perfil registrado.' using errcode = '22023';
  end if;
  return result;
end;
$$;

revoke all on function public.routine_assignment_context(uuid) from public, anon;
grant execute on function public.routine_assignment_context(uuid) to authenticated;

-- El disparador resuelve destinatarios fuera de la visibilidad parcial de profiles.
-- Solo se ejecuta al insertar una decisión ya autorizada por RLS.
create table public.routine_assignment_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  routine_id uuid references public.routines(id) on delete cascade,
  outcome text not null check (outcome in ('assigned', 'pending_review', 'no_match')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.routine_assignment_events enable row level security;
create policy "equipo consulta decisiones de sus pacientes"
  on public.routine_assignment_events for select to authenticated
  using (public.is_admin() or public.treats_patient(patient_id));
-- La escritura solo pasa por la función transaccional; el evento no es una API pública.
revoke insert, update, delete on public.routine_assignment_events from authenticated, anon;

create function public.notify_routine_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.alerts(type, patient_id, recipient_id, severity, payload)
  select 'routine_assignment', new.patient_id, p.id,
    case when new.outcome = 'assigned' then 'info'::public.alert_severity else 'warning'::public.alert_severity end,
    new.payload || jsonb_build_object('event_id', new.id, 'routine_id', new.routine_id, 'outcome', new.outcome)
  from public.profiles p where p.is_active and (p.role = 'admin' or
    (p.role = 'professional' and exists (select 1 from public.care_assignments ca
      where ca.patient_id = new.patient_id and ca.professional_id = p.id and ca.ended_at is null)));
  return new;
end;
$$;
revoke all on function public.notify_routine_assignment() from public, anon, authenticated;
create trigger routine_assignment_notify after insert on public.routine_assignment_events
  for each row execute function public.notify_routine_assignment();

create function public.commit_routine_assignment(
  target_patient uuid, expected_context jsonb, selected_rule uuid default null,
  excluded_exercises uuid[] default '{}', assignment_notes text default ''
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_context jsonb;
  source_template uuid;
  source_kind public.professional_specialty;
  new_id uuid;
  previous_id uuid;
  previous_end date;
  actual_exclusions uuid[];
  short_days jsonb;
  outcome text;
  event_payload jsonb;
begin
  -- La función usa privilegios de propietario únicamente para la escritura del
  -- evento y su aviso. Se autoriza al actor y al paciente antes de leer o escribir.
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active
    and p.role in ('admin', 'professional'))
    or not (public.is_admin() or public.treats_patient(target_patient)) then
    raise exception 'Solo el administrador o el profesional a cargo puede asignar rutinas.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('routines:' || target_patient::text, 0));
  -- Mantiene estables los insumos entre la comparación y la copia. Los bloqueos
  -- duran solo esta transacción y son compatibles con las consultas del equipo.
  lock table public.patient_details, public.patient_conditions, public.assignment_rules,
    public.routine_templates, public.template_days, public.template_items, public.exercises,
    public.care_assignments in share mode;
  perform 1 from public.profiles where id in (auth.uid(), target_patient) for share;
  current_context := public.routine_assignment_context(target_patient);
  if current_context is distinct from expected_context then
    -- La clase 55 la traduce PostgREST a un 500 y el cuerpo llega vacío al
    -- navegador: el equipo vería «Something went wrong» en vez de qué hacer.
    raise exception 'El perfil o las reglas cambiaron. Vuelve a evaluar la asignación.' using errcode = '22023';
  end if;
  if (current_context->>'onboarding_step')::int <> 3 then
    raise exception 'El paciente debe completar su perfil antes de asignarle una rutina.' using errcode = '22023';
  end if;
  if length(coalesce(assignment_notes, '')) > 20000 then
    raise exception 'Las notas de asignación son demasiado extensas.' using errcode = '22023';
  end if;
  if selected_rule is null then
    outcome := 'no_match';
    event_payload := jsonb_build_object('message', 'No hay una regla compatible. Revisa el perfil y prepara una rutina para el paciente.');
  else
    select r.template_id, t.kind into source_template, source_kind
    from public.assignment_rules r join public.routine_templates t on t.id = r.template_id
    where r.id = selected_rule and r.is_active and t.is_active;
    if not found then
      raise exception 'La regla debe apuntar a una plantilla activa.' using errcode = '22023';
    end if;
    select coalesce(array_agg(distinct e.id order by e.id), '{}'::uuid[]) into actual_exclusions
    from public.template_days d join public.template_items i on i.template_day_id = d.id
    join public.exercises e on e.id = i.exercise_id where d.template_id = source_template
    and exists (select 1 from public.patient_conditions c where c.patient_id = target_patient
      and c.is_active and c.body_part = any(e.contraindications));
    if actual_exclusions is distinct from (select coalesce(array_agg(distinct v order by v), '{}'::uuid[])
      from unnest(excluded_exercises) v) then
      raise exception 'Las exclusiones no coinciden con las condiciones activas. Vuelve a evaluar.' using errcode = '22023';
    end if;
    select id, ends_on into previous_id, previous_end from public.routines
      where patient_id = target_patient and kind = source_kind and status = 'active';
    new_id := public.copy_routine_template(target_patient, source_template);
    delete from public.routine_items i using public.routine_days d
      where i.routine_day_id = d.id and d.routine_id = new_id and i.exercise_id = any(actual_exclusions);
    select coalesce(jsonb_agg(day_number order by day_number), '[]'::jsonb) into short_days
      from (select d.day_number from public.routine_days d
        left join public.routine_items i on i.routine_day_id = d.id
        where d.routine_id = new_id group by d.id having count(i.id) < 3) short;
    outcome := case when jsonb_array_length(short_days) > 0 then 'pending_review' else 'assigned' end;
    update public.routines set assigned_by = null, notes = assignment_notes,
      status = case when outcome = 'assigned' then 'active'::public.routine_status
        else 'pending_review'::public.routine_status end where id = new_id;
    if outcome = 'pending_review' and previous_id is not null then
      update public.routines set status = 'active', ends_on = previous_end where id = previous_id;
    end if;
    event_payload := jsonb_build_object('rule_id', selected_rule, 'template_id', source_template,
      'excluded_exercises', actual_exclusions, 'short_days', short_days, 'notes', assignment_notes);
  end if;
  insert into public.routine_assignment_events(patient_id, routine_id, outcome, payload)
    values (target_patient, new_id, outcome, event_payload);
  return jsonb_build_object('routine_id', new_id, 'outcome', outcome);
end;
$$;
revoke all on function public.commit_routine_assignment(uuid, jsonb, uuid, uuid[], text) from public, anon;
grant execute on function public.commit_routine_assignment(uuid, jsonb, uuid, uuid[], text) to authenticated;

-- Una propuesta incompleta queda reservada al equipo, incluso por API directa.
create policy "paciente no lee propuestas pendientes"
  on public.routines as restrictive for select to authenticated
  using (patient_id <> auth.uid() or status::text <> 'pending_review');
create or replace function public.can_read_routine(target_routine uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.routines r where r.id = target_routine and (
    public.is_admin() or public.treats_patient(r.patient_id)
    or (r.patient_id = auth.uid() and r.status::text <> 'pending_review')))
$$;
