# Plan de corrección — hallazgos de QA backend

**Rama:** `fix/qa-backend` (desde `main@3f2eeb5`)
**Fuente:** `qa-backend-hallazgos.md` (auditoría de Codex, 2026-09-06, 12 hallazgos + 2 sospechas)
**Evidencia:** `qa-backend-evidence/`

Ningún cambio implementado todavía: este documento es el triaje. Los 3 hallazgos
marcados **ALCANCE** necesitan una decisión de producto antes de tocarlos.

---

## Restricciones que gobiernan este plan

- Toda migración: `npm run db:reset` en verde + `lib/db/types.ts` regenerado en el
  mismo commit + `test:rls` y las `test:*` afectadas.
- BACK-001 toca la RLS del esquema core (`profiles`, `patient_details`): avisar al
  equipo antes del PR (sección 3 de CLAUDE.md).
- Probar ahora es incómodo: la Supabase local compartida la usan otras sesiones y
  un `db:reset` borra su estado. Hay que coordinar una ventana o levantar una
  instancia aislada para validar (la de Codex ya se desmontó).
- `fix/qa-hallazgos` (frontend) ya tocó `lib/auth/actions.ts` y esquemas de
  `lib/progress`/`lib/routines`; al fusionar ambas ramas habrá conflictos menores
  en `lib/auth/` y `lib/progress/`.

---

## Decisiones de alcance (resueltas por Yordy, 2026-09-06)

### D1 · BACK-003 — **asignación manual directa ES legítima → solo trazabilidad**
El profesional puede asignar sin pasar por el motor de reglas. Se **conserva** el
`grant execute` de `copy_routine_template`. Lo único que falta: que ese camino
manual escriba un `routine_assignment_event` (tipo manual / sin regla) para no
perder el rastro. No se filtra por contraindicaciones: es decisión clínica del
profesional, igual que en el editor de rutina.

### D2 · BACK-011 — **el precio de servicios ENTRA en la demo**
Migración: `services.price numeric(12,2) not null` (+ `check >= 0`), backfill de
las filas existentes, Zod en `plan-schemas.ts` (o el que aplique), acción de
admin, presentación en `/offer` y `/plans`, tipos regenerados. Revisar
`seed`/`seed:*` de servicios para que aporten precio.

### D3 · BACK-012 — **se construye el generador de `low_attendance`**
Definir «asistencia esperada» del mes (probablemente a partir de
`routine_days`/frecuencia o un valor configurable), generador idempotente
—momento a decidir: al cerrar sesión, o en un cron diario—, zona horaria
`America/Bogota`, destinatarios = profesionales asignados + admin (igual que las
demás alertas). Umbral: <50 % del mes (contrato). Idempotencia por
`(patient_id, kind, período)`. Es el mayor esfuerzo del lote.

### D4 · BACK-006 — **se resuelve a favor de OpenSpec**
Migración: `exercises.created_by uuid references profiles(id)`, backfill (las
actuales `is_custom` a su creador si se puede inferir, o a `null`/admin), RLS de
UPDATE = `created_by = auth.uid()` con actor activo **o** `is_admin()`; cablear
la ruta de edición de ejercicios para el rol profesional (hoy vive en
`app/(admin)/exercises/[id]`). Ajustar la prueba heredada que fija el
comportamiento «solo admin».

---

## Batches de corrección

### Batch 1 — Frontera de autorización (P0, primero)

| ID | Qué | Cómo | Esfuerzo | Riesgo |
|---|---|---|---|---|
| **BACK-001** | Un JWT emitido antes de una baja conserva acceso directo a PostgREST/Storage | `current_role()` y `treats_patient()` pasan a exigir `is_active`; las políticas con `id = auth.uid()` llano (self de `profiles`/`patient_details`) añaden término `is_active`; revisar políticas de `storage.objects`. Migración nueva. Decidir aparte si además se revocan sesiones al desactivar (necesita admin API, hoy prohibida fuera de cron/seed). | M | M-A (RLS de todas las tablas de personas) |
| **BACK-002** ✅ | `commit_routine_assignment` acepta la regla que elige el cliente (o `null`) sin recalcular la ganadora | HECHO. Portada la parte decisoria del motor a SQL (`assignment_rule_matches` + `resolve_assignment_winner`); la RPC recalcula el ganador en la transacción y rechaza con `22023` si `selected_rule` / `no_match` no coinciden. Migración `20260906233000_routines_qa_rule_winner_recompute.sql` + regresión. | M-A | M |

### Batch 2 — TS contenido, sin migración (ganancias rápidas)

| ID | Qué | Cómo | Esfuerzo | Riesgo |
|---|---|---|---|---|
| **BACK-009** | El cron informa correo enviado y registrado aunque falle el UPDATE de `notified_at`, y no reintenta | `lib/progress/membership-review.ts` (~L113-120): capturar el `{ error }` del UPDATE, contarlo como fallo y devolverlo en la respuesta; no reportar `emailed` para un aviso cuya marca falló. Reintento real = fase 2. | S (mín.) | B |
| **BACK-010** | El cron da 500 con `noticeDays` inválido (-1, decimal, entero máx.) y acepta `0` pese a que el panel exige 1..90 | `app/api/cron/memberships/route.ts` (~L37-57): validar `noticeDays` con un Zod entero 1..90 compartido con el panel y devolver 400. | S | B |
| **BACK-008** | El bucket acepta archivo de 0 bytes y bytes arbitrarios con MIME `image/*` declarado | `lib/catalog/exercise-actions.ts`: validar firma (magic bytes) y rechazar vacío antes de subir. Storage no valida contenido por sí mismo. | S | B |

### Batch 3 — Integridad de datos (migraciones) ✅ HECHO

| ID | Qué | Cómo | Esfuerzo | Riesgo |
|---|---|---|---|---|
| **BACK-004** ✅ | `screenings.taken_by` / `attendance.registered_by` se podían falsificar por API directa | HECHO. Migración `20260906234000_progress_qa_authorship_triggers.sql`: trigger `before insert or update` en `screenings` y `attendance` que fija la autoría a `coalesce(auth.uid(), <valor>)` en el alta (el seed/cron corren con `service_role` y conservan el valor explícito) y la deja inmutable en edición (`old`). No se tocó `check_in_at` (es dato operativo del registro, no autoría). Regresión en `verify-progress-screenings` y `verify-progress-attendance`. | S-M | B-M |
| **BACK-005** ✅ | Membresías con fechas invertidas, monto negativo, plan inactivo o perfil no-paciente | HECHO. Migración `20260906234100_progress_qa_membership_constraints.sql`: `check (amount >= 0)`, `check (expires_on >= started_on)` y trigger `security definer` que exige `patient_id` con rol `patient` y `plan_id` activo. El trigger solo revalida las FK en edición si esa columna concreta cambia, para que las transiciones de estado del cron (`active`→`expired`) nunca lo disparen. Seeds y fixtures existentes verificados: ninguno viola las constraints. Regresión nueva (5 casos) en `verify-progress-memberships`. | S-M | B |
| **BACK-007** ✅ | Cualquier profesional sobrescribe objetos de otro y escribe fuera de `custom/` | HECHO. Migración `20260906234200_catalog_qa_storage_ownership.sql`: se rehacen las políticas de `storage.objects` para `exercise-media`. El admin gestiona todo el bucket sin restricción de prefijo; el profesional solo `insert/update/delete` de objetos propios (`owner = auth.uid()`) y solo bajo `custom/` (`(storage.foldername(name))[1] = 'custom'`). El borrado propio en `custom/` pasa a estar permitido (antes era solo admin): habilita que `discardMedia` limpie las subidas huérfanas del profesional. `service_role` (seed de imágenes) sigue sin pasar por RLS. `verify-catalog-storage` reescrito al nuevo contrato; `verify-catalog:custom` (flujo real de alta/edición con imagen) sigue en verde. | S-M | M (subida de imágenes del catálogo) |

### Batch 4 — Alcance confirmado (D1-D4 resueltas) ✅ HECHO

| ID | Trabajo | Esfuerzo | Riesgo |
|---|---|---|---|
| **BACK-003** ✅ | HECHO (`1cf24f4`). Migración `20260906234300`: `record_manual_routine_assignment(uuid)` SECURITY DEFINER + `copy_routine_template` la invoca cuando `current_user = 'authenticated'` (llamada directa por RPC). Anidada en `commit_routine_assignment` (rol propietario) no duplica. Regresión en `verify-routine-assignment`. | S | B |
| **BACK-011** ✅ | HECHO (`832e82a`). Migración `20260906234500`: `services.price numeric(12,2) not null default 0` + `check (price >= 0)`. Zod compartido (`serviceFields.price`), acciones, `Service`/`serviceColumns`, `ServiceForm` con campo precio, `/offer` y `/plans` lo muestran, seed demo con precios. Regresión en `verify-progress-plans`. | M | B-M |
| **BACK-006** ✅ | HECHO (`759b377`). Migración `20260906234400`: `exercises.created_by` + trigger `exercises_pin_author` (autoría del actor, inmutable) + política de UPDATE = admin **o** autor activo de un `is_custom`. Ficha `/exercises/[id]` muestra los formularios también al autor. Las dos pruebas heredadas «solo admin» se invirtieron en `verify-catalog-custom`. Los custom anteriores quedan sin autor (solo admin). | M | M |
| **BACK-012** ✅ | HECHO (`30758df`). Migración `20260906234600`: `attendance_notices (patient_id, period_month)` única + `review_low_attendance(date)` SECURITY DEFINER solo `service_role` (esperada = días de rutina vigente × semanas del mes; real = filas de `attendance`; alerta si < umbral %) + `low_attendance_pct_range` (1..100) + cron diario `review-low-attendance` que revisa el mes anterior + `private.run_low_attendance_review()`. `test:attendance:cron` nuevo. Pendiente menor: el seed de demo no siembra asistencia, el cron marcará a los demo con 0/N. | A | M |

### Pospuestos (sospechas, medir antes)

| ID | Motivo |
|---|---|
| **BACK-013** | Reordenamientos de plantillas/reglas no transaccionales. Solo revisión estática; no se forzó intercalado concurrente. Envolver `moveRule`/`moveTemplateItem` en una RPC con bloqueos cuando haya evidencia de carrera real. |
| **BACK-014** | FK sin índice. Introspección estática, sin carga representativa. Medir con `EXPLAIN (ANALYZE, BUFFERS)` y datos sintéticos antes de añadir índices. |

---

## Orden de ejecución y progreso

1. **Batch 2** — ✅ HECHO (`5b9b326`). BACK-009, BACK-010, BACK-008. TS puro;
   typecheck/lint/build en verde. Pendiente re-correr `test:memberships:cron`
   y `test:catalog` contra la base (hecho abajo, en verde).
2. **Batch 1** (P0, con migración):
   - **BACK-001** — ✅ HECHO (`e7ab22e`). Migración
     `20260906230000_qa_actor_active_access.sql` + regresión
     `test:actor-active` (falla sin la migración, pasa con ella). `db:reset`
     limpio, tipos regenerados, las 25 suites `test:*` en verde con la base
     resembrada.
   - **BACK-002** — ✅ HECHO. Migración
     `20260906233000_routines_qa_rule_winner_recompute.sql`. La evaluación del
     ganador vivía solo en `lib/catalog/evaluate-rules.ts`; se portó la parte
     decisoria a SQL (`assignment_rule_matches` + `resolve_assignment_winner`) y
     `commit_routine_assignment` la recalcula dentro de la transacción sobre el
     contexto ya verificado: si `selected_rule` (o el nulo que declara
     `no_match`) no es el ganador determinista, lanza `22023`. Regresión nueva
     en `verify-routine-assignment.test.mjs` («el servidor recalcula el ganador
     y no acepta la regla del cliente»); el caso «Sin coincidencia» ahora
     desactiva todas las reglas para que el `no_match` sea real. `db:reset`
     limpio, tipos regenerados, base resembrada, suites en verde
     (`test:rls/actor-active/routines*/rules*/templates*/catalog*` = 156
     pruebas), typecheck/lint/build/test:design OK. Límite conocido: no se
     replica la validación estricta del vocabulario cerrado de `equipment` y de
     las zonas del cuerpo (los `z.enum` de `rules-schema.ts`); el panel no puede
     producir reglas con valores fuera de vocabulario y el objetivo de BACK-002
     queda cubierto.
3. **Batch 3** (integridad, migraciones) — ✅ HECHO. Migraciones
   `20260906234000_progress_qa_authorship_triggers.sql` (BACK-004),
   `20260906234100_progress_qa_membership_constraints.sql` (BACK-005) y
   `20260906234200_catalog_qa_storage_ownership.sql` (BACK-007). `db:reset`
   limpio con las 12 migraciones; `lib/db/types.ts` sin cambios (solo triggers y
   constraints, ninguna columna nueva). Base resembrada
   (`seed:exercises`/`templates`/`rules`/`progress-demo` sin error, lo que ya
   confirma que las constraints de BACK-005 no chocan con el seed demo).
   Suites en verde: `test:storage` 9/9, `test:screenings` 8/8,
   `test:attendance` 8/8, `test:memberships` 11/11, más regresión sin fallos
   (`rls`, `actor-active`, `catalog`, `catalog:custom`, `plans`, `overview`,
   `memberships:cron`, `routines*`, `rules*`, `templates`, `evolution`,
   `design`). `typecheck` y `lint` limpios (queda un warning previo ajeno en
   `verify-auth-screens.test.mjs`). `npm run build` pendiente de una ventana con
   `next dev` apagado (no se tocó código de app, solo SQL y scripts `.mjs`).
4. **Batch 4** (alcance confirmado) — ✅ HECHO. BACK-003 (`1cf24f4`), BACK-006
   (`759b377`), BACK-011 (`832e82a`), BACK-012 (`30758df`). Cinco migraciones
   nuevas (`20260906234300`..`234600`), `db:reset` limpio con las 13, tipos
   regenerados (+`exercises.created_by`, +`services.price`,
   +`attendance_notices`, +`record_manual_routine_assignment`,
   +`review_low_attendance`), base resembrada. Suites en verde: `routines` 12,
   `routines:items` 9, `routines:snapshot` 9, `catalog` 9, `catalog:custom` 12,
   `storage` 9, `templates` 19, `rules:panel` 12, `plans` 7, `memberships` 11,
   `memberships:cron` 7, `attendance` 8, `attendance:cron` 6 (nuevo),
   `screenings` 8, `overview` 5, `rls` 10, `actor-active` 4, `design` 4.
   `typecheck` y `lint` limpios (queda el warning previo ajeno de
   `verify-auth-screens`). `npm run build` pendiente de una ventana con
   `next dev` apagado (solo se tocó SQL, `lib/`, `components/`, páginas y
   scripts `.mjs`; no hay cambio de runtime).
5. Pospuestos: BACK-013, BACK-014 (medir antes).

**Bloqueo operativo:** los batches 1, 3 y 4 llevan migración y necesitan
`npm run db:reset` + regen de `lib/db/types.ts` + `test:rls`/`test:*` en verde.
La Supabase local compartida (54321/54322) la usan otras sesiones y `db:reset`
borra su estado. Opciones: (a) ventana coordinada para resetear la compartida, o
(b) levantar una instancia Supabase aislada propia para desarrollar y validar las
migraciones antes de integrarlas. El batch 2 no tiene este bloqueo.
