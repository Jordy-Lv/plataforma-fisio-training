create table public.person_registrations (
  token uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  phone text,
  role public.user_role not null check (role in ('professional', 'patient')),
  specialty public.professional_specialty,
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default now() + interval '5 minutes'
);
alter table public.person_registrations enable row level security;
revoke all on public.person_registrations from anon, authenticated;

create function public.prepare_person_registration(
  person_email text, person_name text, person_phone text,
  person_role public.user_role, person_specialty public.professional_specialty default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare actor public.profiles; result uuid;
begin
  select * into actor from public.profiles where id = auth.uid() and is_active for update;
  if actor.id is null or actor.role not in ('admin', 'professional')
     or person_role is null or person_role not in ('professional', 'patient')
     or (person_role = 'professional' and actor.role <> 'admin') then
    raise exception 'No tienes permiso para dar de alta a esta persona.' using errcode = '42501';
  end if;
  if person_email is null or person_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(person_email) > 254 or person_name is null
     or length(trim(person_name)) not between 2 and 120 or length(person_phone) > 30
     or (person_role = 'professional' and person_specialty is null)
     or (person_role = 'patient' and person_specialty is not null) then
    raise exception 'Revisa el nombre, correo, teléfono y especialidad.' using errcode = '22023';
  end if;
  if exists(select 1 from auth.users where lower(email) = lower(trim(person_email))) then
    raise exception 'No se puede registrar ese correo. Revisa si ya tiene una cuenta.' using errcode = '22023';
  end if;
  delete from public.person_registrations where expires_at < now();
  insert into public.person_registrations(email, full_name, phone, role, specialty, created_by)
    values (lower(trim(person_email)), trim(person_name), nullif(trim(person_phone), ''), person_role, person_specialty, actor.id)
    returning token into result;
  return result;
end $$;

create function public.cancel_person_registration(registration_token uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.person_registrations where token = registration_token and created_by = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare registration public.person_registrations; actor public.profiles;
begin
  if new.raw_user_meta_data ? 'registration_token' then
    select * into registration from public.person_registrations
      where token::text = new.raw_user_meta_data ->> 'registration_token'
        and email = lower(new.email) and expires_at > now() for update;
    if registration.token is null then
      raise exception 'La autorización de alta venció o no corresponde a este correo.';
    end if;
    select * into actor from public.profiles where id = registration.created_by and is_active for update;
    if actor.id is null or actor.role not in ('admin', 'professional')
       or (registration.role = 'professional' and actor.role <> 'admin') then
      raise exception 'La persona que autorizó el alta ya no tiene permiso.';
    end if;
    insert into public.profiles(id, role, specialty, full_name, phone)
      values(new.id, registration.role, registration.specialty, registration.full_name, registration.phone);
    if actor.role = 'professional' then
      insert into public.care_assignments(patient_id, professional_id, kind)
        values(new.id, actor.id, actor.specialty);
    end if;
    delete from public.person_registrations where token = registration.token;
  else
    insert into public.profiles(id, role, full_name, phone)
      values(new.id, 'patient', nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'phone', ''));
  end if;
  return new;
end $$;

-- El alta autorizada ya crea el vínculo en la misma transacción que el perfil.
-- Un profesional no puede apropiarse de un paciente existente enviando su UUID.
drop policy "creación de asignaciones por el admin o el propio profesional" on public.care_assignments;
create policy "admin crea asignaciones" on public.care_assignments for insert to authenticated
  with check (public.is_admin());
drop policy "cierre de asignaciones por el admin o el propio profesional" on public.care_assignments;
create policy "admin actualiza asignaciones" on public.care_assignments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create function public.validate_care_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ended_at is null then
    perform 1 from public.profiles where id in (new.patient_id, new.professional_id) order by id for update;
    if not exists(select 1 from public.profiles where id = new.patient_id and role = 'patient' and is_active)
       or not exists(select 1 from public.profiles where id = new.professional_id and role = 'professional' and specialty = new.kind and is_active) then
      raise exception 'Selecciona un paciente activo y un profesional activo de la especialidad indicada.' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;
create trigger care_assignments_validate before insert or update on public.care_assignments
  for each row execute function public.validate_care_assignment();

create function public.close_inactive_professional_assignments()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.is_active and not new.is_active and old.role = 'professional' then
    update public.care_assignments set ended_at = now() where professional_id = new.id and ended_at is null;
  end if;
  return new;
end $$;
create trigger profiles_close_assignments after update of is_active on public.profiles
  for each row execute function public.close_inactive_professional_assignments();

create function public.deactivate_person(person_id uuid, expected_assignments integer)
returns void language plpgsql security definer set search_path = public as $$
declare target public.profiles; assignment_count integer;
begin
  if not public.is_admin() then
    raise exception 'Solo administración puede dar de baja.' using errcode = '42501';
  end if;
  select * into target from public.profiles where id = person_id for update;
  if target.id is null or target.role = 'admin' then
    raise exception 'Selecciona un profesional o paciente.' using errcode = '22023';
  end if;
  select count(*) into assignment_count from public.care_assignments
    where professional_id = person_id and ended_at is null;
  if expected_assignments is distinct from assignment_count then
    raise exception 'Las asignaciones cambiaron. Recarga y revisa la confirmación.' using errcode = '22023';
  end if;
  update public.profiles set is_active = false where id = person_id;
end $$;

alter table public.patient_details add column onboarding_step smallint not null default 0
  check (onboarding_step between 0 and 3);
update public.patient_details set onboarding_step = 3
  where goal is not null and level is not null and environment is not null and cardinality(equipment) > 0;
alter table public.patient_details add constraint onboarding_required_fields check (
  (onboarding_step < 1 or (goal is not null and level is not null)) and
  (onboarding_step < 2 or (environment is not null and cardinality(equipment) > 0))
);
alter table public.patient_details add constraint patient_equipment_vocabulary check (
  equipment <@ array['none','bands','dumbbells','barbell','machines','kettlebells','ball','other']::text[]
  and array_position(equipment, null) is null
);
alter table public.patient_conditions add constraint patient_body_part_vocabulary check (
  body_part in ('neck','shoulder','elbow','wrist','upper_back','lower_back','hip','knee','ankle','foot','core','other')
);

create function public.finish_patient_onboarding(patient_id uuid, conditions jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare item jsonb; current_step smallint;
begin
  select onboarding_step into current_step from public.patient_details where profile_id = patient_id for update;
  if current_step is null or current_step < 2 then
    raise exception 'Completa primero el objetivo y el equipamiento.' using errcode = '22023';
  end if;
  if current_step = 3 then return; end if;
  if conditions is null or jsonb_typeof(conditions) <> 'array' or jsonb_array_length(conditions) > 20 then
    raise exception 'Revisa las condiciones registradas.' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(conditions) loop
    if length(item ->> 'notes') > 1000 then
      raise exception 'Las notas deben tener como máximo 1000 caracteres.' using errcode = '22023';
    end if;
    insert into public.patient_conditions(patient_id, body_part, severity, notes)
      values(patient_id, item ->> 'body_part', (item ->> 'severity')::public.condition_severity, nullif(item ->> 'notes', ''));
  end loop;
  update public.patient_details set onboarding_step = 3 where profile_id = patient_id;
  if not found then raise exception 'No tienes permiso para editar este perfil.' using errcode = '42501'; end if;
end $$;

revoke all on function public.prepare_person_registration(text,text,text,public.user_role,public.professional_specialty) from public, anon;
revoke all on function public.cancel_person_registration(uuid) from public, anon;
revoke all on function public.deactivate_person(uuid,integer) from public, anon;
revoke all on function public.finish_patient_onboarding(uuid,jsonb) from public, anon;
grant execute on function public.prepare_person_registration(text,text,text,public.user_role,public.professional_specialty) to authenticated;
grant execute on function public.cancel_person_registration(uuid) to authenticated;
grant execute on function public.deactivate_person(uuid,integer) to authenticated;
grant execute on function public.finish_patient_onboarding(uuid,jsonb) to authenticated;
