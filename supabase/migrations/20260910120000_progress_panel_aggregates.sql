-- =============================================================================
-- KAN-12 · defecto D4 — el porcentaje de cumplimiento del panel se falseaba en
-- silencio.
--
-- `getBusinessOverview` traía las sesiones del mes con sus `session_logs`
-- embebidos y contaba en TypeScript. PostgREST corta la respuesta en `max_rows`
-- (1000 en `supabase/config.toml`), así que a partir de mil sesiones en el mes
-- el cálculo se hacía sobre un subconjunto truncado: sin error, sin log, con el
-- número simplemente dejando de ser cierto. Es uno de los tres KPI de la
-- portada del administrador.
--
-- La agregación se muda a la base. Las dos funciones son **security invoker**
-- a propósito: el alcance lo sigue decidiendo RLS, igual que cuando la consulta
-- la hacía el cliente —el administrador ve todo el negocio y el profesional,
-- solo a quien acompaña—. Una `security definer` aquí convertiría un número de
-- presentación en una fuga.
-- =============================================================================

-- --- panorama del negocio ----------------------------------------------------

-- Las cinco cifras del panorama, resueltas en una consulta y sin traer una sola
-- fila de `session_logs` al servidor de Next.
--
-- `since` es el primer día del mes del negocio (`America/Bogota`), que calcula
-- `lib/progress/vocabulary.ts`: la zona horaria no se decide aquí, porque el
-- servidor puede estar en cualquier sitio.
create or replace function public.business_overview(since date)
returns table (
  active_patients bigint,
  done bigint,
  logged bigint,
  sessions bigint,
  visits bigint,
  attended bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with active as (
    select p.id
    from public.profiles p
    where p.role = 'patient' and p.is_active
  ),
  compliance as (
    -- Cumplen `done` y `modified` —el paciente hizo el trabajo, con una
    -- sustitución acordada—; `skipped` no. El `left join` conserva las sesiones
    -- del mes que aún no tienen ningún registro, que sí cuentan como sesión.
    select
      count(l.id) filter (where l.status in ('done', 'modified')) as done,
      count(l.id) as logged,
      count(distinct s.id) as sessions
    from public.sessions s
    left join public.session_logs l on l.session_id = s.id
    where s.performed_on >= since
  ),
  month_visits as (
    select
      count(a.id) as visits,
      count(distinct a.patient_id) as attended
    from public.attendance a
    join active on active.id = a.patient_id
    where a.attended_on >= since
      and a.attended_on < (since + interval '1 month')::date
  )
  select
    (select count(*) from active),
    compliance.done,
    compliance.logged,
    compliance.sessions,
    month_visits.visits,
    month_visits.attended
  from compliance, month_visits;
$$;

comment on function public.business_overview(date) is
  'Las cinco cifras del panorama del negocio del mes, agregadas en la base. RLS decide el alcance.';

-- --- tamizajes pendientes ----------------------------------------------------

-- Cuántos pacientes activos no tienen ningún tamizaje. Antes se traían todos
-- los perfiles con su tamizaje embebido para contar los que venían vacíos: la
-- misma forma que falseaba el cumplimiento, con el mismo tope de `max_rows`.
create or replace function public.pending_screenings()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)
  from public.profiles p
  where p.role = 'patient'
    and p.is_active
    and not exists (
      select 1 from public.screenings s where s.patient_id = p.id
    );
$$;

comment on function public.pending_screenings() is
  'Pacientes activos sin ningún tamizaje registrado. RLS decide el alcance.';

grant execute on function public.business_overview(date) to authenticated;
grant execute on function public.pending_screenings() to authenticated;
