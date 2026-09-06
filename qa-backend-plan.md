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

## Decisiones de alcance pendientes (bloquean el batch 4)

### D1 · BACK-003 — copia directa de plantilla sin motor de reglas
`copy_routine_template` tiene `grant execute to authenticated` y la puede llamar
un profesional asignado, saltándose evaluación de reglas, filtro de
contraindicaciones y el evento de asignación. **Pero** el profesional tiene
autoridad de ajuste manual (la memoria: «no se bloquea añadir contraindicado,
solo se advierte»).
**Pregunta:** ¿la asignación manual directa (sin pasar por reglas) es un flujo
legítimo? Si **sí** → solo hace falta que ese camino también escriba un
`routine_assignment_event` (trazabilidad). Si **no** → revocar el `grant` y
dejar la función como detalle privado de `commit_routine_assignment`.

### D2 · BACK-011 — los servicios no tienen `price`
La tabla `services` no tiene columna `price`; OpenSpec
(`plans-and-memberships/spec.md:11-17`) exige descripción y precio. Un insert con
`price` da `PGRST204`.
**Pregunta:** ¿el precio de los servicios está en el alcance de la demo? Si **sí**
→ migración (columna + backfill), Zod, acción, presentación en `/offer` y `/plans`,
tipos. Si **no** → quitar la mención de OpenSpec o marcarla como fuera de alcance.

### D3 · BACK-012 — la alerta `low_attendance` no tiene generador
El enum, el umbral y la etiqueta de UI existen; no hay función, trigger, cron ni
modelo de «asistencia esperada» que la produzca. Feature inerte.
**Pregunta:** ¿`low_attendance` entra en la demo? Si **sí** → definir asistencia
esperada y momento de evaluación, generador idempotente con zona horaria y
destinatarios. Si **no** → documentarla como pospuesta.

### D4 · BACK-006 — el profesional no puede editar su ejercicio propio
`is_custom` no guarda propietario y la RLS de UPDATE es solo-admin; OpenSpec
(`exercise-library/spec.md:64`) dice que el profesional crea **y edita** los
suyos. Contradicción spec↔implementación.
**Pregunta:** ¿resolver a favor de OpenSpec (añadir `created_by`, permitir editar
al dueño) o de la implementación (OpenSpec se corrige, solo admin edita)?

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

### Batch 4 — Tras decisión de alcance (D1-D4)

| ID | Depende de | Trabajo si se acomete |
|---|---|---|
| **BACK-003** | D1 | Evento de trazabilidad en el camino manual, o revocar el `grant` y privatizar la función. |
| **BACK-006** | D4 | Columna `created_by` + backfill + RLS de UPDATE por dueño activo + cablear la ruta de edición para profesionales. |
| **BACK-011** | D2 | Migración `price` + Zod + acción + presentación + tipos. |
| **BACK-012** | D3 | Definición de asistencia esperada + generador idempotente + zona horaria + destinatarios + pruebas. |

### Pospuestos (sospechas, medir antes)

| ID | Motivo |
|---|---|
| **BACK-013** | Reordenamientos de plantillas/reglas no transaccionales. Solo revisión estática; no se forzó intercalado concurrente. Envolver `moveRule`/`moveTemplateItem` en una RPC con bloqueos cuando haya evidencia de carrera real. |
| **BACK-014** | FK sin índice. Introspección estática, sin carga representativa. Medir con `EXPLAIN (ANALYZE, BUFFERS)` y datos sintéticos antes de añadir índices. |

---

## Orden de ejecución propuesto

1. **Batch 2** primero (rápido, sin migración, sin RLS): BACK-009, BACK-010, BACK-008.
2. **Batch 1** (P0): BACK-001, luego BACK-002. Cada uno su migración + `db:reset` + regen de tipos + `test:rls` + `test:*` afectadas, en ventana coordinada de la base local.
3. **Batch 3**: BACK-004, BACK-005, BACK-007.
4. Responder D1-D4 → **Batch 4**.
5. Pospuestos solo si hay tiempo y evidencia.
