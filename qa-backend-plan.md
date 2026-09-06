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
| **BACK-002** | `commit_routine_assignment` acepta la regla que elige el cliente (o `null`) sin recalcular la ganadora | Recalcular la primera regla compatible por prioridad dentro de la transacción y rechazar si `selected_rule` / `no_match` no coinciden. Depende de si la evaluación de reglas existe en SQL o solo en `lib/catalog/evaluate-rules.ts` (si es solo TS, hay que portar el «primera coincidencia por prioridad»). Migración a la función. | M-A | M |

### Batch 2 — TS contenido, sin migración (ganancias rápidas)

| ID | Qué | Cómo | Esfuerzo | Riesgo |
|---|---|---|---|---|
| **BACK-009** | El cron informa correo enviado y registrado aunque falle el UPDATE de `notified_at`, y no reintenta | `lib/progress/membership-review.ts` (~L113-120): capturar el `{ error }` del UPDATE, contarlo como fallo y devolverlo en la respuesta; no reportar `emailed` para un aviso cuya marca falló. Reintento real = fase 2. | S (mín.) | B |
| **BACK-010** | El cron da 500 con `noticeDays` inválido (-1, decimal, entero máx.) y acepta `0` pese a que el panel exige 1..90 | `app/api/cron/memberships/route.ts` (~L37-57): validar `noticeDays` con un Zod entero 1..90 compartido con el panel y devolver 400. | S | B |
| **BACK-008** | El bucket acepta archivo de 0 bytes y bytes arbitrarios con MIME `image/*` declarado | `lib/catalog/exercise-actions.ts`: validar firma (magic bytes) y rechazar vacío antes de subir. Storage no valida contenido por sí mismo. | S | B |

### Batch 3 — Integridad de datos (migraciones)

| ID | Qué | Cómo | Esfuerzo | Riesgo |
|---|---|---|---|---|
| **BACK-004** | `screenings.taken_by` / `attendance.registered_by` / `check_in_at` se pueden falsificar por API directa | Trigger `before insert` que fija la autoría a `auth.uid()`; `revoke update` de esas columnas. Confirmar en la spec si el admin registra en nombre de otro (camino explícito aparte). | S-M | B-M |
| **BACK-005** | Membresías con fechas invertidas, monto negativo, plan inactivo o perfil no-paciente | `check (amount >= 0)`, `check (expires_on >= started_on)`; trigger que valida rol del `patient_id` y `is_active` del `plan_id`. **Verificar antes que el seed demo no viole las constraints** (membresía contra el plan inactivo, offsets de fecha). Migración. | S-M | B |
| **BACK-007** | Cualquier profesional sobrescribe objetos de otro y escribe fuera de `custom/` | Políticas de `storage.objects` para `exercise-media`: `insert/update/delete` con `(storage.foldername(name))[1] = 'custom'` y `owner = auth.uid()`; otros prefijos reservados a admin. Migración. | S-M | M (subida de imágenes del catálogo) |

### Batch 4 — Alcance confirmado (D1-D4 resueltas)

| ID | Trabajo | Esfuerzo | Riesgo |
|---|---|---|---|
| **BACK-003** | Escribir `routine_assignment_event` (manual, sin regla) en el camino de asignación directa. Se conserva el `grant`. | S | B |
| **BACK-011** | Migración `services.price` + `check >= 0` + backfill; Zod; acción admin; mostrar en `/offer` y `/plans`; tipos; revisar seeds de servicios. | M | B-M |
| **BACK-006** | Migración `exercises.created_by` + backfill; RLS de UPDATE por dueño activo o admin; cablear edición para profesionales; ajustar prueba heredada. | M | M |
| **BACK-012** | Definir asistencia esperada del mes; generador idempotente (momento por decidir: al cerrar sesión / cron diario); zona horaria; destinatarios = profesionales asignados + admin; umbral <50 %; idempotencia `(patient_id, kind, período)`. | A | M |

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
   - **BACK-002** — ⬜ pendiente. Recalcular la regla ganadora dentro de
     `commit_routine_assignment`. Antes hay que ver si la evaluación de reglas
     existe en SQL o solo en `lib/catalog/evaluate-rules.ts`.
3. **Batch 3** (integridad, migraciones): BACK-004, BACK-005, BACK-007. ⬜
4. **Batch 4** (alcance confirmado): BACK-003 (rápido), BACK-011, BACK-006,
   BACK-012. ⬜
5. Pospuestos: BACK-013, BACK-014 (medir antes).

**Bloqueo operativo:** los batches 1, 3 y 4 llevan migración y necesitan
`npm run db:reset` + regen de `lib/db/types.ts` + `test:rls`/`test:*` en verde.
La Supabase local compartida (54321/54322) la usan otras sesiones y `db:reset`
borra su estado. Opciones: (a) ventana coordinada para resetear la compartida, o
(b) levantar una instancia Supabase aislada propia para desarrollar y validar las
migraciones antes de integrarlas. El batch 2 no tiene este bloqueo.
