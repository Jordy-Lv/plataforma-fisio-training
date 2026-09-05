-- =============================================================================
-- Semilla de desarrollo. Solo local y entorno de demostración: nunca producción.
-- Personas de prueba de docs/08-onboarding-equipo.md; contraseña `demo1234`.
--
-- Este archivo y el job de pg_cron son los dos únicos lugares del proyecto que
-- operan por encima de RLS.
-- =============================================================================

-- Identificadores fijos para que cualquier slice pueda referenciarlos sin
-- consultarlos primero.
do $$
declare
  persona record;
  personas constant jsonb := '[
    {"id": "00000000-0000-4000-a000-000000000001", "email": "admin@demo.local",       "nombre": "Ana Jefa",           "rol": "admin",        "especialidad": null},
    {"id": "00000000-0000-4000-a000-000000000002", "email": "entrenador@demo.local",  "nombre": "Beto Entrenador",    "rol": "professional", "especialidad": "training"},
    {"id": "00000000-0000-4000-a000-000000000003", "email": "fisio@demo.local",       "nombre": "Carla Fisio",        "rol": "professional", "especialidad": "physio"},
    {"id": "00000000-0000-4000-a000-000000000004", "email": "paciente@demo.local",    "nombre": "Diego Paciente",     "rol": "patient",      "especialidad": null},
    {"id": "00000000-0000-4000-a000-000000000005", "email": "paciente2@demo.local",   "nombre": "Elena Paciente",     "rol": "patient",      "especialidad": null}
  ]'::jsonb;
begin
  for persona in select * from jsonb_to_recordset(personas)
    as x(id uuid, email text, nombre text, rol public.user_role, especialidad public.professional_specialty)
  loop
    -- El disparador on_auth_user_created crea el perfil como 'patient'.
    -- Los tokens van en cadena vacía y no nulos: el driver de GoTrue los lee
    -- como texto y falla con «Database error querying schema» si son null.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      persona.id,
      'authenticated',
      'authenticated',
      persona.email,
      extensions.crypt('demo1234', extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('full_name', persona.nombre),
      now(),
      now(),
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      persona.id,
      persona.id::text,
      jsonb_build_object('sub', persona.id::text, 'email', persona.email),
      'email',
      now(),
      now(),
      now()
    );

    -- El rol solo se asigna aquí, nunca desde la metadata del registro.
    update public.profiles
       set role = persona.rol,
           specialty = persona.especialidad
     where id = persona.id;
  end loop;
end $$;

-- Diego tiene entrenador y fisioterapeuta a la vez; Elena no tiene a nadie
-- asignado, que es lo que permite verificar el aislamiento del camino 9.
insert into public.care_assignments (patient_id, professional_id, kind) values
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000002', 'training'),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000003', 'physio');

insert into public.patient_details (profile_id, goal, level, environment, equipment, birth_date, sex) values
  ('00000000-0000-4000-a000-000000000004', 'rehab',         'beginner',     'home', '{none,bands}',       '1992-04-17', 'M'),
  ('00000000-0000-4000-a000-000000000005', 'general_health','intermediate', 'gym',  '{machines,barbell}', '1988-11-02', 'F');

insert into public.patient_conditions (patient_id, body_part, severity, notes) values
  ('00000000-0000-4000-a000-000000000004', 'knee', 'moderate', 'Molestia al bajar escaleras.');

-- Los pacientes de demostración ya tienen sus tres pasos completos.
update public.patient_details set onboarding_step = 3;
