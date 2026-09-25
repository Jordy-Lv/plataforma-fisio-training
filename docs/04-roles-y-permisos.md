# 04 — Roles y permisos

> Son datos de salud. Una fuga entre pacientes no es un error de programación: es el fin
> del contrato. Este documento define la matriz de acceso y RLS la implementa. **Si algo
> aquí y el código no coinciden, el código está mal.**

## Los roles

| Rol en el sistema | Cómo lo llama el cliente | Qué hace |
|---|---|---|
| `admin` | Jefe / Administrador | Da de alta y de baja al personal y a los pacientes. Define plantillas, planes y servicios. Ve el panorama completo del negocio |
| `professional` + `specialty = 'training'` | Entrenador | Arma y ajusta rutinas de entrenamiento, hace seguimiento de sus pacientes asignados |
| `professional` + `specialty = 'physio'` | Fisioterapeuta | Arma y ajusta rutinas de rehabilitación, revisa el dolor reportado, ajusta el tratamiento |
| `patient` | Cliente / Paciente | Registra su condición y objetivo, ejecuta su rutina, reporta dolor y esfuerzo, ve su progreso y su plan |

Entrenador y fisioterapeuta son **el mismo rol con distinta especialidad**: hacen las
mismas operaciones sobre distinto contenido. Separarlos en dos roles duplicaría cada
política de RLS sin ganar ninguna capacidad.

## El vínculo que gobierna todo

Un profesional **no** ve a todos los pacientes: ve a los que tiene asignados en
`care_assignments` con `ended_at is null`. Un paciente puede tener dos profesionales
activos a la vez (uno de `training`, uno de `physio`) y cada uno ve lo que le corresponde.

Esta es la regla que hay que tener en la cabeza al escribir cualquier política.

## Matriz de acceso

`propio` = solo sus propias filas · `asignado` = pacientes vinculados por `care_assignments`
· `—` = sin acceso

| Tabla | admin | professional | patient |
|---|---|---|---|
| `profiles` | lectura/escritura total | lectura de asignados + propio | lectura propio, edición parcial |
| `patient_details` | total | lectura/escritura de asignados | lectura/escritura propio |
| `patient_conditions` | total | lectura/escritura de asignados | lectura/escritura propio |
| `care_assignments` | total | lectura de las suyas | lectura de las suyas |
| `exercises` | total | lectura + creación de propios | **solo lectura** |
| `routine_templates` / `template_*` | total | lectura | — |
| `routines` / `routine_days` / `routine_items` | total | lectura/escritura de asignados | **solo lectura de las propias** |
| `sessions` | lectura total | lectura de asignados | lectura/escritura propias |
| `routine_schedules` | lectura/programación/cancelación | lectura/programación/cancelación de asignados | solo lectura propia |
| `session_logs` | lectura total | lectura de asignados | lectura/escritura propios |
| `screenings` | total | lectura/escritura de asignados | **solo lectura propias** |
| `attendance` | total | lectura/escritura de asignados | solo lectura propia |
| `plans` / `services` | total | lectura | lectura (vitrina) |
| `memberships` | total | lectura de asignados | **solo lectura propia** |
| `alerts` | lectura total | lectura de las dirigidas a él | — |

Puntos que suelen implementarse mal:

- **El paciente no edita su rutina.** Solo la ejecuta. Puede escribir `sessions` y
  `session_logs`, nunca `routine_items`.
- **El paciente no edita su tamizaje ni su membresía.** Los registra el profesional o el
  admin.
- **El paciente no ve alertas.** Las alertas son una herramienta clínica y administrativa.
- **El profesional no ve pacientes que no tiene asignados.** Ni siquiera su nombre.

### Matriz «tipo de alerta → especialidad» (KAN-10)

Un mismo paciente puede tener entrenador **y** fisioterapeuta a la vez, y
[`00-contexto-y-alcance.md`](00-contexto-y-alcance.md) promete que «cada uno ve las alertas
que le corresponden». Esto es lo que decide a quién le toca cada una:

| Tipo | Le toca a | Por qué |
|---|---|---|
| `pain` | **fisioterapeuta** | El dolor es criterio clínico. |
| `skipped` | **entrenador** | Saltarse ejercicios es cumplimiento. |
| `low_attendance` | **entrenador** | No venir también. |
| `routine_assignment` | **quien entrena ese tipo de rutina** (`routines.kind`) | Sin rutina (`no_match`) no hay a quién adjudicarla: va a todo el equipo del paciente, que es justo cuando hace falta que alguien la prepare a mano. |
| `membership_expiring` | **solo el administrador** | Es cobranza, no trabajo clínico ni de entrenamiento. |

**El administrador lo recibe todo.** Para él no cambia nada.

**Y hay una salida deliberada:** si *nadie de la especialidad que toca* acompaña al
paciente, la alerta la reciben todos los que sí lo acompañan. Sin eso, el paciente que solo
tiene entrenador dejaría de generar alertas de dolor para nadie salvo el administrador, y
eso es perder señal, no repartirla.

> **Esto es filtrado de presentación, no de autorización**, como decidió el
> [ADR-0007](adr/0007-tres-roles-mas-especialidad.md). La autorización sigue siendo
> `treats_patient()`, que no mira `specialty`: **ningún profesional alcanza a un paciente
> que no acompaña**, ni antes ni después de este cambio.

Se aplica en un disparador `before insert` sobre `public.alerts`
(`public.filter_alert_recipient`), no en cada generador: la matriz queda escrita una vez,
las dos funciones de job no hay que reescribirlas enteras para cambiarles cuatro líneas, y
un generador futuro no puede saltárselo por descuido. **El disparador descarta la fila**
devolviendo `null`, así que un `insert` de alerta puede no insertar nada.

## Cómo se implementa

### La función de rol

El rol nunca se lee de un campo enviado por el cliente ni de metadata del JWT que el
usuario pueda editar. Se lee de `profiles` con una función `security definer`:

```sql
create or replace function public.current_role()
returns user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.profiles
  where id = auth.uid() and role = 'admin' and is_active
) $$;

create or replace function public.treats_patient(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.care_assignments
  where professional_id = auth.uid()
    and patient_id = target
    and ended_at is null
) $$;
```

`treats_patient()` es la pieza central: casi toda política de un profesional la usa.

### Patrón de políticas

```sql
alter table public.sessions enable row level security;

create policy "admin lee todas las sesiones"
  on public.sessions for select
  using (public.is_admin());

create policy "profesional lee sesiones de sus pacientes"
  on public.sessions for select
  using (public.treats_patient(patient_id));

create policy "paciente lee sus sesiones"
  on public.sessions for select
  using (patient_id = auth.uid());

create policy "paciente crea sus sesiones"
  on public.sessions for insert
  with check (patient_id = auth.uid());
```

Reglas de escritura:

- Toda política de `insert` lleva `with check`. Sin él, un paciente puede insertar filas
  a nombre de otro.
- Toda política de `update` lleva `using` **y** `with check`. Sin el segundo, se puede
  cambiar el `patient_id` de una fila propia y adjudicársela a otro.
- No existen políticas de `delete` para `patient` ni `professional`. Las bajas son
  lógicas.

### `service_role`

`SUPABASE_SERVICE_ROLE_KEY` salta RLS por completo. Se usa **exclusivamente** en:

1. El job de `pg_cron` que marca vencimientos y genera alertas.
2. El script de siembra de ejercicios.

Si aparece en cualquier otro lugar —una server action, una ruta de API, un componente— el
PR se rechaza sin discusión. En una variable con prefijo `NEXT_PUBLIC_` sería una fuga
total de la base de datos.

## Verificación obligatoria

No se muestra la demo sin ejecutar el camino 9 de
[`07-plan-de-verificacion.md`](07-plan-de-verificacion.md):

1. Con la sesión de un paciente, pedir por API los datos de **otro** paciente. Debe
   devolver vacío o error, nunca datos.
2. Con la sesión de un profesional, pedir un paciente **no asignado**. Igual.
3. Con la sesión de un paciente, intentar `update` sobre un `routine_item`. Debe fallar.
4. Con la sesión de un paciente, intentar leer `alerts`. Debe devolver vacío.

Estas cuatro pruebas se ejecutan contra la API de Supabase directamente, no a través de la
interfaz: la interfaz puede estar ocultando el botón mientras la fila sigue siendo
accesible.
