-- Fechas explícitas: «Día 1» conserva su significado dentro de la rutina.
create table public.routine_schedules (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  routine_day_id uuid not null references public.routine_days(id),
  scheduled_on date not null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.routine_schedules enable row level security;

create unique index routine_schedules_active_day_unique
  on public.routine_schedules(patient_id, routine_day_id, scheduled_on)
  where cancelled_at is null;
create index routine_schedules_patient_date_idx
  on public.routine_schedules(patient_id, scheduled_on);
create index routine_schedules_day_idx on public.routine_schedules(routine_day_id);
create index routine_schedules_author_idx on public.routine_schedules(created_by);

create policy "paciente y equipo leen el calendario"
on public.routine_schedules for select to authenticated using (
  public.actor_is_active() and (
    patient_id = auth.uid() or public.is_admin() or public.treats_patient(patient_id)
  )
);
create policy "equipo programa el calendario"
on public.routine_schedules for insert to authenticated with check (
  public.is_admin() or public.treats_patient(patient_id)
);
create policy "equipo cancela una programación"
on public.routine_schedules for update to authenticated
using (public.is_admin() or public.treats_patient(patient_id))
with check (public.is_admin() or public.treats_patient(patient_id));

revoke all on public.routine_schedules from anon, authenticated;
grant select, insert on public.routine_schedules to authenticated;
grant update(cancelled_at) on public.routine_schedules to authenticated;

create function public.guard_routine_schedule() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  routine public.routines;
  today_on date := (now() at time zone 'America/Bogota')::date;
begin
  select r.* into routine from public.routine_days d
    join public.routines r on r.id = d.routine_id
    where d.id = new.routine_day_id for share of r, d;
  if routine.id is null or routine.patient_id <> new.patient_id then
    raise exception 'El día debe pertenecer a una rutina de este paciente.' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if routine.status <> 'active' or not exists (
      select 1 from public.profiles where id = new.patient_id and role = 'patient' and is_active
    ) then
      raise exception 'Selecciona una rutina activa de un paciente activo.' using errcode = '22023';
    end if;
    if (auth.uid() is not null and new.scheduled_on < today_on)
      or new.scheduled_on > today_on + 366
      or new.scheduled_on < routine.starts_on or new.scheduled_on > routine.ends_on then
      raise exception 'Elige una fecha dentro de la vigencia de la rutina, desde hoy y hasta un año.' using errcode = '22023';
    end if;
    if new.cancelled_at is not null then
      raise exception 'Una programación nueva no puede estar cancelada.' using errcode = '22023';
    end if;
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_at := now();
  else
    if (new.id, new.patient_id, new.routine_day_id, new.scheduled_on, new.created_by, new.created_at)
      is distinct from (old.id, old.patient_id, old.routine_day_id, old.scheduled_on, old.created_by, old.created_at)
      or old.cancelled_at is not null or new.cancelled_at is null then
      raise exception 'Solo puedes cancelar una programación vigente; su historial se conserva.' using errcode = '22023';
    end if;
    if new.scheduled_on < today_on or exists (
      select 1 from public.sessions s where s.patient_id = new.patient_id
        and s.routine_day_id = new.routine_day_id and s.performed_on = new.scheduled_on
    ) then
      raise exception 'No puedes cancelar fechas pasadas ni sesiones que ya se iniciaron.' using errcode = '22023';
    end if;
    new.cancelled_at := now();
  end if;
  return new;
end;
$$;
create trigger routine_schedule_guard before insert or update on public.routine_schedules
for each row execute function public.guard_routine_schedule();

create function public.cancel_closed_routine_schedules() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  update public.routine_schedules rs set cancelled_at = now()
  where rs.cancelled_at is null
    and rs.scheduled_on >= (now() at time zone 'America/Bogota')::date
    and exists (select 1 from public.routine_days d where d.id = rs.routine_day_id and d.routine_id = new.id)
    and not exists (select 1 from public.sessions s where s.patient_id = rs.patient_id
      and s.routine_day_id = rs.routine_day_id and s.performed_on = rs.scheduled_on);
  return new;
end;
$$;
create trigger closed_routine_cancels_calendar after update of status on public.routines
for each row when (old.status = 'active' and new.status <> 'active')
execute function public.cancel_closed_routine_schedules();

comment on table public.routine_schedules is
  'Programación por fecha de días de rutina; la ejecución sigue en sessions. Cancelaciones lógicas y acceso por paciente asignado.';
