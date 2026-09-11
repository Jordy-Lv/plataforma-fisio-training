-- =============================================================================
-- KAN-10 · defecto D2 — las alertas se repartían sin mirar la especialidad.
--
-- Los cinco generadores de alertas resolvían destinatarios con la misma
-- subconsulta copiada, que no mira `kind`:
--
--   from public.profiles p where p.is_active and (p.role = 'admin' or
--     (p.role = 'professional' and exists (select 1 from public.care_assignments ca
--       where ca.patient_id = ... and ca.professional_id = p.id and ca.ended_at is null)));
--
-- Cuando un paciente tiene entrenador **y** fisioterapeuta a la vez —el caso que
-- el propio `supabase/seed.sql` ya crea— el entrenador recibía en su bandeja las
-- alertas de dolor que motivan trabajo del fisioterapeuta, y viceversa.
--
-- `docs/00-contexto-y-alcance.md` promete lo contrario: «cada uno ve las alertas
-- que le corresponden». Y el ADR-0007 ya había decidido cómo: «La interfaz debe
-- filtrar por `specialty` donde corresponda. Es filtrado de presentación, no de
-- autorización.» Eso es exactamente lo que es esto: **no es una fuga**. La
-- autorización funciona —`treats_patient()` filtra por `care_assignments`— y
-- ningún profesional alcanzaba a un paciente que no acompaña. El problema es de
-- reparto y de ruido: llegaba trabajo ajeno a una bandeja que hay que poder
-- creerse.
--
-- ## Dónde se aplica, y por qué ahí
--
-- En un disparador `before insert` sobre `public.alerts`, no en los cinco
-- generadores. Tres razones:
--
--   1. La matriz queda escrita **una vez**. Copiada cinco veces, la sexta se
--      olvida.
--   2. Dos de los generadores son funciones de job de doscientas líneas que
--      habría que volver a emitir enteras para cambiarles cuatro; transcribirlas
--      es más arriesgado que el cambio.
--   3. Un generador futuro no puede saltárselo por descuido.
--
-- El disparador **descarta** la fila devolviendo `null`. Es lo que hay que
-- entender al leer esto: un `insert` de alerta puede no insertar nada.
--
-- Estado de partida: el esquema tras aplicar las 13 migraciones anteriores.
-- =============================================================================

-- --- la matriz «tipo de alerta → especialidad» -------------------------------

-- La especialidad a la que le toca cada tipo de alerta, o `null` cuando la
-- alerta no es de nadie en particular. Está aquí y en ningún otro sitio; la
-- versión para personas vive en `docs/04-roles-y-permisos.md`.
create function private.alert_specialty(
  alert public.alert_type,
  routine_kind public.professional_specialty default null
) returns public.professional_specialty
language sql immutable set search_path = '' as $$
  select case alert
    -- El dolor es criterio clínico: es del fisioterapeuta.
    when 'pain' then 'physio'::public.professional_specialty
    -- Saltarse ejercicios y no venir son cumplimiento: del entrenador.
    when 'skipped' then 'training'::public.professional_specialty
    when 'low_attendance' then 'training'::public.professional_specialty
    -- La asignación es de quien entrena ese tipo de rutina. Sin rutina
    -- (`no_match`) no hay a quién adjudicarla y va a todo el equipo del
    -- paciente, que es justo cuando hace falta que alguien la prepare a mano.
    when 'routine_assignment' then routine_kind
    else null
  end;
$$;

comment on function private.alert_specialty(public.alert_type, public.professional_specialty) is
  'KAN-10: a qué especialidad le toca cada tipo de alerta. `null` = a todo el equipo del paciente.';

-- --- el filtro ---------------------------------------------------------------

-- Descarta la alerta cuyo destinatario no es quien tiene que atenderla.
--
-- Reglas, en orden:
--
--   * El **administrador lo recibe todo**. No cambia nada para él.
--   * `membership_expiring` es **solo del administrador**: es cobranza, no
--     trabajo clínico ni de entrenamiento.
--   * Si el tipo de alerta no tiene especialidad asignada, la reciben todos los
--     profesionales con vínculo vigente, igual que antes.
--   * Si la tiene, la recibe quien la comparte…
--   * …**salvo que nadie de esa especialidad acompañe al paciente**, y entonces
--     la reciben todos los que sí lo acompañan. Sin esta salida, el paciente que
--     solo tiene entrenador dejaría de generarle alertas de dolor a nadie más
--     que al administrador, y eso es perder señal, no repartirla. El criterio de
--     aceptación del ticket lo pide explícitamente: «ningún profesional deja de
--     recibir una alerta que antes le llegaba y sí le corresponde».
create function public.filter_alert_recipient()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  recipient_role public.user_role;
  recipient_specialty public.professional_specialty;
  wanted public.professional_specialty;
  routine_kind public.professional_specialty;
begin
  select p.role, p.specialty into recipient_role, recipient_specialty
  from public.profiles p where p.id = new.recipient_id;

  if recipient_role is distinct from 'professional' then
    return new;
  end if;

  if new.type = 'membership_expiring' then
    return null;
  end if;

  if new.type = 'routine_assignment' then
    select r.kind into routine_kind from public.routines r
    where r.id = (new.payload->>'routine_id')::uuid;
  end if;

  wanted := private.alert_specialty(new.type, routine_kind);
  if wanted is null or recipient_specialty = wanted then
    return new;
  end if;

  -- Nadie de la especialidad que toca acompaña a este paciente: la alerta no se
  -- pierde, la recibe quien sí lo acompaña.
  if not exists (
    select 1
    from public.care_assignments ca
    join public.profiles p on p.id = ca.professional_id
    where ca.patient_id = new.patient_id and ca.ended_at is null
      and p.is_active and p.role = 'professional' and p.specialty = wanted
  ) then
    return new;
  end if;

  return null;
end;
$$;

revoke all on function public.filter_alert_recipient() from public, anon, authenticated;

comment on function public.filter_alert_recipient() is
  'KAN-10 / D2: descarta la alerta cuyo destinatario no es de la especialidad que le toca. Filtrado de presentación (ADR-0007), no de autorización.';

-- Se dispara **antes** que cualquier otra cosa: la fila descartada no llega a la
-- tabla, así que no hay nada que limpiar después.
create trigger alerts_specialty_filter before insert on public.alerts
for each row execute function public.filter_alert_recipient();
