-- =============================================================================
-- manual-routine-assignment · ADR-0009 y ADR-0010.
--
-- La rutina deja de asignarla un motor de reglas: el profesional elige una
-- plantilla, se crea un **borrador** (`pending_review`, que el paciente no lee),
-- lo ajusta y lo **confirma**. Solo al confirmar se cierra la rutina activa del
-- mismo tipo y el paciente ve la nueva.
--
-- Contenido (design.md, D2):
--   1. `private.copy_template_content`: el bucle de copia, extraído de
--      `private.copy_routine_template`, que se reescribe sin cambiar nada más.
--   2. `private.can_assign_routine_kind` (ADR-0010) y su uso en
--      `public.copy_routine_template`.
--   3. Un borrador por paciente y tipo: se archivan los duplicados y se crea
--      `routines_one_draft_per_kind`.
--   4. `public.create_routine_draft`, `public.discard_routine_draft` y
--      `public.confirm_routine_draft`.
--   5. La guarda que impide activar un borrador con un `update` directo.
--   6. `public.finish_patient_onboarding` sin la llamada al motor (slice 1,
--      avisado al equipo).
--
-- No se borra nada del motor de reglas: `assignment_rules`,
-- `commit_routine_assignment` y `assign_routine_from_rules` siguen vivos hasta
-- `retire-rules-engine`. La aplicación deja de invocarlos.
--
-- Estado de partida: el esquema tras `20260911160000`.
-- =============================================================================

-- --- 1. la copia del contenido de una plantilla ------------------------------

-- Días y ejercicios de la plantilla → días y ejercicios de una rutina que ya
-- existe. Es el bucle que vivía dentro de `private.copy_routine_template`, sin
-- cambios: mismos mensajes, mismo orden, mismo rechazo de un día sin
-- ejercicios. **No comprueba el actor ni la plantilla activa**: lo hace quien
-- llama.
--
-- `security invoker` como la función de la que sale: desde
-- `public.copy_routine_template` corre como `authenticated` bajo RLS; desde las
-- funciones del borrador corre con el rol propietario.
create function private.copy_template_content(target_routine uuid, template_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  source_days jsonb;
  source_day record;
  new_day_id uuid;
begin
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
  ) order by d.day_number) into source_days
  from public.template_days d where d.template_id = copy_template_content.template_id;

  if source_days is null then
    raise exception 'La plantilla no tiene días. Completa su contenido antes de asignarla.'
      using errcode = '22023';
  end if;

  for source_day in
    select * from jsonb_to_recordset(source_days)
      as d(day_number smallint, title text, items jsonb)
  loop
    if source_day.items is null or source_day.items = 'null'::jsonb then
      raise exception 'El día % no tiene ejercicios. Completa la plantilla antes de asignarla.', source_day.day_number
        using errcode = '22023';
    end if;

    insert into public.routine_days (routine_id, day_number, title)
    values (target_routine, source_day.day_number, source_day.title)
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
end;
$$;

revoke all on function private.copy_template_content(uuid, uuid) from public, anon;
grant execute on function private.copy_template_content(uuid, uuid) to authenticated;

comment on function private.copy_template_content(uuid, uuid) is
  'Copia los días y ejercicios de una plantilla a una rutina existente. Interna: no comprueba el actor ni que la plantilla esté activa.';

-- Reescrita para usar la función anterior. **El comportamiento no cambia**:
-- mismas comprobaciones, mismo cierre de la activa con la fecha de
-- America/Bogota (KAN-17) y mismos mensajes.
create or replace function private.copy_routine_template(patient_id uuid, template_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  source record;
  new_routine_id uuid;
  today_on date := (now() at time zone 'America/Bogota')::date;
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

  select t.name, t.kind,
    exists (select 1 from public.template_days d where d.template_id = t.id) as has_days
  into source
  from public.routine_templates t
  where t.id = copy_routine_template.template_id and t.is_active;

  if not found then
    raise exception 'Selecciona una plantilla activa disponible.' using errcode = '22023';
  end if;
  if not source.has_days then
    raise exception 'La plantilla no tiene días. Completa su contenido antes de asignarla.'
      using errcode = '22023';
  end if;

  update public.routines r set status = 'completed', ends_on = today_on
  where r.patient_id = copy_routine_template.patient_id
    and r.kind = source.kind and r.status = 'active';

  insert into public.routines (patient_id, kind, source_template_id, assigned_by, name, starts_on)
  values (patient_id, source.kind, template_id, auth.uid(), source.name, today_on)
  returning id into new_routine_id;

  perform private.copy_template_content(new_routine_id, template_id);

  return new_routine_id;
end;
$$;

-- --- 2. la especialidad en la asignación (ADR-0010) --------------------------

-- ¿Puede el actor preparar o confirmar una rutina de este tipo para este
-- paciente? El administrador activo, siempre. Un profesional activo, solo si su
-- especialidad es la del tipo **y** tiene una asignación de cuidado vigente de
-- ese mismo tipo sobre el paciente.
--
-- Solo gobierna la selección y la confirmación de plantillas: leer y editar los
-- ejercicios de una rutina ya creada sigue siendo `treats_patient()` (ADR-0007).
create function private.can_assign_routine_kind(
  target_patient uuid, target_kind public.professional_specialty
) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active
      and (
        p.role = 'admin'
        or (
          p.role = 'professional' and p.specialty = target_kind
          and exists (
            select 1 from public.care_assignments ca
            where ca.professional_id = p.id and ca.patient_id = target_patient
              and ca.kind = target_kind and ca.ended_at is null
          )
        )
      )
  )
$$;

revoke all on function private.can_assign_routine_kind(uuid, public.professional_specialty) from public, anon;
grant execute on function private.can_assign_routine_kind(uuid, public.professional_specialty) to authenticated;

comment on function private.can_assign_routine_kind(uuid, public.professional_specialty) is
  'ADR-0010: el admin activo, o un profesional activo de esa especialidad con una asignación de cuidado vigente de ese tipo sobre el paciente.';

-- Reescrita. Único cambio respecto de `20260910130000`: la comprobación de
-- especialidad sobre el tipo de la plantilla, después de la del actor. El
-- camino directo sigue existiendo (tres suites preparan datos con él), pero ya
-- no se salta ADR-0010.
create or replace function public.copy_routine_template(patient_id uuid, template_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  new_routine_id uuid;
  template_kind public.professional_specialty;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active
      and (public.is_admin() or public.treats_patient(copy_routine_template.patient_id))
  ) then
    raise exception 'Solo el administrador o el profesional a cargo puede asignar la rutina.'
      using errcode = '42501';
  end if;

  -- Sin plantilla, la función privada da el mensaje de siempre.
  select t.kind into template_kind
  from public.routine_templates t where t.id = copy_routine_template.template_id;
  if found and not private.can_assign_routine_kind(copy_routine_template.patient_id, template_kind) then
    raise exception 'Solo puedes asignar plantillas de tu especialidad a pacientes que atiendes en ese tipo.'
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

-- --- 3. un solo borrador por paciente y tipo ---------------------------------

-- El motor de reglas pudo dejar más de una propuesta `pending_review` por
-- paciente y tipo. Se conserva la más reciente y las demás se archivan: nada se
-- borra y ninguna rutina activa se toca.
with ranked as (
  select r.id, row_number() over (
    partition by r.patient_id, r.kind order by r.created_at desc, r.id desc
  ) as position
  from public.routines r where r.status = 'pending_review'
)
update public.routines r set status = 'archived'
from ranked where ranked.id = r.id and ranked.position > 1;

create unique index routines_one_draft_per_kind
  on public.routines (patient_id, kind) where status = 'pending_review';

-- --- 4. el ciclo del borrador ------------------------------------------------

-- Nombre en español de una zona del cuerpo, para las notas del borrador. Es el
-- mismo vocabulario que `lib/catalog/body-parts.ts`.
create function private.body_part_label(part text)
returns text language sql immutable set search_path = '' as $$
  select case part
    when 'neck' then 'Cuello' when 'shoulder' then 'Hombro' when 'elbow' then 'Codo'
    when 'wrist' then 'Muñeca' when 'upper_back' then 'Espalda alta'
    when 'lower_back' then 'Espalda baja' when 'hip' then 'Cadera' when 'knee' then 'Rodilla'
    when 'ankle' then 'Tobillo' when 'foot' then 'Pie' when 'core' then 'Abdomen'
    when 'other' then 'Otra zona' else part
  end
$$;

revoke all on function private.body_part_label(text) from public, anon;
grant execute on function private.body_part_label(text) to authenticated;

create function private.routine_kind_label(kind public.professional_specialty)
returns text language sql immutable set search_path = '' as $$
  select case kind when 'training' then 'entrenamiento' else 'rehabilitación' end
$$;

revoke all on function private.routine_kind_label(public.professional_specialty) from public, anon;
grant execute on function private.routine_kind_label(public.professional_specialty) to authenticated;

-- Elegir una plantilla crea el borrador. **No toca la rutina activa**, no
-- registra ningún evento y no genera alertas: nada de esto existe para el
-- paciente hasta que se confirma.
create function public.create_routine_draft(target_patient uuid, template_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  source record;
  exclusions uuid[];
  new_routine_id uuid;
  removed_notes text;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.role in ('admin', 'professional')
  ) then
    raise exception 'Solo el administrador o el profesional a cargo puede preparar rutinas.'
      using errcode = '42501';
  end if;

  select t.name, t.kind into source
  from public.routine_templates t
  where t.id = create_routine_draft.template_id and t.is_active;
  if not found then
    raise exception 'Selecciona una plantilla activa disponible.' using errcode = '22023';
  end if;

  if not private.can_assign_routine_kind(target_patient, source.kind) then
    raise exception 'Solo puedes preparar rutinas de tu especialidad para pacientes que atiendes en ese tipo.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = target_patient and p.role = 'patient' and p.is_active
  ) then
    raise exception 'Selecciona un paciente activo al que tengas acceso.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.patient_details d
    where d.profile_id = target_patient and d.onboarding_step = 3
  ) then
    raise exception 'El paciente debe completar su perfil antes de preparar su rutina: sin sus condiciones no se pueden quitar los ejercicios contraindicados.'
      using errcode = '22023';
  end if;

  -- La misma clave que la copia y la confirmación: serializa todo lo que cambia
  -- las rutinas de este paciente.
  perform pg_advisory_xact_lock(hashtextextended('routines:' || target_patient::text, 0));

  if exists (
    select 1 from public.routines r
    where r.patient_id = target_patient and r.kind = source.kind and r.status = 'pending_review'
  ) then
    raise exception 'Este paciente ya tiene un borrador de %. Confírmalo o descártalo antes de elegir otra plantilla.',
      private.routine_kind_label(source.kind)
      using errcode = '22023';
  end if;

  exclusions := private.assignment_exclusions(target_patient, template_id);

  insert into public.routines (patient_id, kind, source_template_id, assigned_by, name, status)
  values (target_patient, source.kind, template_id, null, source.name, 'pending_review')
  returning id into new_routine_id;

  perform private.copy_template_content(new_routine_id, template_id);

  -- Qué se quita y por qué, antes de quitarlo: las notas son la explicación
  -- que la pantalla muestra en «Qué se excluyó».
  select string_agg(format('- Día %s: se quitó «%s», contraindicado para %s.',
      d.day_number, e.name, (
        select string_agg(private.body_part_label(c.body_part), ' y ' order by c.body_part)
        from (select distinct pc.body_part from public.patient_conditions pc
          where pc.patient_id = target_patient and pc.is_active
            and pc.body_part = any(e.contraindications)) c
      )), e'\n' order by d.day_number, i.position)
  into removed_notes
  from public.routine_days d
  join public.routine_items i on i.routine_day_id = d.id
  join public.exercises e on e.id = i.exercise_id
  where d.routine_id = new_routine_id and i.exercise_id = any(exclusions);

  delete from public.routine_items i using public.routine_days d
  where i.routine_day_id = d.id and d.routine_id = new_routine_id
    and i.exercise_id = any(exclusions);

  if removed_notes is not null then
    update public.routines
    set notes = 'Se quitaron por las condiciones activas del paciente:' || e'\n' || removed_notes
    where id = new_routine_id;
  end if;

  return new_routine_id;
end;
$$;

revoke all on function public.create_routine_draft(uuid, uuid) from public, anon;
grant execute on function public.create_routine_draft(uuid, uuid) to authenticated;

comment on function public.create_routine_draft(uuid, uuid) is
  'ADR-0009: copia una plantilla como borrador (`pending_review`) invisible para el paciente, sin los ejercicios contraindicados. No toca la rutina activa ni avisa a nadie. Especialidad según ADR-0010.';

-- Descartar **archiva**: conserva la traza y el borrador deja de mostrarse.
create function public.discard_routine_draft(target_routine uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  draft record;
begin
  select r.patient_id, r.kind into draft from public.routines r where r.id = target_routine;
  -- Una rutina ajena o inexistente recibe el mismo rechazo: no se revela cuál es.
  if not found or not private.can_assign_routine_kind(draft.patient_id, draft.kind) then
    raise exception 'Solo el administrador o el profesional de esa especialidad a cargo puede descartar el borrador.'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('routines:' || draft.patient_id::text, 0));

  update public.routines set status = 'archived'
  where id = target_routine and status = 'pending_review';
  if not found then
    raise exception 'Esta rutina ya no es un borrador. Recarga la página para ver su estado.'
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.discard_routine_draft(uuid) from public, anon;
grant execute on function public.discard_routine_draft(uuid) to authenticated;

comment on function public.discard_routine_draft(uuid) is
  'ADR-0009: archiva un borrador sin tocar la rutina activa. Especialidad según ADR-0010.';

-- Confirmar publica el borrador: cierra la activa del mismo tipo, activa el
-- borrador y registra la asignación, cuyo trigger avisa a quien entrena ese
-- tipo de rutina (KAN-10), como hasta ahora.
create function public.confirm_routine_draft(target_routine uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  draft record;
  empty_days smallint[];
  short_days jsonb;
  today_on date := (now() at time zone 'America/Bogota')::date;
begin
  select r.patient_id, r.kind into draft from public.routines r where r.id = target_routine;
  if not found or not private.can_assign_routine_kind(draft.patient_id, draft.kind) then
    raise exception 'Solo el administrador o el profesional de esa especialidad a cargo puede confirmar la rutina.'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('routines:' || draft.patient_id::text, 0));

  -- Se relee con bloqueo: otro envío pudo confirmarlo o descartarlo mientras
  -- esperaba el candado.
  select r.patient_id, r.kind, r.source_template_id, r.status into draft
  from public.routines r where r.id = target_routine for update;
  if draft.status <> 'pending_review' then
    raise exception 'Esta rutina ya no es un borrador. Recarga la página para ver su estado.'
      using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = draft.patient_id and p.role = 'patient' and p.is_active
  ) then
    raise exception 'Selecciona un paciente activo al que tengas acceso.' using errcode = '22023';
  end if;

  select coalesce(array_agg(d.day_number order by d.day_number), '{}') into empty_days
  from public.routine_days d
  where d.routine_id = target_routine
    and not exists (select 1 from public.routine_items i where i.routine_day_id = d.id);
  if cardinality(empty_days) = 1 then
    raise exception 'El día % no tiene ejercicios. Añádele al menos uno antes de confirmar.', empty_days[1]
      using errcode = '22023';
  elsif cardinality(empty_days) > 1 then
    raise exception 'Los días % no tienen ejercicios. Añade al menos uno a cada día antes de confirmar.',
      array_to_string(empty_days[1:cardinality(empty_days) - 1], ', ') || ' y ' || empty_days[cardinality(empty_days)]
      using errcode = '22023';
  end if;
  if not exists (select 1 from public.routine_days d where d.routine_id = target_routine) then
    raise exception 'El borrador no tiene días. Descártalo y elige otra plantilla.' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(day_number order by day_number), '[]'::jsonb) into short_days
  from (
    select d.day_number from public.routine_days d
    join public.routine_items i on i.routine_day_id = d.id
    where d.routine_id = target_routine
    group by d.id, d.day_number having count(i.id) < 3
  ) short;

  update public.routines r set status = 'completed', ends_on = today_on
  where r.patient_id = draft.patient_id and r.kind = draft.kind and r.status = 'active';

  update public.routines
  set status = 'active', starts_on = today_on, ends_on = null, assigned_by = auth.uid()
  where id = target_routine;

  insert into public.routine_assignment_events(patient_id, routine_id, outcome, payload)
  values (draft.patient_id, target_routine, 'assigned', jsonb_build_object(
    'source', 'manual',
    'template_id', draft.source_template_id,
    'assigned_by', auth.uid(),
    'short_days', short_days,
    'message', 'Asignación manual: el profesional eligió la plantilla, revisó el borrador y lo confirmó.'
  ));

  return jsonb_build_object('routine_id', target_routine, 'short_days', short_days);
end;
$$;

revoke all on function public.confirm_routine_draft(uuid) from public, anon;
grant execute on function public.confirm_routine_draft(uuid) to authenticated;

comment on function public.confirm_routine_draft(uuid) is
  'ADR-0009: activa un borrador sin días vacíos, cierra la activa del mismo tipo y registra la asignación (`source = manual`). Devuelve `{routine_id, short_days}`. Especialidad según ADR-0010.';

-- --- 5. un borrador no se activa sin confirmar -------------------------------

-- La política de `update` de `routines` deja que el profesional a cargo cambie
-- `status` directamente. Sin esta guarda, un `update … set status = 'active'`
-- saltaría la confirmación: el día vacío, el cierre de la activa, la
-- especialidad y el evento.
--
-- Se distingue por `current_user`, el mismo recurso que BACK-003: en una
-- llamada directa por PostgREST es `authenticated`; dentro de una función
-- `security definer` (`confirm_routine_draft`, y el motor de reglas mientras
-- exista) es el rol propietario. **Cualquier función futura que active un
-- borrador tiene que ser `security definer`.** Cerrar una rutina
-- (`completed`) o archivarla sigue permitido.
create function private.guard_routine_draft_activation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.status = 'pending_review' and new.status = 'active'
    and current_user = 'authenticated' then
    raise exception 'Un borrador solo se activa al confirmarlo desde la pantalla de la rutina.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_routine_draft_activation() from public, anon;

create trigger routine_draft_activation_guard before update of status on public.routines
for each row execute function private.guard_routine_draft_activation();

-- --- 6. terminar el registro no asigna rutina --------------------------------

-- Reescrita (slice 1, avisado al equipo). Único cambio respecto de
-- `20260910130000`: sale la llamada a `private.assign_routine_from_rules`. El
-- cuerpo vuelve a ser el de `20260905050000`.
create or replace function public.finish_patient_onboarding(patient_id uuid, conditions jsonb)
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

comment on function public.finish_patient_onboarding(uuid, jsonb) is
  'Cierra el registro del paciente. No asigna rutina: la elige su profesional (ADR-0009).';
