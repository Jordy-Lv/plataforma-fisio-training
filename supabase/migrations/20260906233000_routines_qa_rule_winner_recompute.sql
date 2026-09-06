-- =============================================================================
-- QA backend · BACK-002 — `commit_routine_assignment` confiaba en la regla que
-- elegía el cliente.
--
-- La RPC solo comprobaba que `selected_rule` apuntara a una plantilla activa y
-- que las exclusiones coincidieran con las condiciones del paciente, pero nunca
-- demostraba que esa regla fuera la **primera compatible por prioridad**. Un
-- profesional asignado podía enviar el contexto real y sustituir el ID ganador
-- por otra regla activa —o por `null`— y saltarse el motor clínico dejando una
-- auditoría engañosa.
--
-- La evaluación del ganador vivía solo en TypeScript
-- (`lib/catalog/evaluate-rules.ts`). Aquí se porta a SQL la parte decisoria
-- —«gana la primera regla activa cuyos criterios se cumplen, en orden de
-- prioridad»— y `commit_routine_assignment` la recalcula dentro de la misma
-- transacción, sobre el contexto que ya verificó idéntico al que vio el panel.
--
-- Límite conocido: la validación estricta del vocabulario cerrado de
-- `equipment` y de las zonas del cuerpo (los `z.enum` de `rules-schema.ts`) no
-- se replica. Un criterio con un valor fuera de vocabulario, insertado por API
-- directa saltándose el panel, se evalúa por comparación literal en vez de
-- descartarse como regla inválida. El panel no puede producir esas reglas y el
-- objetivo de BACK-002 —que el servidor, no el cliente, fije el ganador— queda
-- cubierto.
--
-- Estado de partida: el esquema tras aplicar las 8 migraciones anteriores
-- (incluida `20260906230000_qa_actor_active_access.sql`).
-- =============================================================================

-- --- motor de reglas en SQL -------------------------------------------------

-- Comprueba los criterios presentes en `conditions` contra el `profile` del
-- contexto de asignación (`routine_assignment_context`). Reproduce
-- `checkConditions` de `lib/catalog/evaluate-rules.ts`:
--
--   * un criterio ausente no restringe;
--   * un criterio de lista vacío, o `conditions` con una clave desconocida,
--     hace la regla inválida y el motor la ignora (aquí: no coincide);
--   * sin objetivo/nivel/entorno en el perfil, un criterio que los exija falla;
--   * sin edad registrada, `age_range` falla (ante la duda no se da por
--     cumplido).
create function public.assignment_rule_matches(profile jsonb, conditions jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  known text[] := array['goal', 'level', 'environment', 'equipment_any_of',
    'equipment_all_of', 'excludes_conditions', 'age_range'];
  equip jsonb := case when jsonb_typeof(profile->'equipment') = 'array'
    then profile->'equipment' else '[]'::jsonb end;
  conds jsonb := case when jsonb_typeof(profile->'conditions') = 'array'
    then profile->'conditions' else '[]'::jsonb end;
  amin numeric;
  amax numeric;
  patient_age numeric;
begin
  if conditions is null or jsonb_typeof(conditions) <> 'object' then
    return false;
  end if;
  -- Clave desconocida ⇒ regla inválida ⇒ se ignora (no cuenta como ganadora).
  if exists (
    select 1 from jsonb_object_keys(conditions) k where not (k = any(known))
  ) then
    return false;
  end if;

  if conditions ? 'goal' then
    if jsonb_typeof(conditions->'goal') <> 'array'
      or jsonb_array_length(conditions->'goal') = 0 then return false; end if;
    if not exists (select 1 from jsonb_array_elements_text(conditions->'goal') v
      where v = profile->>'goal') then return false; end if;
  end if;

  if conditions ? 'level' then
    if jsonb_typeof(conditions->'level') <> 'array'
      or jsonb_array_length(conditions->'level') = 0 then return false; end if;
    if not exists (select 1 from jsonb_array_elements_text(conditions->'level') v
      where v = profile->>'level') then return false; end if;
  end if;

  if conditions ? 'environment' then
    if jsonb_typeof(conditions->'environment') <> 'array'
      or jsonb_array_length(conditions->'environment') = 0 then return false; end if;
    if not exists (select 1 from jsonb_array_elements_text(conditions->'environment') v
      where v = profile->>'environment') then return false; end if;
  end if;

  -- Tiene al menos uno de los equipamientos exigidos.
  if conditions ? 'equipment_any_of' then
    if jsonb_typeof(conditions->'equipment_any_of') <> 'array'
      or jsonb_array_length(conditions->'equipment_any_of') = 0 then return false; end if;
    if not exists (
      select 1 from jsonb_array_elements_text(conditions->'equipment_any_of') v
      where v in (select jsonb_array_elements_text(equip))
    ) then return false; end if;
  end if;

  -- Tiene todos los equipamientos exigidos.
  if conditions ? 'equipment_all_of' then
    if jsonb_typeof(conditions->'equipment_all_of') <> 'array'
      or jsonb_array_length(conditions->'equipment_all_of') = 0 then return false; end if;
    if exists (
      select 1 from jsonb_array_elements_text(conditions->'equipment_all_of') v
      where v not in (select jsonb_array_elements_text(equip))
    ) then return false; end if;
  end if;

  -- No tiene ninguna de las condiciones activas excluidas.
  if conditions ? 'excludes_conditions' then
    if jsonb_typeof(conditions->'excludes_conditions') <> 'array'
      or jsonb_array_length(conditions->'excludes_conditions') = 0 then return false; end if;
    if exists (
      select 1 from jsonb_array_elements_text(conditions->'excludes_conditions') v
      where v in (select jsonb_array_elements_text(conds))
    ) then return false; end if;
  end if;

  if conditions ? 'age_range' then
    if jsonb_typeof(conditions->'age_range') <> 'object' then return false; end if;
    if exists (
      select 1 from jsonb_object_keys(conditions->'age_range') k
      where k not in ('min', 'max')
    ) then return false; end if;
    amin := case when jsonb_typeof(conditions->'age_range'->'min') = 'number'
      then (conditions->'age_range'->>'min')::numeric end;
    amax := case when jsonb_typeof(conditions->'age_range'->'max') = 'number'
      then (conditions->'age_range'->>'max')::numeric end;
    if amin is null and amax is null then return false; end if;
    if amin is not null and amax is not null and amin > amax then return false; end if;
    patient_age := case when jsonb_typeof(profile->'age') = 'number'
      then (profile->>'age')::numeric end;
    if patient_age is null then return false; end if;
    if amin is not null and patient_age < amin then return false; end if;
    if amax is not null and patient_age > amax then return false; end if;
  end if;

  return true;
end;
$$;
revoke all on function public.assignment_rule_matches(jsonb, jsonb) from public, anon, authenticated;

-- La regla ganadora del contexto: la primera activa cuyos criterios se cumplen.
-- `routine_assignment_context` ya entrega `rules` en el orden decisorio
-- (`priority, created_at, id`); aquí solo se recorre ese orden.
create function public.resolve_assignment_winner(context jsonb)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select (rule->>'id')::uuid
  from jsonb_array_elements(
    case when jsonb_typeof(context->'rules') = 'array'
      then context->'rules' else '[]'::jsonb end
  ) with ordinality as r(rule, ord)
  where coalesce((rule->>'is_active')::boolean, false)
    and public.assignment_rule_matches(context->'profile', rule->'conditions')
  order by ord
  limit 1
$$;
revoke all on function public.resolve_assignment_winner(jsonb) from public, anon, authenticated;

-- --- la RPC deja de aceptar la regla del cliente --------------------------

-- Se reescribe entera (sin cambios respecto a
-- `20260905190000_routines_rule_assignment.sql` salvo el bloque BACK-002).
create or replace function public.commit_routine_assignment(
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
  -- BACK-002: el ganador se recalcula en el servidor a partir del contexto ya
  -- verificado; no se acepta la regla que eligió el cliente. Cubre tanto enviar
  -- otra regla activa como declarar `no_match` (regla nula) habiendo ganadora.
  if selected_rule is distinct from public.resolve_assignment_winner(current_context) then
    raise exception 'La regla seleccionada no corresponde al perfil del paciente. Vuelve a evaluar la asignación.'
      using errcode = '22023';
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
