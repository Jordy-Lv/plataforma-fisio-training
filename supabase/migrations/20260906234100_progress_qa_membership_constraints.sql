-- =============================================================================
-- QA backend · BACK-005 — las membresías aceptaban relaciones y valores
-- semánticamente imposibles.
--
-- La tabla solo tenía FKs y tipos: un admin que insertara por PostgREST directo
-- podía crear una membresía con monto negativo, con el vencimiento antes del
-- inicio, contra un plan inactivo o para un perfil que no es paciente. Los
-- reportes, el job de vencimientos y los correos operaban luego sobre datos
-- imposibles. Las reglas vivían solo en Zod y en las acciones de servidor.
--
-- Se llevan a la frontera persistente:
--   - `check` de monto no negativo y de fechas ordenadas.
--   - Trigger que exige que `patient_id` sea un perfil con rol `patient` y que
--     `plan_id` apunte a un plan activo. Se valida en el alta y solo se
--     revalida en edición si esa FK concreta cambia, para que las transiciones
--     de estado del job de vencimientos (p. ej. a `expired`) nunca lo disparen.
-- =============================================================================

alter table public.memberships
  add constraint memberships_amount_non_negative check (amount >= 0),
  add constraint memberships_dates_ordered check (expires_on >= started_on);

create or replace function public.memberships_validate_relations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  patient_role public.user_role;
  plan_is_active boolean;
begin
  if tg_op = 'INSERT' or new.patient_id is distinct from old.patient_id then
    select role into patient_role
      from public.profiles where id = new.patient_id;
    if patient_role is distinct from 'patient'::public.user_role then
      raise exception 'La membresía debe pertenecer a un paciente.'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'INSERT' or new.plan_id is distinct from old.plan_id then
    select is_active into plan_is_active
      from public.plans where id = new.plan_id;
    if plan_is_active is not true then
      raise exception 'El plan de la membresía no está activo.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.memberships_validate_relations() is
  'BACK-005: la membresía es de un paciente y contra un plan activo.';

create trigger memberships_validate_relations
  before insert or update on public.memberships
  for each row execute function public.memberships_validate_relations();
