-- =============================================================================
-- Slice 4 · sección 6 — Job de vencimientos de membresías
--
-- Una revisión diaria marca las membresías próximas a vencer y las vencidas,
-- genera la alerta para el equipo y deja constancia del aviso para no repetirlo.
-- La ejecuta pg_cron llamando a una ruta interna de la aplicación protegida por
-- un secreto compartido; esa ruta hace el trabajo con la clave de servicio y,
-- si el correo está configurado, envía el aviso en español.
--
-- Para la demostración el job también se dispara a mano desde el panel de
-- administración (misma ruta, mismo secreto).
-- =============================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- -----------------------------------------------------------------------------
-- 1. Configuración del job, fuera del alcance de cualquier cliente
--
-- La URL de la ruta y el secreto compartido no pueden vivir en una migración
-- porque cambian por entorno. Se guardan aquí con los valores del entorno local
-- y cada despliegue actualiza las dos filas:
--   update private.job_config set value = '...' where key = 'membership_cron_url';
-- -----------------------------------------------------------------------------

create schema if not exists private;

create table private.job_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

comment on table private.job_config is
  'Parámetros de los jobs de pg_cron. No se expone por la API y ningún rol de cliente tiene acceso al esquema private.';

-- Nadie con sesión llega hasta aquí, pero la fila lleva RLS igual que el resto.
alter table private.job_config enable row level security;

insert into private.job_config (key, value) values
  ('membership_cron_url',    'http://host.docker.internal:3000/api/cron/memberships'),
  ('membership_cron_secret', 'local-dev-cron-secret');

-- -----------------------------------------------------------------------------
-- 2. Constancia de los avisos ya emitidos — la idempotencia del job
--
-- Una fila por (membresía, tipo de aviso, fecha de vencimiento). Si la revisión
-- se ejecuta dos veces el mismo día, el segundo intento choca con la clave
-- única y no genera ni un aviso ni una alerta nuevos.
-- -----------------------------------------------------------------------------

create table public.membership_notices (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  -- 'expiring_soon' | 'expired': el mismo vocabulario que membership_status.
  kind public.membership_status not null,
  -- La fecha de vencimiento vigente cuando se emitió el aviso. Si el paciente
  -- renueva y cambia expires_on, un vencimiento nuevo vuelve a avisar.
  expires_on date not null,
  -- Se rellena cuando el correo sale sin error; queda null si el correo está
  -- desactivado o si falló (el aviso en la aplicación es suficiente).
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint membership_notices_kind_check
    check (kind in ('expiring_soon', 'expired')),
  constraint membership_notices_unique
    unique (membership_id, kind, expires_on)
);

create index membership_notices_patient_idx
  on public.membership_notices (patient_id, created_at desc);

comment on table public.membership_notices is
  'Avisos de vencimiento ya emitidos. Su clave única hace idempotente la revisión diaria.';

alter table public.membership_notices enable row level security;

-- El paciente ve los suyos; el profesional, los de quien tiene asignado; el
-- admin, todos. La escritura pasa solo por la revisión (clave de servicio), así
-- que no hay política de insert, update ni delete.
create policy "lectura de avisos de la membresía propia o de un asignado"
  on public.membership_notices for select to authenticated
  using (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

-- -----------------------------------------------------------------------------
-- 3. La revisión
--
-- Recorre las membresías activas o ya marcadas como próximas a vencer cuyo
-- vencimiento cae dentro del plazo (o ya pasó), ajusta su estado, deja el aviso
-- y genera la alerta para el admin y el profesional a cargo. Devuelve los
-- avisos nuevos con los datos que la ruta necesita para enviar el correo.
--
-- `notice_days` null => se toma de alert_settings.membership_expiring_days, que
-- el administrador ajusta desde el panel de umbrales. Así el plazo es
-- configurable sin tocar código.
-- -----------------------------------------------------------------------------

create function public.review_membership_expiry(notice_days int default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  days int;
  today_on date := (now() at time zone 'America/Bogota')::date;
  new_notices jsonb := '[]'::jsonb;
  n_expiring int := 0;
  n_expired int := 0;
  rec record;
  v_notice_id uuid;
  v_kind public.membership_status;
begin
  days := coalesce(
    notice_days,
    (select value::int from public.alert_settings where key = 'membership_expiring_days'),
    4
  );
  if days < 0 then
    raise exception 'El plazo de aviso no puede ser negativo.' using errcode = '22023';
  end if;

  for rec in
    select m.id, m.patient_id, m.plan_id, m.expires_on, m.status,
           p.full_name as patient_name,
           u.email     as patient_email,
           pl.name     as plan_name,
           case when m.expires_on < today_on
                then 'expired'::public.membership_status
                else 'expiring_soon'::public.membership_status
           end as target_kind
    from public.memberships m
    join public.profiles p  on p.id = m.patient_id
    left join auth.users u  on u.id = m.patient_id
    left join public.plans pl on pl.id = m.plan_id
    where m.status in ('active', 'expiring_soon')
      and m.expires_on <= today_on + days
  loop
    v_kind := rec.target_kind;

    -- Idempotencia: si ya existe el aviso para este vencimiento, no se repite.
    insert into public.membership_notices (membership_id, patient_id, kind, expires_on)
    values (rec.id, rec.patient_id, v_kind, rec.expires_on)
    on conflict on constraint membership_notices_unique do nothing
    returning id into v_notice_id;

    -- El estado se ajusta aunque el aviso ya existiera (p. ej. la membresía
    -- pasó de próxima a vencer a vencida entre dos ejecuciones).
    if v_kind = 'expired' and rec.status <> 'expired' then
      update public.memberships set status = 'expired' where id = rec.id;
    elsif v_kind = 'expiring_soon' and rec.status = 'active' then
      update public.memberships set status = 'expiring_soon' where id = rec.id;
    end if;

    if v_notice_id is not null then
      if v_kind = 'expired' then
        n_expired := n_expired + 1;
      else
        n_expiring := n_expiring + 1;
      end if;

      -- Alerta para el admin y para el profesional con asignación vigente.
      insert into public.alerts (type, patient_id, recipient_id, severity, payload)
      select 'membership_expiring', rec.patient_id, staff.id,
             case when v_kind = 'expired' then 'critical'::public.alert_severity
                  else 'warning'::public.alert_severity end,
             jsonb_build_object(
               'membership_id', rec.id,
               'notice_id', v_notice_id,
               'kind', v_kind,
               'expires_on', rec.expires_on,
               'plan_name', rec.plan_name
             )
      from public.profiles staff
      where staff.is_active
        and (
          staff.role = 'admin'
          or (staff.role = 'professional' and exists (
            select 1 from public.care_assignments ca
            where ca.patient_id = rec.patient_id
              and ca.professional_id = staff.id
              and ca.ended_at is null
          ))
        );

      new_notices := new_notices || jsonb_build_object(
        'notice_id',     v_notice_id,
        'membership_id', rec.id,
        'patient_id',    rec.patient_id,
        'patient_name',  rec.patient_name,
        'patient_email', rec.patient_email,
        'plan_name',     rec.plan_name,
        'kind',          v_kind,
        'expires_on',    rec.expires_on
      );
    end if;
  end loop;

  return jsonb_build_object(
    'notice_days',           days,
    'today_on',              today_on,
    'transitioned_expiring', n_expiring,
    'transitioned_expired',  n_expired,
    'new_notices',           new_notices
  );
end;
$$;

comment on function public.review_membership_expiry(int) is
  'Revisión diaria de vencimientos de membresía. Idempotente por membership_notices. La invoca la ruta interna con la clave de servicio; el plazo sale de alert_settings si no se pasa.';

-- Solo la clave de servicio (desde la ruta interna) la ejecuta. Ningún rol de
-- cliente puede llamarla.
revoke all on function public.review_membership_expiry(int) from public, anon, authenticated;
grant execute on function public.review_membership_expiry(int) to service_role;

-- -----------------------------------------------------------------------------
-- 4. El disparo desde pg_cron
--
-- pg_cron no envía correos ni conoce el estado de la aplicación: solo llama a
-- la ruta interna con el secreto. Todo el trabajo ocurre en la ruta.
-- Para dispararlo a mano en la demostración:  select private.run_membership_review();
-- -----------------------------------------------------------------------------

create function private.run_membership_review()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url     := (select value from private.job_config where key = 'membership_cron_url'),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select value from private.job_config where key = 'membership_cron_secret')
    ),
    body    := '{}'::jsonb
  );
$$;

revoke all on function private.run_membership_review() from public, anon, authenticated;

-- Todos los días a las 13:00 UTC — las 08:00 en Colombia. cron.schedule hace
-- upsert por nombre, así que db:reset la vuelve a dejar igual sin duplicarla.
select cron.schedule(
  'review-membership-expiry',
  '0 13 * * *',
  $job$select private.run_membership_review();$job$
);
