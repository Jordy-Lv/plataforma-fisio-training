-- =============================================================================
-- Cerrar el registro público.
--
-- `createPerson` da de alta con `auth.signUp` usando la clave anónima, así que
-- el registro de Supabase tiene que seguir activo. Pero la clave anónima viaja
-- al navegador, y `handle_new_user` convertía en paciente activo a cualquiera
-- que se registrara SIN token de alta: bastaba un POST a /auth/v1/signup. RLS
-- impedía ver datos de otros pacientes, pero el alta la decide el admin o el
-- profesional (docs/00), no quien tenga la clave anónima.
--
-- Desde aquí, un alta sin token se rechaza salvo que
-- `private.allow_open_signup()` diga lo contrario. Por defecto dice que no. La
-- semilla local (`supabase/seed.sql`, que nunca corre en producción) la
-- redefine para devolver `true`, porque las suites de `scripts/` crean sus
-- pacientes de prueba con `signUp` sin token.
-- =============================================================================

create or replace function private.allow_open_signup()
returns boolean
language sql
stable
as $$ select false $$;

comment on function private.allow_open_signup() is
  'Si es true, un alta sin token de registro crea un paciente. false en producción; la semilla local la pone en true para las suites.';

revoke all on function private.allow_open_signup() from public, anon, authenticated;

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
    if not private.allow_open_signup() then
      raise exception 'El registro público está cerrado: las altas las hace el equipo desde la aplicación.'
        using errcode = '42501';
    end if;
    insert into public.profiles(id, role, full_name, phone)
      values(new.id, 'patient', nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'phone', ''));
  end if;
  return new;
end $$;
