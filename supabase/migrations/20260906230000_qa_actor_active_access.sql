-- =============================================================================
-- QA backend · BACK-001 — la desactivación no revocaba el acceso de un JWT ya
-- emitido.
--
-- `current_role()` leía el rol sin comprobar `is_active`, y todas las ramas
-- `<columna> = auth.uid()` de las políticas (acceso a lo propio) tampoco, así
-- que un token emitido antes de la baja seguía leyendo y escribiendo por
-- PostgREST y Storage. `is_admin()` ya comprobaba `is_active`; aquí se cierra
-- el resto.
--
-- Estado de partida: el esquema tras aplicar las 7 migraciones anteriores. Las
-- políticas de `alerts` y de `care_assignments` (insert/update) ya se
-- rehicieron en migraciones posteriores y quedaron sin rama `= auth.uid()`
-- suelta —el cambio de `current_role()` las cubre—, así que aquí no se tocan.
-- =============================================================================

-- --- funciones de autorización ---------------------------------------------

-- Un usuario dado de baja no tiene rol efectivo. Con esto, toda política que
-- use `current_role() = 'professional'` (catálogo, plantillas, reglas, alertas,
-- storage, alta de asignaciones) deja de aplicar al profesional inactivo.
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

-- Predicado reutilizable: quien hace la petición sigue activo. Acompaña a cada
-- rama `= auth.uid()` de las políticas.
create or replace function public.actor_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_active
  )
$$;

comment on function public.actor_is_active() is
  'true si el actor de la petición sigue activo. Acompaña a cada rama `= auth.uid()`.';

-- Un profesional dado de baja deja de "tratar" a nadie aunque quedara algún
-- vínculo sin cerrar.
create or replace function public.treats_patient(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.care_assignments ca
    join public.profiles p on p.id = ca.professional_id
    where ca.professional_id = auth.uid()
      and ca.patient_id = target
      and ca.ended_at is null
      and p.is_active
  )
$$;

-- `can_read_routine` (última versión: la de 20260905190000, con search_path
-- vacío y la regla de `pending_review`). La rama del paciente propio pasa a
-- exigir que siga activo.
create or replace function public.can_read_routine(target_routine uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.routines r
    where r.id = target_routine
      and (
        public.is_admin()
        or public.treats_patient(r.patient_id)
        or (
          r.patient_id = auth.uid()
          and public.actor_is_active()
          and r.status::text <> 'pending_review'
        )
      )
  )
$$;

-- --- políticas: cada rama `= auth.uid()` pasa a exigir actor activo --------

-- profiles
alter policy "lectura de perfiles propios, asignados o admin" on public.profiles
  using (
    (id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(id)
  );

alter policy "edición del perfil propio o de cualquiera por el admin" on public.profiles
  using ((id = auth.uid() and public.actor_is_active()) or public.is_admin())
  with check ((id = auth.uid() and public.actor_is_active()) or public.is_admin());

-- patient_details
alter policy "lectura de datos del paciente propio o asignado" on public.patient_details
  using (
    (profile_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(profile_id)
  );

alter policy "alta de datos del paciente propio o asignado" on public.patient_details
  with check (
    (profile_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(profile_id)
  );

alter policy "edición de datos del paciente propio o asignado" on public.patient_details
  using (
    (profile_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(profile_id)
  )
  with check (
    (profile_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(profile_id)
  );

-- patient_conditions
alter policy "lectura de condiciones propias o de asignados" on public.patient_conditions
  using (
    (patient_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

alter policy "alta de condiciones propias o de asignados" on public.patient_conditions
  with check (
    (patient_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

alter policy "edición de condiciones propias o de asignados" on public.patient_conditions
  using (
    (patient_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(patient_id)
  )
  with check (
    (patient_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

-- care_assignments (solo sobrevive la lectura con rama `= auth.uid()`)
alter policy "lectura de las asignaciones propias" on public.care_assignments
  using (
    ((patient_id = auth.uid() or professional_id = auth.uid())
      and public.actor_is_active())
    or public.is_admin()
  );

-- routines
alter policy "lectura de la rutina propia o de un asignado" on public.routines
  using (
    (patient_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

-- sessions
alter policy "lectura de sesiones propias o de asignados" on public.sessions
  using (
    (patient_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

alter policy "el paciente crea sus sesiones" on public.sessions
  with check (patient_id = auth.uid() and public.actor_is_active());

alter policy "el paciente edita sus sesiones" on public.sessions
  using (patient_id = auth.uid() and public.actor_is_active())
  with check (patient_id = auth.uid() and public.actor_is_active());

-- session_logs
alter policy "lectura de registros propios o de asignados" on public.session_logs
  using (
    (patient_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

alter policy "el paciente registra su ejecución" on public.session_logs
  with check (patient_id = auth.uid() and public.actor_is_active());

alter policy "el paciente corrige su registro" on public.session_logs
  using (patient_id = auth.uid() and public.actor_is_active())
  with check (patient_id = auth.uid() and public.actor_is_active());

-- screenings · attendance · memberships · membership_notices
-- (solo la rama de lectura del paciente propio)
alter policy "lectura de tamizajes propios o de asignados" on public.screenings
  using (
    (patient_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

alter policy "lectura de asistencia propia o de asignados" on public.attendance
  using (
    (patient_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

alter policy "lectura de la membresía propia o de un asignado" on public.memberships
  using (
    (patient_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

alter policy "lectura de avisos de la membresía propia o de un asignado" on public.membership_notices
  using (
    (patient_id = auth.uid() and public.actor_is_active())
    or public.is_admin()
    or public.treats_patient(patient_id)
  );
