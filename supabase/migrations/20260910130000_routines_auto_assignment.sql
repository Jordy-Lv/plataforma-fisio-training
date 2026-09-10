-- =============================================================================
-- KAN-9 · defecto D1 — la rutina no se asignaba sola al terminar el registro.
--
-- La pantalla de reglas, `docs/00-contexto-y-alcance.md` (punto 2 del alcance) y
-- `docs/03-motor-de-reglas.md` prometen que el motor se evalúa **cuando el
-- paciente termina su registro**. En el código ese disparo no existía:
-- `finish_patient_onboarding` no invocaba `commit_routine_assignment`, y el
-- único punto de entrada era el botón manual «Evaluar y asignar rutina». Si
-- nadie lo pulsaba, el paciente veía «Tu profesional está preparando tu rutina»
-- indefinidamente.
--
-- El motor es real y vinculante cuando se ejecuta; lo que faltaba era llamarlo.
--
-- El obstáculo no era la lógica sino **quién es el actor**. Las tres piezas del
-- camino manual —`routine_assignment_context`, `copy_routine_template` y
-- `commit_routine_assignment`— empiezan comprobando que `auth.uid()` sea el
-- administrador o el profesional a cargo. En el camino automático el actor es
-- **el propio paciente** terminando su registro, así que las tres rechazaban.
--
-- En vez de duplicar esa lógica (dos copias del snapshot de ADR-0001 que habría
-- que mantener a la vez), cada una se parte en dos: el **efecto**, sin guarda, y
-- el **envoltorio** que autoriza y delega. El camino manual queda exactamente
-- como estaba; el automático entra por el efecto.
--
-- Las funciones sin guarda viven en el esquema `private`, que no está en
-- `schemas` de `supabase/config.toml`: PostgREST no las alcanza. Aun así, la que
-- escribe (`assign_routine_from_rules`) lleva su propia comprobación mínima
-- —que el actor sea el paciente, su profesional, un administrador o el sistema—
-- para que ningún camino futuro pueda usarla para asignarle una rutina a un
-- tercero.
--
-- Se preserva todo lo que ya existía:
--   * el `pg_advisory_xact_lock` y el `lock table ... in share mode`;
--   * el rechazo por `onboarding_step <> 3` —que en este camino pasa a
--     cumplirse justo antes, y por eso el paso se marca ANTES de asignar—;
--   * el camino `no_match`: si ninguna regla coincide no se inventa nada, se
--     registra el evento y el trigger `notify_routine_assignment` genera la
--     alerta;
--   * el camino `pending_review`: si tras quitar los ejercicios contraindicados
--     algún día queda con menos de tres, la rutina no se publica y se restaura
--     la anterior.
--
-- Estado de partida: el esquema tras aplicar las 12 migraciones anteriores.
-- =============================================================================

-- --- dónde viven las piezas internas ----------------------------------------

-- `private` no está en `schemas` de `supabase/config.toml` (solo `public` y
-- `graphql_public`), así que **PostgREST no expone nada de aquí**: son funciones
-- llamables desde dentro de la base y desde ningún otro sitio. Es el mismo
-- esquema donde ya viven los disparadores de los jobs, cuyos `execute` siguen
-- revocados para todos menos el propietario.
grant usage on schema private to authenticated;

-- --- el contexto de la asignación, sin guarda del actor ----------------------

-- Cuerpo íntegro de `routine_assignment_context`
-- (`20260905190000_routines_rule_assignment.sql`) sin su comprobación de actor.
-- La forma del jsonb no cambia: es la que el cliente compara en
-- `expected_context`, y cambiarla rompería la asignación manual.
create function private.routine_assignment_context(target_patient uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
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

revoke all on function private.routine_assignment_context(uuid) from public, anon;
grant execute on function private.routine_assignment_context(uuid) to authenticated;

comment on function private.routine_assignment_context(uuid) is
  'El contexto de asignación sin comprobar el actor. Interna: la API entra por `routine_assignment_context`.';

-- Reescrita: ahora es el envoltorio que autoriza y delega.
create or replace function public.routine_assignment_context(target_patient uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_active)
    or not (public.is_admin() or public.treats_patient(target_patient)) then
    raise exception 'Solo el administrador o el profesional a cargo puede asignar rutinas.' using errcode = '42501';
  end if;
  return private.routine_assignment_context(target_patient);
end;
$$;

-- --- la copia de la plantilla, sin guarda del actor --------------------------

-- Cuerpo íntegro de `copy_routine_template`
-- (`20260906234300_routines_qa_manual_assignment_event.sql`) sin su comprobación
-- de actor y sin la rama BACK-003, que es del camino manual y se queda en el
-- envoltorio.
--
-- Sigue siendo **security invoker** a propósito: llamada desde el camino manual
-- corre como `authenticated` y RLS se aplica exactamente igual que hoy; llamada
-- desde una función `security definer` corre con el rol propietario, que es lo
-- que el camino automático necesita —el actor es el paciente, y RLS no le deja
-- escribir su propia rutina—.
create function private.copy_routine_template(patient_id uuid, template_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  source record;
  source_day record;
  new_routine_id uuid;
  new_day_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = copy_routine_template.patient_id and p.role = 'patient' and p.is_active
  ) then
    raise exception 'Selecciona un paciente activo al que tengas acceso.'
      using errcode = '22023';
  end if;

  -- Serializa las asignaciones del mismo paciente, incluso si aún no tiene rutina.
  perform pg_advisory_xact_lock(hashtextextended('routines:' || patient_id::text, 0));

  select t.name, t.kind, (
    select jsonb_agg(jsonb_build_object(
      'day_number', d.day_number, 'title', d.title,
      'items', (
        select jsonb_agg(jsonb_build_object(
          'exercise_id', i.exercise_id, 'position', i.position,
          'sets', i.sets, 'reps', i.reps, 'target_weight', i.target_weight,
          'rest_seconds', i.rest_seconds, 'notes', i.notes
        ) order by i.position)
        from public.template_items i where i.template_day_id = d.id
      )
    ) order by d.day_number)
    from public.template_days d where d.template_id = t.id
  ) as days into source
  from public.routine_templates t
  where t.id = copy_routine_template.template_id and t.is_active;

  if not found then
    raise exception 'Selecciona una plantilla activa disponible.' using errcode = '22023';
  end if;
  if source.days is null then
    raise exception 'La plantilla no tiene días. Completa su contenido antes de asignarla.'
      using errcode = '22023';
  end if;

  update public.routines r set status = 'completed', ends_on = current_date
  where r.patient_id = copy_routine_template.patient_id
    and r.kind = source.kind and r.status = 'active';

  insert into public.routines (patient_id, kind, source_template_id, assigned_by, name, starts_on)
  values (patient_id, source.kind, template_id, auth.uid(), source.name, current_date)
  returning id into new_routine_id;

  for source_day in
    select * from jsonb_to_recordset(source.days)
      as d(day_number smallint, title text, items jsonb)
  loop
    if source_day.items is null or source_day.items = 'null'::jsonb then
      raise exception 'El día % no tiene ejercicios. Completa la plantilla antes de asignarla.', source_day.day_number
        using errcode = '22023';
    end if;

    insert into public.routine_days (routine_id, day_number, title)
    values (new_routine_id, source_day.day_number, source_day.title)
    returning id into new_day_id;

    insert into public.routine_items (
      routine_day_id, exercise_id, position, sets, reps, target_weight, rest_seconds, notes
    )
    select new_day_id, i.exercise_id, i.position, i.sets, i.reps,
      i.target_weight, i.rest_seconds, i.notes
    from jsonb_to_recordset(source_day.items) as i(
      exercise_id uuid, position smallint, sets smallint, reps smallint,
      target_weight numeric(6, 2), rest_seconds smallint, notes text
    );
  end loop;

  return new_routine_id;
end;
$$;

revoke all on function private.copy_routine_template(uuid, uuid) from public, anon;
grant execute on function private.copy_routine_template(uuid, uuid) to authenticated;

comment on function private.copy_routine_template(uuid, uuid) is
  'La copia plantilla → rutina sin comprobar el actor. Interna: la API entra por `copy_routine_template`.';

-- Reescrita: el guarda del actor y la traza del camino manual, y el resto
-- delegado. El comportamiento visible no cambia.
create or replace function public.copy_routine_template(patient_id uuid, template_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_routine_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active
      and (public.is_admin() or public.treats_patient(copy_routine_template.patient_id))
  ) then
    raise exception 'Solo el administrador o el profesional a cargo puede asignar la rutina.'
      using errcode = '42501';
  end if;

  new_routine_id := private.copy_routine_template(patient_id, template_id);

  -- BACK-003: la copia directa por RPC (camino manual, sin motor de reglas)
  -- deja su traza en el registro de decisiones. Anidada en
  -- `commit_routine_assignment` (SECURITY DEFINER, rol propietario) esta rama
  -- no entra: esa RPC escribe su propio evento con la regla aplicada.
  if current_user = 'authenticated' then
    perform public.record_manual_routine_assignment(new_routine_id);
  end if;

  return new_routine_id;
end;
$$;

-- --- los ejercicios que quita el tamizaje clínico ----------------------------

-- Los ejercicios de la plantilla contraindicados por alguna condición activa del
-- paciente. Estaba escrito dos veces dentro de `commit_routine_assignment` —una
-- para validar lo que mandó el cliente y otra para aplicarlo—; ahora es uno.
create function private.assignment_exclusions(target_patient uuid, source_template uuid)
returns uuid[] language sql stable security invoker set search_path = '' as $$
  select coalesce(array_agg(distinct e.id order by e.id), '{}'::uuid[])
  from public.template_days d
  join public.template_items i on i.template_day_id = d.id
  join public.exercises e on e.id = i.exercise_id
  where d.template_id = source_template
    and exists (
      select 1 from public.patient_conditions c
      where c.patient_id = target_patient and c.is_active
        and c.body_part = any(e.contraindications)
    );
$$;

revoke all on function private.assignment_exclusions(uuid, uuid) from public, anon, authenticated;

-- --- el efecto de la asignación, sin actor -----------------------------------

-- Evalúa las reglas sobre el contexto del paciente y aplica la ganadora. **No
-- comprueba actor**: el llamador ya autorizó, o es el propio registro del
-- paciente. Por eso está revocada para `authenticated`.
--
-- `source` distingue el origen en el registro de decisiones: `null` en el camino
-- manual, para que el evento quede idéntico a como era, y `'onboarding'` cuando
-- lo dispara el final del registro.
create function private.assign_routine_from_rules(
  target_patient uuid, assignment_notes text default '', source text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_context jsonb;
  selected_rule uuid;
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
  -- No es la autorización del camino manual —esa la hace
  -- `commit_routine_assignment` y es más estricta—, es el suelo: aunque solo se
  -- llegue aquí desde dentro de la base, esta función no le asigna una rutina a
  -- un paciente que no sea el actor o uno a su cargo. `auth.uid()` nulo es el
  -- sistema (seed, cron), la misma convención que usa `guard_session_log`.
  if auth.uid() is not null
    and auth.uid() <> target_patient
    and not (public.is_admin() or public.treats_patient(target_patient)) then
    raise exception 'Solo el propio paciente, su profesional o el administrador pueden disparar la asignación.'
      using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('routines:' || target_patient::text, 0));
  -- Mantiene estables los insumos entre la evaluación y la copia. Los bloqueos
  -- duran solo esta transacción y son compatibles con las consultas del equipo.
  lock table public.patient_details, public.patient_conditions, public.assignment_rules,
    public.routine_templates, public.template_days, public.template_items, public.exercises,
    public.care_assignments in share mode;
  perform 1 from public.profiles where id = target_patient for share;

  current_context := private.routine_assignment_context(target_patient);
  if (current_context->>'onboarding_step')::int <> 3 then
    raise exception 'El paciente debe completar su perfil antes de asignarle una rutina.' using errcode = '22023';
  end if;
  if length(coalesce(assignment_notes, '')) > 20000 then
    raise exception 'Las notas de asignación son demasiado extensas.' using errcode = '22023';
  end if;

  selected_rule := public.resolve_assignment_winner(current_context);

  if selected_rule is null then
    -- Sin regla compatible **no se inventa nada**: no hay rutina, queda el
    -- evento y el trigger genera la alerta para que alguien la prepare a mano.
    outcome := 'no_match';
    event_payload := jsonb_build_object('message', 'No hay una regla compatible. Revisa el perfil y prepara una rutina para el paciente.');
  else
    select r.template_id, t.kind into source_template, source_kind
    from public.assignment_rules r join public.routine_templates t on t.id = r.template_id
    where r.id = selected_rule and r.is_active and t.is_active;
    if not found then
      raise exception 'La regla debe apuntar a una plantilla activa.' using errcode = '22023';
    end if;
    actual_exclusions := private.assignment_exclusions(target_patient, source_template);
    select id, ends_on into previous_id, previous_end from public.routines
      where patient_id = target_patient and kind = source_kind and status = 'active';
    new_id := private.copy_routine_template(target_patient, source_template);
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
  if source is not null then
    event_payload := event_payload || jsonb_build_object('source', source);
  end if;
  insert into public.routine_assignment_events(patient_id, routine_id, outcome, payload)
    values (target_patient, new_id, outcome, event_payload);
  return jsonb_build_object('routine_id', new_id, 'outcome', outcome);
end;
$$;

revoke all on function private.assign_routine_from_rules(uuid, text, text) from public, anon;
grant execute on function private.assign_routine_from_rules(uuid, text, text) to authenticated;

comment on function private.assign_routine_from_rules(uuid, text, text) is
  'Evalúa las reglas y aplica la ganadora sin comprobar actor. Interna: el equipo entra por `commit_routine_assignment` y el registro del paciente, por `finish_patient_onboarding`.';

-- --- la RPC del equipo delega el efecto --------------------------------------

-- Reescrita. Conserva íntegras sus tres comprobaciones —el actor, que el
-- contexto no cambió desde la evaluación (BACK-002) y que la regla que mandó el
-- cliente es la que gana de verdad— y delega el efecto, para que el camino
-- manual y el automático no puedan divergir.
create or replace function public.commit_routine_assignment(
  target_patient uuid, expected_context jsonb, selected_rule uuid default null,
  excluded_exercises uuid[] default '{}', assignment_notes text default ''
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_context jsonb;
  source_template uuid;
  actual_exclusions uuid[];
begin
  -- La función usa privilegios de propietario únicamente para la escritura del
  -- evento y su aviso. Se autoriza al actor y al paciente antes de leer o escribir.
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active
    and p.role in ('admin', 'professional'))
    or not (public.is_admin() or public.treats_patient(target_patient)) then
    raise exception 'Solo el administrador o el profesional a cargo puede asignar rutinas.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('routines:' || target_patient::text, 0));
  lock table public.patient_details, public.patient_conditions, public.assignment_rules,
    public.routine_templates, public.template_days, public.template_items, public.exercises,
    public.care_assignments in share mode;
  perform 1 from public.profiles where id in (auth.uid(), target_patient) for share;
  current_context := private.routine_assignment_context(target_patient);
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
  -- Las exclusiones se validan **antes** de escribir: si lo que el equipo vio en
  -- pantalla ya no coincide con las condiciones activas, la asignación no ocurre.
  if selected_rule is not null then
    select r.template_id into source_template from public.assignment_rules r
      join public.routine_templates t on t.id = r.template_id
      where r.id = selected_rule and r.is_active and t.is_active;
    if not found then
      raise exception 'La regla debe apuntar a una plantilla activa.' using errcode = '22023';
    end if;
    actual_exclusions := private.assignment_exclusions(target_patient, source_template);
    if actual_exclusions is distinct from (select coalesce(array_agg(distinct v order by v), '{}'::uuid[])
      from unnest(excluded_exercises) v) then
      raise exception 'Las exclusiones no coinciden con las condiciones activas. Vuelve a evaluar.' using errcode = '22023';
    end if;
  end if;

  return private.assign_routine_from_rules(target_patient, assignment_notes);
end;
$$;

revoke all on function public.commit_routine_assignment(uuid, jsonb, uuid, uuid[], text) from public, anon;
grant execute on function public.commit_routine_assignment(uuid, jsonb, uuid, uuid[], text) to authenticated;

-- --- el disparo que faltaba --------------------------------------------------

-- Reescrita. Único cambio respecto de
-- `20260905050000_auth_people_onboarding.sql`: la llamada al motor al final,
-- **en la misma transacción**.
--
-- El orden importa: el paso se marca a 3 antes de asignar, porque el motor
-- rechaza a quien no ha terminado su registro. Si la asignación falla, la
-- transacción entera se deshace y el registro queda sin terminar, que es el
-- comportamiento correcto: mejor que el paciente lo reintente a que quede a
-- medias sin que nadie se entere.
create or replace function public.finish_patient_onboarding(patient_id uuid, conditions jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare item jsonb; current_step smallint;
begin
  select onboarding_step into current_step from public.patient_details where profile_id = patient_id for update;
  if current_step is null or current_step < 2 then
    raise exception 'Completa primero el objetivo y el equipamiento.' using errcode = '22023';
  end if;
  -- Reentrante: quien ya terminó no vuelve a pasar por el motor.
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

  -- D1: aquí es donde la plataforma cumple lo que promete la pantalla de reglas
  -- y el punto 2 del alcance. Si ninguna regla coincide, no hay rutina y sí hay
  -- alerta; si el resultado queda corto, la rutina espera revisión.
  perform private.assign_routine_from_rules(patient_id, '', 'onboarding');
end $$;

revoke all on function public.finish_patient_onboarding(uuid, jsonb) from public, anon;
grant execute on function public.finish_patient_onboarding(uuid, jsonb) to authenticated;

comment on function public.finish_patient_onboarding(uuid, jsonb) is
  'Cierra el registro del paciente y evalúa el motor de reglas en la misma transacción (KAN-9 / D1).';
