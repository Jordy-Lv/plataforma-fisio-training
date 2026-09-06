-- =============================================================================
-- QA backend · BACK-012 — la alerta `low_attendance` no tenía generador.
--
-- El enum `alert_type`, el umbral `alert_settings.low_attendance_pct` (50) y la
-- etiqueta de UI existían, pero no había función, trigger, cron ni modelo de
-- «asistencia esperada» que calculara el denominador: la alerta era inerte.
--
-- Decisión D3. Se construye un generador idempotente por mes calendario:
--
--   * «Asistencia esperada» del mes = días por semana de las rutinas del
--     paciente (suma de `routine_days` de sus rutinas que ya estaban vigentes
--     al empezar el mes, tope 7) × semanas del mes. Un paciente sin rutina
--     vigente no tiene expectativa y no se evalúa.
--   * «Asistencia real» = filas de `attendance` del paciente dentro del mes.
--   * Se alerta cuando real / esperada < `low_attendance_pct` %.
--   * Momento de evaluación: un cron diario que revisa siempre el mes
--     calendario **anterior** (un mes en curso no puede juzgarse). Tras la
--     primera pasada del mes, las siguientes no hacen nada (idempotencia por
--     `attendance_notices (patient_id, period_month)`).
--   * Zona horaria `America/Bogota`. Destinatarios: admin activo + profesional
--     con asignación vigente, igual que el resto de alertas.
--
-- Estado de partida: el esquema tras aplicar las 12 migraciones anteriores.
-- =============================================================================

-- --- umbral acotado -------------------------------------------------------

-- Evita el ruido de un umbral fuera de rango (mismo espíritu que BACK-010).
alter table public.alert_settings
  add constraint low_attendance_pct_range check (
    key <> 'low_attendance_pct'
    or (value = trunc(value) and value between 1 and 100)
  );

-- --- constancia de los avisos ya emitidos — la idempotencia del job -----

create table public.attendance_notices (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  -- Primer día del mes calendario evaluado.
  period_month date not null,
  -- Los números con los que se decidió, para que el aviso se explique solo.
  expected int not null,
  attended int not null,
  pct numeric(5, 1) not null,
  created_at timestamptz not null default now(),
  constraint attendance_notices_unique unique (patient_id, period_month)
);

create index attendance_notices_patient_idx
  on public.attendance_notices (patient_id, period_month desc);

comment on table public.attendance_notices is
  'Meses en que un paciente asistió por debajo del umbral. Su clave única hace idempotente la revisión.';

alter table public.attendance_notices enable row level security;

-- El paciente ve los suyos; el profesional, los de quien tiene asignado; el
-- admin, todos. La escritura pasa solo por la revisión (clave de servicio).
create policy "lectura de avisos de asistencia propios o de un asignado"
  on public.attendance_notices for select to authenticated
  using (
    patient_id = auth.uid()
    or public.is_admin()
    or public.treats_patient(patient_id)
  );

-- --- la revisión --------------------------------------------------------

-- `target_month` null => se evalúa el mes calendario anterior al de hoy
-- (Bogotá). Si se pasa una fecha, se evalúa el mes que la contiene (para
-- pruebas y para un disparo manual sobre un mes concreto).
create function public.review_low_attendance(target_month date default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pct_threshold numeric;
  today_on date := (now() at time zone 'America/Bogota')::date;
  month_start date;
  month_end date;   -- primer día del mes siguiente, exclusivo
  weeks numeric;
  new_notices jsonb := '[]'::jsonb;
  n_flagged int := 0;
  n_evaluated int := 0;
  rec record;
  v_notice_id uuid;
begin
  select value::numeric into strict pct_threshold
  from public.alert_settings where key = 'low_attendance_pct';

  month_start := date_trunc(
    'month',
    coalesce(target_month, today_on - interval '1 month')
  )::date;
  month_end := (month_start + interval '1 month')::date;
  weeks := (month_end - month_start)::numeric / 7.0;

  for rec in
    with expectation as (
      -- Días por semana esperados: la suma de días de las rutinas del paciente
      -- que ya estaban vigentes al empezar el mes evaluado (tope 7). Se cuentan
      -- también las que ya terminaron, siempre que cubrieran parte del mes.
      select r.patient_id,
             least(count(rd.id), 7) as days_per_week
      from public.routines r
      join public.routine_days rd on rd.routine_id = r.id
      join public.profiles p on p.id = r.patient_id
      where p.role = 'patient' and p.is_active
        and r.status in ('active', 'completed', 'archived')
        and coalesce(r.starts_on, r.created_at::date) < month_start
        and (r.ends_on is null or r.ends_on >= month_start)
      group by r.patient_id
    ),
    scored as (
      select e.patient_id,
             greatest(round(e.days_per_week * weeks)::int, 1) as expected,
             (
               select count(*)::int from public.attendance a
               where a.patient_id = e.patient_id
                 and a.attended_on >= month_start
                 and a.attended_on < month_end
             ) as attended
      from expectation e
    )
    select patient_id, expected, attended,
           round(attended * 100.0 / expected, 1) as pct
    from scored
  loop
    n_evaluated := n_evaluated + 1;
    if rec.pct >= pct_threshold then
      continue;
    end if;

    insert into public.attendance_notices (patient_id, period_month, expected, attended, pct)
    values (rec.patient_id, month_start, rec.expected, rec.attended, rec.pct)
    on conflict on constraint attendance_notices_unique do nothing
    returning id into v_notice_id;

    if v_notice_id is null then
      continue;
    end if;

    n_flagged := n_flagged + 1;

    insert into public.alerts (type, patient_id, recipient_id, severity, payload)
    select 'low_attendance', rec.patient_id, staff.id, 'warning'::public.alert_severity,
           jsonb_build_object(
             'notice_id',    v_notice_id,
             'period_month', month_start,
             'expected',     rec.expected,
             'attended',     rec.attended,
             'pct',          rec.pct,
             'threshold',    pct_threshold,
             'message',      format(
               'Asistió %s de %s sesiones previstas (%s %%) durante %s. El umbral de aviso es %s %%.',
               rec.attended, rec.expected, rec.pct, to_char(month_start, 'MM/YYYY'), pct_threshold
             )
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
      'notice_id',    v_notice_id,
      'patient_id',   rec.patient_id,
      'expected',     rec.expected,
      'attended',     rec.attended,
      'pct',          rec.pct
    );
  end loop;

  return jsonb_build_object(
    'period_month', month_start,
    'pct_threshold', pct_threshold,
    'evaluated',    n_evaluated,
    'flagged',      n_flagged,
    'new_notices',  new_notices
  );
end;
$$;

comment on function public.review_low_attendance(date) is
  'BACK-012: revisión mensual de asistencia baja. Idempotente por attendance_notices. La invoca el cron (mes anterior) o un disparo manual con un mes concreto.';

revoke all on function public.review_low_attendance(date) from public, anon, authenticated;
grant execute on function public.review_low_attendance(date) to service_role;

-- --- el disparo desde pg_cron ------------------------------------------

-- El generador no envía correo: pg_cron llama a la función directamente. Para
-- dispararlo a mano:  select private.run_low_attendance_review();
create function private.run_low_attendance_review()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.review_low_attendance();
$$;

revoke all on function private.run_low_attendance_review() from public, anon, authenticated;

-- Todos los días a las 13:05 UTC — 08:05 en Colombia, justo después de la
-- revisión de membresías. cron.schedule hace upsert por nombre.
select cron.schedule(
  'review-low-attendance',
  '5 13 * * *',
  $job$select private.run_low_attendance_review();$job$
);
