# 02 — Modelo de datos

Este documento es el contrato entre los cuatro slices. **El esquema completo se crea el
día 2, en una sola migración, por el owner técnico.** A partir de ahí cada slice agrega lo
suyo con migraciones nuevas, nunca editando las existentes.

Convenciones: tablas en `snake_case` plural, claves primarias `id uuid default gen_random_uuid()`,
`created_at timestamptz not null default now()` en toda tabla, marcas de tiempo con sufijo
`_at`, fechas sin hora con sufijo `_on`.

---

## Mapa

```
auth.users
    │ 1:1
profiles ──────────────┬───────────────┬────────────────┐
    │                  │               │                │
    │ 1:1 (patient)    │ N:M           │ 1:N            │ 1:N
patient_details   care_assignments  routines        alerts
    │                  (paciente ↔       │
    │ 1:N               profesional)     │ 1:N
patient_conditions                   routine_days
                                         │ 1:N
routine_templates                    routine_items ──► exercises
    │ 1:N                                                  ▲
template_days                        sessions              │
    │ 1:N                                │ 1:N             │
template_items ──────────────────────► session_logs ───────┘
    ▲
    │
assignment_rules

screenings · attendance · plans · services · memberships
```

---

## Identidad y personas

### `profiles`
Extiende `auth.users`. Una fila por persona, sea cual sea su rol.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | FK a `auth.users(id)`, `on delete cascade` |
| `role` | `user_role` | `admin` \| `professional` \| `patient` |
| `specialty` | `professional_specialty` | `training` \| `physio`. Obligatoria si `role = 'professional'`, nula en el resto |
| `full_name` | `text` | |
| `phone` | `text` | |
| `avatar_url` | `text` | |
| `is_active` | `boolean` | Las bajas son lógicas: nunca se borra a una persona |
| `created_at` | `timestamptz` | |

> Los "cuatro roles" del documento del cliente (jefe, entrenador, fisioterapeuta,
> cliente) se modelan como **tres roles más una especialidad**. Entrenador y
> fisioterapeuta hacen exactamente lo mismo sobre distinto contenido; separarlos en dos
> roles duplicaría cada política de RLS sin ganar nada.

Restricción que debe existir en la migración:

```sql
constraint specialty_solo_para_profesionales check (
  (role = 'professional' and specialty is not null) or
  (role <> 'professional' and specialty is null)
)
```

### `patient_details`
Datos del paciente. Uno a uno con `profiles` cuando `role = 'patient'`.

| Columna | Tipo | Notas |
|---|---|---|
| `profile_id` | `uuid` PK/FK | → `profiles(id)` |
| `goal` | `patient_goal` | `lose_weight` \| `gain_muscle` \| `performance` \| `rehab` \| `general_health` |
| `level` | `fitness_level` | `beginner` \| `intermediate` \| `advanced` |
| `environment` | `training_environment` | `home` \| `gym` |
| `equipment` | `text[]` | `{none, bands, dumbbells, machines, barbell, ...}` |
| `birth_date` | `date` | |
| `sex` | `text` | |
| `notes` | `text` | |

El agrupamiento por entorno (casa / gimnasio) y equipamiento fue pedido explícitamente
por el cliente: es lo que evita multiplicar variantes de cada ejercicio.

### `patient_conditions`
Lesiones y limitaciones. Un paciente puede tener varias.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `patient_id` | `uuid` FK | → `profiles(id)` |
| `body_part` | `text` | `knee`, `lower_back`, `shoulder`, … — vocabulario cerrado, ver `03-motor-de-reglas.md` |
| `severity` | `condition_severity` | `mild` \| `moderate` \| `severe` |
| `notes` | `text` | |
| `is_active` | `boolean` | Una condición superada deja de excluir ejercicios |

**Esta tabla es la que alimenta las contraindicaciones del motor de reglas.** Si aquí dice
`knee`, ningún ejercicio con `knee` en `contraindications` puede asignarse
automáticamente.

### `care_assignments`
Vincula paciente con profesional. La tabla que permite que una misma persona tenga
entrenador y fisioterapeuta a la vez.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `patient_id` | `uuid` FK | → `profiles(id)` |
| `professional_id` | `uuid` FK | → `profiles(id)` |
| `kind` | `professional_specialty` | `training` \| `physio` |
| `started_at` | `timestamptz` | |
| `ended_at` | `timestamptz` | Nulo mientras la asignación está vigente |

Índice único parcial: un paciente no puede tener dos profesionales activos del mismo tipo.

```sql
create unique index care_assignments_activa_por_tipo
  on care_assignments (patient_id, kind) where ended_at is null;
```

**Es la tabla de la que depende casi toda política de RLS.** Cambiarla afecta a los cuatro
slices: requiere aviso al equipo antes del PR.

---

## Catálogo y motor de reglas

### `exercises`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | |
| `description` | `text` | Indicaciones de ejecución |
| `media_url` | `text` | Imagen o GIF. Apunta a Supabase Storage |
| `muscle_groups` | `text[]` | |
| `equipment` | `text[]` | Debe intersecar con el equipamiento del paciente |
| `difficulty` | `fitness_level` | |
| `environments` | `text[]` | `{home}`, `{gym}` o ambos |
| `contraindications` | `text[]` | Partes del cuerpo con las que este ejercicio es incompatible |
| `is_custom` | `boolean` | `true` = creado por el equipo; `false` = importado de free-exercise-db |
| `external_id` | `text` | Id de origen, para reimportar sin duplicar |

Índices GIN sobre `equipment`, `environments` y `contraindications`: el motor de reglas
filtra por esos arreglos en cada asignación.

### `routine_templates` · `template_days` · `template_items`
Las rutinas base que define el equipo. **Nunca se modifican al asignarlas.**

- `routine_templates`: `name`, `kind` (`training` \| `physio`), `goal`, `level`,
  `environment`, `days_per_week`, `is_active`.
- `template_days`: `template_id`, `day_number`, `title` ("Día 1 — Tren inferior").
- `template_items`: `template_day_id`, `exercise_id`, `position`, `sets`, `reps`,
  `target_weight`, `rest_seconds`, `notes`.

**Un ejercicio va en tantas plantillas como se quiera**, y también varias veces dentro de la
misma. Ni `template_items` ni `routine_items` tienen unicidad sobre `exercise_id`: la única
restricción de la tabla es `unique (template_day_id, position)`, que ordena los ejercicios
dentro del día. La pregunta la plantea KAN-8 —«¿un ejercicio debe estar asociado a una o a
varias rutinas?»— y el esquema ya la responde: a varias, y no hay que duplicar el ejercicio
en el catálogo para reutilizarlo.

### `assignment_rules`
Las reglas del motor de asignación, editables desde el panel de administración.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | Legible por el equipo: "Principiante en casa, objetivo bajar de peso" |
| `priority` | `integer` | Menor número, mayor prioridad. **Se evalúan en orden y la primera que coincide gana** |
| `conditions` | `jsonb` | Ver [`03-motor-de-reglas.md`](03-motor-de-reglas.md) |
| `template_id` | `uuid` FK | La plantilla que se asigna si la regla coincide |
| `is_active` | `boolean` | |

---

## Ejecución

### `routines`
La rutina asignada a un paciente. **Copia de la plantilla**, no referencia.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `patient_id` | `uuid` FK | |
| `kind` | `professional_specialty` | `training` \| `physio` |
| `source_template_id` | `uuid` FK | Solo trazabilidad: de dónde salió. No se usa para leer contenido |
| `assigned_by` | `uuid` FK | Profesional que la asignó; nulo si la asignó el motor |
| `name` | `text` | |
| `status` | `routine_status` | `active` \| `completed` \| `archived` |
| `starts_on` / `ends_on` | `date` | La asignación desde plantillas usa la fecha civil de America/Bogota para inicio y cierre. |

### `routine_days` · `routine_items`
El contenido copiado y ya ajustado al paciente. Misma forma que `template_days` /
`template_items`, más:

- `routine_items.was_modified` (`boolean`): marca que el profesional cambió este ítem
  respecto de la plantilla. Sirve para explicar en la demo qué se personalizó.

### `sessions`
Una ejecución de un día de rutina.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `routine_id` | `uuid` FK | |
| `routine_day_id` | `uuid` FK | |
| `patient_id` | `uuid` FK | Desnormalizado a propósito: simplifica las políticas de RLS |
| `performed_on` | `date` | |
| `status` | `session_status` | `in_progress` \| `completed` \| `abandoned` |
| `completed_at` | `timestamptz` | |

### `routine_schedules`
Programación de un día de rutina en una fecha concreta. `day_number` sigue siendo
el orden dentro de la rutina: no se interpreta como día de la semana.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `patient_id` | `uuid` FK | → `profiles(id)`; debe ser el dueño real de la rutina |
| `routine_day_id` | `uuid` FK | → `routine_days(id)` |
| `scheduled_on` | `date` | Fecha programada; al crear, desde hoy hasta 366 días y dentro de la vigencia de la rutina |
| `created_by` | `uuid` FK | → `profiles(id)`; lo fija la base a partir de la sesión del profesional o administrador |
| `cancelled_at` | `timestamptz` | Baja lógica; único campo editable |
| `created_at` | `timestamptz` | |

Único por `(patient_id, routine_day_id, scheduled_on)` mientras no esté cancelada.
El equipo puede cancelar fechas no pasadas y sin ejecución. Al cerrar una rutina
se cancelan automáticamente sus programaciones no pasadas sin sesión iniciada.
Los historiales permanecen. La meta semanal cuenta las programaciones vigentes y
las cruza con `sessions` por paciente, día de rutina y fecha; varias ejecuciones
del mismo día cuentan una sola vez para esa programación. Las sesiones sin
programación siguen visibles, sin aumentar esa meta.

### `session_logs`
**El corazón del producto.** Una fila por ejercicio ejecutado (o no ejecutado).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `session_id` | `uuid` FK | |
| `routine_item_id` | `uuid` FK | |
| `patient_id` | `uuid` FK | Desnormalizado para RLS y para consultas de alertas |
| `status` | `log_status` | `done` \| `skipped` \| `modified` |
| `actual_sets` | `integer` | |
| `actual_reps` | `integer` | |
| `actual_weight` | `numeric(6,2)` | Alimenta la gráfica de progresión de carga |
| `perceived_effort` | `smallint` | 1–10 |
| `pain_level` | `smallint` | **0–10.** `check (pain_level between 0 and 10)` |
| `pain_location` | `text` | Mismo vocabulario que `patient_conditions.body_part` |
| `notes` | `text` | "Este ejercicio hoy me generó dolor en la rodilla" |
| `replaced_by_exercise_id` | `uuid` FK | Cuando el entrenador presencial sustituyó el ejercicio |
| `exercise_id` | `uuid` FK | Ejercicio prescrito al primer registro; lo deriva la base y no cambia al ajustar la rutina |
| `prescribed_sets` / `prescribed_reps` | `smallint` | Series y repeticiones prescritas al primer registro |
| `prescribed_weight` | `numeric(6,2)` | Peso prescrito al primer registro, separado de `actual_weight` |

Índice sobre `(patient_id, created_at desc)`: es la consulta que corre la detección de
dolor persistente.

Cada sesión tiene un único registro por ítem. Los registros cerrados son inmutables
para el paciente; las comprobaciones en PostgreSQL impiden mezclar paciente, sesión,
día e ítem ajenos. La referencia al ítem no borra registros en cascada: retirar un
ítem con historial necesita una retirada lógica o una nueva versión de rutina.
El cierre evalúa las alertas en la misma transacción. Los umbrales siguen en
`alert_settings`; cada destinatario conserva su propia copia y estado de lectura.

---

## Seguimiento y negocio

### `screenings`
Tamizaje periódico. Alimenta las gráficas de evolución.

`patient_id`, `taken_on`, `weight_kg`, `height_cm`, `bmi` (columna generada),
`body_fat_pct`, `measurements jsonb` (cintura, cadera, brazo…), `taken_by`, `notes`.

La gráfica se dibuja **a partir del segundo registro**; con uno solo se muestra el valor y
un mensaje de que hace falta un segundo tamizaje.

### `attendance`
`patient_id`, `attended_on`, `check_in_at`, `registered_by`, `notes`.
Único por `(patient_id, attended_on)`.

### `plans` · `services`
La vitrina. `plans`: `name`, `description`, `price`, `billing_period`, `features text[]`,
`is_active`. `services`: `name`, `description`, `category`
(`nutrition` \| `physio` \| `martial_arts` \| `workshop` \| `training`), `is_active`.

### `memberships`
Control de mensualidades. **Sin pasarela: es un registro administrativo.**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `patient_id` | `uuid` FK | |
| `plan_id` | `uuid` FK | |
| `started_on` | `date` | Fecha de ingreso |
| `expires_on` | `date` | **Fecha de vencimiento** |
| `status` | `membership_status` | `active` \| `expiring_soon` \| `expired` \| `cancelled` |
| `amount` | `numeric(12,2)` | |
| `notes` | `text` | |

El job diario de `pg_cron` pasa a `expiring_soon` las que vencen dentro de N días
(configurable, por defecto 4) y a `expired` las vencidas, generando la alerta
correspondiente.

### `alerts`
Lo que hace que el panel sirva para algo.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `type` | `alert_type` | `pain` \| `skipped` \| `membership_expiring` \| `low_attendance` |
| `patient_id` | `uuid` FK | Sobre quién es la alerta |
| `recipient_id` | `uuid` FK | Quién debe verla: el profesional a cargo o el admin |
| `severity` | `alert_severity` | `info` \| `warning` \| `critical` |
| `payload` | `jsonb` | Contexto: ejercicio, sesiones implicadas, nivel de dolor |
| `read_at` | `timestamptz` | Nulo = sin leer |

Reglas de generación (Etapa 1):

| Alerta | Se dispara cuando |
|---|---|
| `pain` | `pain_level >= 7` en el mismo ejercicio o zona en **3 sesiones** dentro de 14 días |
| `skipped` | El mismo `routine_item` se marca `skipped` **3 veces** seguidas |
| `membership_expiring` | La membresía vence dentro de 4 días o menos |
| `low_attendance` | Menos del 50 % de asistencia esperada en el mes en curso |

Umbrales en una tabla de configuración, no incrustados en el código: el equipo profesional
va a querer ajustarlos durante la demo.

---

## Reglas transversales

1. **RLS habilitado en la misma migración que crea la tabla.** Sin excepción.
2. **Nada se borra físicamente.** Bajas lógicas (`is_active`, `ended_at`, `status`). Son
   datos clínicos: el historial es parte del valor del producto.
3. **`patient_id` desnormalizado** en `sessions` y `session_logs`. Es redundante a
   propósito: sin él, cada política de RLS necesitaría dos joins.
4. **Los tipos de TypeScript se generan**, no se escriben:
   `npm run db:types` → `lib/db/types.ts`.
5. **Las cifras agregadas se cuentan en la base, no en el servidor de Next.** PostgREST
   corta toda respuesta en `max_rows` (1000, en `supabase/config.toml`), así que traer filas
   para contarlas en TypeScript da un número **falso sin avisar** en cuanto el volumen sube.
   Un conteo va con `count: "exact", head: true`; una agregación de varias tablas, con una
   función. Las del panel son `public.business_overview(date)` y
   `public.pending_screenings()`, ambas **`security invoker`** a propósito: el alcance lo
   sigue decidiendo RLS —el administrador ve todo el negocio y el profesional, solo a quien
   acompaña—, y una `security definer` convertiría un número de presentación en una fuga.
