-- =============================================================================
-- Esquema inicial completo de la plataforma.
-- Contrato entre los cuatro slices; ver docs/02-modelo-de-datos.md.
-- Cada slice agrega lo suyo en migraciones nuevas: esta jamás se edita.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tipos enumerados
-- -----------------------------------------------------------------------------

create type public.user_role as enum ('admin', 'professional', 'patient');
create type public.professional_specialty as enum ('training', 'physio');
create type public.patient_goal as enum ('lose_weight', 'gain_muscle', 'performance', 'rehab', 'general_health');
create type public.fitness_level as enum ('beginner', 'intermediate', 'advanced');
create type public.training_environment as enum ('home', 'gym');
create type public.condition_severity as enum ('mild', 'moderate', 'severe');
create type public.routine_status as enum ('active', 'completed', 'archived');
create type public.session_status as enum ('in_progress', 'completed', 'abandoned');
create type public.log_status as enum ('done', 'skipped', 'modified');
create type public.membership_status as enum ('active', 'expiring_soon', 'expired', 'cancelled');
create type public.alert_type as enum ('pain', 'skipped', 'membership_expiring', 'low_attendance');
create type public.alert_severity as enum ('info', 'warning', 'critical');
create type public.service_category as enum ('nutrition', 'physio', 'martial_arts', 'workshop', 'training');
create type public.billing_period as enum ('monthly', 'quarterly', 'semiannual', 'annual');

-- -----------------------------------------------------------------------------
-- 2. Identidad y personas
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'patient',
  specialty public.professional_specialty,
  full_name text,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint specialty_solo_para_profesionales check (
    (role = 'professional' and specialty is not null) or
    (role <> 'professional' and specialty is null)
  )
);

comment on table public.profiles is
  'Una fila por persona, sea cual sea su rol. Las bajas son lógicas (is_active).';

create index profiles_role_idx on public.profiles (role) where is_active;

create table public.patient_details (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  goal public.patient_goal,
  level public.fitness_level,
  environment public.training_environment,
  equipment text[] not null default '{}',
  birth_date date,
  sex text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.patient_conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  -- Vocabulario cerrado de docs/03-motor-de-reglas.md, validado con Zod
  -- en lib/catalog/body-parts.ts antes de llegar aquí.
  body_part text not null,
  severity public.condition_severity not null default 'mild',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index patient_conditions_patient_idx
  on public.patient_conditions (patient_id) where is_active;

create table public.care_assignments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  kind public.professional_specialty not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.care_assignments is
  'De esta tabla depende casi toda política de RLS. Cambiarla afecta a los cuatro slices.';

-- Un paciente no puede tener dos profesionales activos del mismo tipo.
create unique index care_assignments_activa_por_tipo
  on public.care_assignments (patient_id, kind) where ended_at is null;

create index care_assignments_professional_idx
  on public.care_assignments (professional_id) where ended_at is null;

-- -----------------------------------------------------------------------------
-- 3. Catálogo y motor de reglas
-- -----------------------------------------------------------------------------

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  media_url text,
  muscle_groups text[] not null default '{}',
  equipment text[] not null default '{}',
  difficulty public.fitness_level,
  environments text[] not null default '{}',
  -- Partes del cuerpo con las que el ejercicio es incompatible. Mismo
  -- vocabulario que patient_conditions.body_part.
  contraindications text[] not null default '{}',
  is_custom boolean not null default false,
  external_id text unique,
  created_at timestamptz not null default now()
);

-- El motor de reglas filtra por estos arreglos en cada asignación.
create index exercises_equipment_idx on public.exercises using gin (equipment);
create index exercises_environments_idx on public.exercises using gin (environments);
create index exercises_contraindications_idx on public.exercises using gin (contraindications);

create table public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.professional_specialty not null,
  goal public.patient_goal,
  level public.fitness_level,
  environment public.training_environment,
  days_per_week smallint not null default 3 check (days_per_week between 1 and 7),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.routine_templates is
  'Rutinas base del equipo. Nunca se modifican al asignarlas: la asignación copia.';

create table public.template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.routine_templates (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 7),
  title text,
  created_at timestamptz not null default now(),
  unique (template_id, day_number)
);

create table public.template_items (
  id uuid primary key default gen_random_uuid(),
  template_day_id uuid not null references public.template_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position smallint not null,
  sets smallint,
  reps smallint,
  target_weight numeric(6, 2),
  rest_seconds smallint,
  notes text,
  created_at timestamptz not null default now(),
  unique (template_day_id, position)
);

create table public.assignment_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Menor número, mayor prioridad. Se evalúan en orden y la primera que
  -- coincide gana; ver docs/03-motor-de-reglas.md.
  priority integer not null,
  conditions jsonb not null default '{}'::jsonb,
  template_id uuid not null references public.routine_templates (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index assignment_rules_priority_idx
  on public.assignment_rules (priority) where is_active;

-- -----------------------------------------------------------------------------
-- 4. Ejecución
-- -----------------------------------------------------------------------------

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  kind public.professional_specialty not null,
  -- Solo trazabilidad: de dónde salió. No se usa para leer contenido.
  source_template_id uuid references public.routine_templates (id) on delete set null,
  -- Nulo si la asignó el motor de reglas.
  assigned_by uuid references public.profiles (id) on delete set null,
  name text not null,
  status public.routine_status not null default 'active',
  starts_on date,
  ends_on date,
  notes text,
  created_at timestamptz not null default now()
);

create index routines_patient_idx on public.routines (patient_id, status);

create table public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 7),
  title text,
  created_at timestamptz not null default now(),
  unique (routine_id, day_number)
);

create table public.routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references public.routine_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position smallint not null,
  sets smallint,
  reps smallint,
  target_weight numeric(6, 2),
  rest_seconds smallint,
  notes text,
  -- El profesional cambió este ítem respecto de la plantilla.
  was_modified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (routine_day_id, position)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  routine_day_id uuid not null references public.routine_days (id) on delete cascade,
  -- Desnormalizado a propósito: sin él cada política de RLS necesita dos joins.
  patient_id uuid not null references public.profiles (id) on delete cascade,
  performed_on date not null default current_date,
  status public.session_status not null default 'in_progress',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index sessions_patient_idx on public.sessions (patient_id, performed_on desc);

create table public.session_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  routine_item_id uuid not null references public.routine_items (id) on delete cascade,
  -- Desnormalizado para RLS y para las consultas de alertas.
  patient_id uuid not null references public.profiles (id) on delete cascade,
  status public.log_status not null,
  actual_sets integer,
  actual_reps integer,
  actual_weight numeric(6, 2),
  perceived_effort smallint check (perceived_effort between 1 and 10),
  pain_level smallint check (pain_level between 0 and 10),
  -- Mismo vocabulario que patient_conditions.body_part.
  pain_location text,
  notes text,
  replaced_by_exercise_id uuid references public.exercises (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.session_logs is
  'El corazón del producto: una fila por ejercicio ejecutado o no ejecutado.';

-- La consulta que corre la detección de dolor persistente.
create index session_logs_patient_created_idx
  on public.session_logs (patient_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 5. Seguimiento y negocio
-- -----------------------------------------------------------------------------

create table public.screenings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  taken_on date not null default current_date,
  weight_kg numeric(5, 2) check (weight_kg > 0),
  height_cm numeric(5, 2) check (height_cm > 0),
  bmi numeric(5, 2) generated always as (
    round(weight_kg / power(height_cm / 100.0, 2), 2)
  ) stored,
  body_fat_pct numeric(4, 1) check (body_fat_pct between 0 and 100),
  -- Cintura, cadera, brazo…
  measurements jsonb not null default '{}'::jsonb,
  taken_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.screenings is
  'La gráfica se dibuja a partir del segundo registro; con uno solo se muestra el valor.';

create index screenings_patient_idx on public.screenings (patient_id, taken_on desc);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  attended_on date not null default current_date,
  check_in_at timestamptz,
  registered_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (patient_id, attended_on)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12, 2) not null default 0,
  billing_period public.billing_period not null default 'monthly',
  features text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category public.service_category not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  started_on date not null default current_date,
  expires_on date not null,
  status public.membership_status not null default 'active',
  amount numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.memberships is
  'Registro administrativo de mensualidades. Sin pasarela de pago.';

create index memberships_expires_idx on public.memberships (expires_on)
  where status in ('active', 'expiring_soon');

create index memberships_patient_idx on public.memberships (patient_id, expires_on desc);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  type public.alert_type not null,
  -- Sobre quién es la alerta.
  patient_id uuid not null references public.profiles (id) on delete cascade,
  -- Quién debe verla: el profesional a cargo o el admin.
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  severity public.alert_severity not null default 'warning',
  -- Contexto: ejercicio, sesiones implicadas, nivel de dolor.
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index alerts_recipient_idx on public.alerts (recipient_id, created_at desc)
  where read_at is null;

-- Umbrales de generación de alertas. En tabla y no en el código porque el
-- equipo profesional los va a querer ajustar durante la demostración.
create table public.alert_settings (
  key text primary key,
  value numeric not null,
  description text not null,
  created_at timestamptz not null default now()
);

insert into public.alert_settings (key, value, description) values
  ('pain_level_threshold',      7,  'Nivel de dolor a partir del cual una sesión cuenta para la alerta'),
  ('pain_occurrences',          3,  'Sesiones con dolor en la misma zona o ejercicio que disparan la alerta'),
  ('pain_window_days',          14, 'Ventana en días dentro de la cual se cuentan esas sesiones'),
  ('skipped_occurrences',       3,  'Veces seguidas que un mismo ejercicio se salta antes de alertar'),
  ('membership_expiring_days',  4,  'Días de antelación con que se avisa el vencimiento de una membresía'),
  ('low_attendance_pct',        50, 'Porcentaje de asistencia esperada por debajo del cual se alerta');

-- -----------------------------------------------------------------------------
-- 6. Funciones de autorización
--
-- El rol nunca se lee de un campo enviado por el cliente ni de la metadata del
-- JWT: se lee de public.profiles con funciones security definer, que saltan RLS
-- y evitan la recursión de políticas sobre la propia tabla.
-- -----------------------------------------------------------------------------

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  )
$$;

create or replace function public.treats_patient(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.care_assignments
    where professional_id = auth.uid()
      and patient_id = target
      and ended_at is null
  )
$$;

comment on function public.treats_patient(uuid) is
  'Pieza central de la autorización: casi toda política de un profesional la usa.';

-- Un profesional solo puede leer contenido de rutinas de sus pacientes; estas
-- dos evitan repetir el mismo join en cada política de routine_days/_items.
create or replace function public.can_read_routine(target_routine uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.routines r
    where r.id = target_routine
      and (
        public.is_admin()
        or r.patient_id = auth.uid()
        or public.treats_patient(r.patient_id)
      )
  )
$$;

create or replace function public.can_write_routine(target_routine uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.routines r
    where r.id = target_routine
      and (public.is_admin() or public.treats_patient(r.patient_id))
  )
$$;

-- -----------------------------------------------------------------------------
-- 7. Disparadores
-- -----------------------------------------------------------------------------

-- Ningún usuario de auth.users puede quedarse sin perfil.
--
-- El rol se fija siempre en 'patient' y jamás se toma de raw_user_meta_data:
-- esa metadata la controla quien se registra, así que leerla permitiría darse
-- de alta como admin. El alta de personal la hace un admin cambiando el rol
-- después, que es una escritura ya protegida por RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    'patient',
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS decide qué filas se pueden actualizar, no qué columnas. Sin esto, una
-- persona con acceso de escritura a su propio perfil se ascendería a admin.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sin sesión no hay usuario final que proteger: es el seed o el job de
  -- pg_cron, que ya operan por encima de RLS.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.specialty is distinct from old.specialty
     or new.is_active is distinct from old.is_active then
    raise exception 'Solo un administrador puede cambiar el rol, la especialidad o el estado de una persona.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- =============================================================================
-- 8. Row Level Security
--
-- Matriz completa en docs/04-roles-y-permisos.md. Reglas transversales:
--   · Toda política de insert lleva `with check`.
--   · Toda política de update lleva `using` y `with check`, para que nadie
--     pueda reasignar una fila propia a otra persona.
--   · No hay políticas de delete: todas las bajas son lógicas.
-- =============================================================================

alter table public.profiles            enable row level security;
alter table public.patient_details     enable row level security;
alter table public.patient_conditions  enable row level security;
alter table public.care_assignments    enable row level security;
alter table public.exercises           enable row level security;
alter table public.routine_templates   enable row level security;
alter table public.template_days       enable row level security;
alter table public.template_items      enable row level security;
alter table public.assignment_rules    enable row level security;
alter table public.routines            enable row level security;
alter table public.routine_days        enable row level security;
alter table public.routine_items       enable row level security;
alter table public.sessions            enable row level security;
alter table public.session_logs        enable row level security;
alter table public.screenings          enable row level security;
alter table public.attendance          enable row level security;
alter table public.plans               enable row level security;
alter table public.services            enable row level security;
alter table public.memberships         enable row level security;
alter table public.alerts              enable row level security;
alter table public.alert_settings      enable row level security;

-- --- profiles ----------------------------------------------------------------
-- Un profesional no ve ni el nombre de un paciente que no tiene asignado.

create policy "lectura de perfiles propios, asignados o admin"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or public.treats_patient(id)
  );

create policy "admin crea perfiles"
  on public.profiles for insert to authenticated
  with check (public.is_admin());

-- Las columnas sensibles (role, specialty, is_active) las bloquea el trigger
-- profiles_protect_columns; aquí solo se decide sobre qué filas se escribe.
create policy "edición del perfil propio o de cualquiera por el admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- --- patient_details ---------------------------------------------------------

create policy "lectura de datos del paciente propio o asignado"
  on public.patient_details for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(profile_id)
  );

create policy "alta de datos del paciente propio o asignado"
  on public.patient_details for insert to authenticated
  with check (
    profile_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(profile_id)
  );

create policy "edición de datos del paciente propio o asignado"
  on public.patient_details for update to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(profile_id)
  )
  with check (
    profile_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(profile_id)
  );

-- --- patient_conditions ------------------------------------------------------

create policy "lectura de condiciones propias o de asignados"
  on public.patient_conditions for select to authenticated
  using (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

create policy "alta de condiciones propias o de asignados"
  on public.patient_conditions for insert to authenticated
  with check (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

create policy "edición de condiciones propias o de asignados"
  on public.patient_conditions for update to authenticated
  using (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  )
  with check (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

-- --- care_assignments --------------------------------------------------------

create policy "lectura de las asignaciones propias"
  on public.care_assignments for select to authenticated
  using (
    patient_id = auth.uid()
    or professional_id = auth.uid()
    or public.is_admin()
  );

-- El admin asigna a cualquiera. Un profesional solo puede vincularse a sí
-- mismo y con su propia especialidad: es lo mínimo que necesita el alta de
-- paciente por un profesional (tarea 4.3 de add-auth-and-roles).
create policy "creación de asignaciones por el admin o el propio profesional"
  on public.care_assignments for insert to authenticated
  with check (
    public.is_admin()
    or (
      professional_id = auth.uid()
      and public.current_role() = 'professional'
      and kind = (select specialty from public.profiles where id = auth.uid())
    )
  );

create policy "cierre de asignaciones por el admin o el propio profesional"
  on public.care_assignments for update to authenticated
  using (public.is_admin() or professional_id = auth.uid())
  with check (public.is_admin() or professional_id = auth.uid());

-- --- exercises ---------------------------------------------------------------
-- El catálogo lo lee todo el mundo; el paciente solo lo lee.

create policy "cualquiera con sesión lee el catálogo"
  on public.exercises for select to authenticated
  using (true);

create policy "admin y profesional crean ejercicios propios"
  on public.exercises for insert to authenticated
  with check (
    public.is_admin()
    or (public.current_role() = 'professional' and is_custom)
  );

create policy "admin edita el catálogo"
  on public.exercises for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- routine_templates · template_days · template_items ----------------------
-- El paciente no las ve: recibe la copia, no la plantilla.

create policy "admin y profesional leen plantillas"
  on public.routine_templates for select to authenticated
  using (public.is_admin() or public.current_role() = 'professional');

create policy "admin escribe plantillas"
  on public.routine_templates for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin y profesional leen días de plantilla"
  on public.template_days for select to authenticated
  using (public.is_admin() or public.current_role() = 'professional');

create policy "admin escribe días de plantilla"
  on public.template_days for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin y profesional leen ítems de plantilla"
  on public.template_items for select to authenticated
  using (public.is_admin() or public.current_role() = 'professional');

create policy "admin escribe ítems de plantilla"
  on public.template_items for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- assignment_rules --------------------------------------------------------

create policy "admin y profesional leen reglas"
  on public.assignment_rules for select to authenticated
  using (public.is_admin() or public.current_role() = 'professional');

create policy "admin escribe reglas"
  on public.assignment_rules for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- routines · routine_days · routine_items ---------------------------------
-- El paciente lee su rutina y nunca la edita: solo la ejecuta.

create policy "lectura de la rutina propia o de un asignado"
  on public.routines for select to authenticated
  using (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

create policy "alta de rutinas por admin o profesional a cargo"
  on public.routines for insert to authenticated
  with check (public.is_admin() or public.treats_patient(patient_id));

create policy "edición de rutinas por admin o profesional a cargo"
  on public.routines for update to authenticated
  using (public.is_admin() or public.treats_patient(patient_id))
  with check (public.is_admin() or public.treats_patient(patient_id));

create policy "lectura de días de la rutina propia o de un asignado"
  on public.routine_days for select to authenticated
  using (public.can_read_routine(routine_id));

create policy "escritura de días por admin o profesional a cargo"
  on public.routine_days for all to authenticated
  using (public.can_write_routine(routine_id))
  with check (public.can_write_routine(routine_id));

create policy "lectura de ítems de la rutina propia o de un asignado"
  on public.routine_items for select to authenticated
  using (exists (
    select 1 from public.routine_days d
    where d.id = routine_items.routine_day_id
      and public.can_read_routine(d.routine_id)
  ));

create policy "escritura de ítems por admin o profesional a cargo"
  on public.routine_items for all to authenticated
  using (exists (
    select 1 from public.routine_days d
    where d.id = routine_items.routine_day_id
      and public.can_write_routine(d.routine_id)
  ))
  with check (exists (
    select 1 from public.routine_days d
    where d.id = routine_items.routine_day_id
      and public.can_write_routine(d.routine_id)
  ));

-- --- sessions · session_logs -------------------------------------------------
-- Las escribe el paciente al ejecutar. Admin y profesional solo leen.

create policy "lectura de sesiones propias o de asignados"
  on public.sessions for select to authenticated
  using (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

create policy "el paciente crea sus sesiones"
  on public.sessions for insert to authenticated
  with check (patient_id = auth.uid());

create policy "el paciente edita sus sesiones"
  on public.sessions for update to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "lectura de registros propios o de asignados"
  on public.session_logs for select to authenticated
  using (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

create policy "el paciente registra su ejecución"
  on public.session_logs for insert to authenticated
  with check (patient_id = auth.uid());

create policy "el paciente corrige su registro"
  on public.session_logs for update to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- --- screenings · attendance -------------------------------------------------
-- El paciente los lee pero no los registra: los toma el profesional o el admin.

create policy "lectura de tamizajes propios o de asignados"
  on public.screenings for select to authenticated
  using (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

create policy "alta de tamizajes por admin o profesional a cargo"
  on public.screenings for insert to authenticated
  with check (public.is_admin() or public.treats_patient(patient_id));

create policy "edición de tamizajes por admin o profesional a cargo"
  on public.screenings for update to authenticated
  using (public.is_admin() or public.treats_patient(patient_id))
  with check (public.is_admin() or public.treats_patient(patient_id));

create policy "lectura de asistencia propia o de asignados"
  on public.attendance for select to authenticated
  using (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

create policy "alta de asistencia por admin o profesional a cargo"
  on public.attendance for insert to authenticated
  with check (public.is_admin() or public.treats_patient(patient_id));

create policy "edición de asistencia por admin o profesional a cargo"
  on public.attendance for update to authenticated
  using (public.is_admin() or public.treats_patient(patient_id))
  with check (public.is_admin() or public.treats_patient(patient_id));

-- --- plans · services --------------------------------------------------------
-- La vitrina la ve cualquiera con sesión; solo el admin la define.

create policy "cualquiera con sesión lee los planes"
  on public.plans for select to authenticated
  using (true);

create policy "admin escribe los planes"
  on public.plans for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "cualquiera con sesión lee los servicios"
  on public.services for select to authenticated
  using (true);

create policy "admin escribe los servicios"
  on public.services for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- memberships -------------------------------------------------------------
-- El paciente ve la suya y no la modifica.

create policy "lectura de la membresía propia o de un asignado"
  on public.memberships for select to authenticated
  using (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

create policy "admin escribe las membresías"
  on public.memberships for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- alerts ------------------------------------------------------------------
-- Herramienta clínica y administrativa: el paciente no las lee nunca, aunque
-- las server actions que ejecuta puedan generarlas sobre sí mismo.

create policy "lectura de las alertas dirigidas a uno mismo"
  on public.alerts for select to authenticated
  using (recipient_id = auth.uid() or public.is_admin());

create policy "generación de alertas"
  on public.alerts for insert to authenticated
  with check (
    public.is_admin()
    or public.current_role() = 'professional'
    or patient_id = auth.uid()
  );

create policy "marcar como leída la alerta propia"
  on public.alerts for update to authenticated
  using (recipient_id = auth.uid() or public.is_admin())
  with check (recipient_id = auth.uid() or public.is_admin());

-- --- alert_settings ----------------------------------------------------------

create policy "cualquiera con sesión lee los umbrales"
  on public.alert_settings for select to authenticated
  using (true);

create policy "admin ajusta los umbrales"
  on public.alert_settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
