# Design

## Context

El motivo está en `proposal.md` y los requisitos en `specs/`. Este documento reúne el
inventario **verificado con `grep` sobre `claude/gifted-bell-619sct` (`1fb991c`, 2026-09-26)**
de todo lo que pertenece al motor, separa lo que se retira de lo que nació con él y hoy usa
la asignación manual, y deja abiertas las decisiones que tiene que tomar Jordy.

### Inventario: base de datos

Ninguna migración existente se edita; todo se retira en una migración nueva.

| Objeto | Dónde nace (y se reescribe) | Quién lo usa hoy | Destino |
|---|---|---|---|
| Tabla `public.assignment_rules`, índice `assignment_rules_priority_idx`, FK `assignment_rules_template_id_fkey` (`on delete restrict`), políticas «admin y profesional leen reglas» y «admin escribe reglas» | `20260905030000_core_esquema_inicial` (líneas 161–174, 538, 714–723) | Panel `/rules`, `listRulesUsingTemplate` de `/templates/[id]`, `test:templates`, `test:routines`, `test:rules:*`, `seed:rules` | **Retirar** (datos: P1) |
| `public.commit_routine_assignment(uuid, jsonb, uuid, uuid[], text)` | `20260905190000`, reescrita en `20260906233000` y `20260910130000` | Nadie en `app/`, `lib/` ni `scripts/` | **Retirar** |
| `private.assign_routine_from_rules(uuid, text, text)` — con el fallo del calendario de `docs/15` §F | `20260910130000` | Solo `commit_routine_assignment` (desde `20260925120000` ya no la llama `finish_patient_onboarding`) | **Retirar** |
| `public.routine_assignment_context(uuid)` y `private.routine_assignment_context(uuid)` | `20260905190000`, partida en `20260910130000` | Solo el motor | **Retirar** |
| `public.resolve_assignment_winner(jsonb)` y `public.assignment_rule_matches(jsonb, jsonb)` | `20260906233000` | Solo el motor (revocadas a `authenticated`, pero aparecen en `lib/db/types.ts`) | **Retirar** |
| `public.routine_assignment_events`, su política y el trigger `routine_assignment_notify` (`public.notify_routine_assignment`) | `20260905190000` | `confirm_routine_draft` (evento `assigned`, `source = 'manual'`) y `public.record_manual_routine_assignment` | **Se queda.** Histórico de `no_match`/`pending_review`: P2 |
| Valor `routine_assignment` de `alert_type` | `20260905190000` | Aviso de asignación, `/pro/alerts`, `private.alert_specialty` | **Se queda** |
| Valor `pending_review` de `routine_status`, política restrictiva «paciente no lee propuestas pendientes», `public.can_read_routine` | `20260905190000` | Es el borrador de la asignación manual (D1 de `manual-routine-assignment`) | **Se queda** |
| `private.assignment_exclusions(uuid, uuid)` | `20260910130000` | `public.create_routine_draft` | **Se queda** |
| `private.copy_routine_template(uuid, uuid)` | `20260910130000`, reescrita en `20260911160000` y `20260925120000` | `public.copy_routine_template` (y el motor, que se va) | **Se queda**; su futuro va con P3 |
| `public.copy_routine_template(uuid, uuid)` y `public.record_manual_routine_assignment(uuid)` | `20260905180000`, `20260906234300`, reescrita en `20260910130000` y `20260925120000` | Cuatro suites preparan datos con ella (ver P3) | **Se queda**; deuda: P3 |
| `grant usage on schema private to authenticated` | `20260910130000` | Todas las funciones privadas vivas | **Se queda** |

`plpgsql` y las funciones `language sql` sin `begin atomic` no registran dependencias en
`pg_depend`: borrar la tabla no fallaría aunque quedara una función que la lee. Por eso la
migración borra **explícitamente** cada función antes que la tabla y comprueba al final que
no queda ninguna.

### Inventario: aplicación

| Ruta o archivo | Slice | Qué es | Destino |
|---|---|---|---|
| `app/(admin)/rules/page.tsx`, `error.tsx`, `loading.tsx`, `[id]/page.tsx`, `[id]/loading.tsx`, `new/page.tsx`, `simulador/page.tsx` | 2 | Panel y simulador | **Borrar** (respuesta de `/rules` tras borrar: P6) |
| `components/catalog/RuleForm.tsx`, `components/catalog/RuleControls.tsx` | 2 | Formularios del panel | **Borrar** |
| `lib/catalog/rule-actions.ts`, `rule-list.ts`, `rule-queries.ts`, `rule-schemas.ts`, `rules-schema.ts`, `evaluate-rules.ts`, `describe-rule.ts`, `simulation.ts`, `simulation-schemas.ts`, `filter-contraindications.ts` | 2 | Motor en TypeScript, panel y simulador. Ningún otro módulo los importa (comprobado); `filter-contraindications.ts` solo lo usan el simulador, `evaluate-rules.ts` y `test:rules` | **Borrar** |
| `lib/catalog/template-queries.ts` (`listRulesUsingTemplate`, `RuleUsingTemplate`) | 2 | **Dependencia viva**: lee `assignment_rules` | Quitar |
| `lib/catalog/template-actions.ts` (`setTemplateActive`, `deleteTemplate`) | 2 | **Dependencia viva**: reglas huérfanas al desactivar; `23503` de la FK de reglas al eliminar; «El motor de reglas ya puede asignarla» | Reescribir mensajes (prefijos contrato intactos); P5 |
| `app/(admin)/templates/[id]/page.tsx` (líneas 151–261, 214, 480), `app/(admin)/templates/page.tsx` (64, 102), `components/catalog/TemplateForm.tsx` (125, 183, 199) | 2 | **Dependencia viva** y textos del motor | Quitar la sección de reglas; reescribir textos |
| `lib/catalog/exercise-actions.ts:250`, `components/catalog/ExerciseForm.tsx:166` | 2 | Textos «El motor de reglas excluirá…» | Reescribir, conservando el prefijo «Etiquetado clínico guardado» |
| `lib/catalog/template-schemas.ts:16`, `lib/catalog/template-status.ts:11` | 2 | Comentarios | Reescribir |
| `lib/catalog/vocabulary.ts`, `equipment.ts`, `body-parts.ts` | 2 | Vocabulario compartido con registro, plantillas y rutinas | **Se quedan**; revisar exportaciones que queden sin uso |
| `components/shell/nav-items.ts` (`catalogTabs`, filtro del profesional) | compartido (shell) | Pestaña «Asignación» | Quitar |
| `components/progress/AdminHome.tsx:189` (y el icono `Workflow`) | 4 | Acceso rápido «Asignación» | Quitar |
| `components/ui/ConfirmSubmit.tsx:27` | compartido (`components/ui`) | Comentario «…una regla…» | Ajustar solo el comentario, con aviso |
| `lib/db/types.ts` | generado | `assignment_rules` y las cuatro funciones públicas del motor | Regenerar |

Comprobado que **no** dependen del motor: `middleware.ts`, `lib/shared/**`, `lib/supabase/**`,
`lib/auth/**` (el registro ya no llama a ninguna RPC del motor), `/pro/alerts` (solo rotula el
tipo `routine_assignment`) y `supabase/seed.sql`.

### Inventario: scripts, CI y documentación

- **Semilla y suites que se van:** `scripts/seed-rules.ts` (`seed:rules`),
  `scripts/verify-rules-engine.test.mjs` (`test:rules`, sin base de datos),
  `scripts/verify-rules-seed.test.mjs` (`test:rules:seed`, HTTP) y
  `scripts/verify-rules-panel.test.mjs` (`test:rules:panel`, HTTP). Cuatro entradas de
  `package.json`.
- **Suites vivas que usan reglas:** `verify-catalog-templates.test.mjs` (`test:templates`:
  limpieza en `t.after`, subtests «Desactivarla avisa de las reglas que se quedan sin
  plantilla» y «Una plantilla usada por una regla no se elimina», y el `delete` previo de «El
  admin elimina la plantilla entera») y `verify-routine-assignment.test.mjs`
  (`test:routines`: inserta «Regla que ya no asigna» para el subtest «Terminar el registro no
  asigna rutina, aunque una regla coincida», y la borra en `t.after`).
- **`.github/workflows/ci.yml`**, job «Pruebas funcionales»: `npm run seed:rules` en «Sembrar
  datos iniciales» y el comentario que lo anuncia.
- **`scripts/verify.sh`**: no nombra ninguna suite; deriva la lista de `package.json`. Quitar
  las entradas basta. `scripts/check-db-clean.mjs` no mira reglas.
- **Documentación:** `docs/11` (§1 «`verify-rules-panel`», §2 la nota de `test:rules:panel`,
  §3 las cuatro filas `/rules`, «Frases» → «Reglas:» y las de plantillas que cambien, el
  apartado de formularios largos `/rules/{new,[id]}`, y el recuento «Dieciocho suites» de la
  introducción, que hay que recontar), `docs/02` (diagrama y sección `assignment_rules (legado)`),
  `docs/03` («Estado de implementación»), `docs/04:95` (el caso `no_match`), `docs/01:80,101`,
  `docs/07` (fila 2 histórica y el recorrido del 2026-09-05), `docs/08:68,160` y «RLS en las
  21 tablas», `docs/10:102,151`, `docs/15` (§F, recuento de suites, deuda de
  `copy_routine_template`), `docs/adr/README.md` (ADR-0003), `CLAUDE.md` y `AGENTS.md` §3
  («catalog/ — ejercicios, plantillas, reglas») y `CLAUDE.md` §9 («dieciocho suites»). Registros históricos que no se reescriben:
  `docs/12`, `docs/14`, `docs/16`, `qa-backend-*`, los `tasks.md` cerrados y
  `openspec/changes/add-routine-execution/verification.md`.

## Goals / Non-Goals

**Goals:**

- Que no quede en la base, en la API ni en la interfaz ninguna vía que elija o asigne una
  rutina por reglas, ni ningún texto que lo prometa.
- Que la asignación manual, el calendario, las alertas y el catálogo sigan exactamente
  igual: las mismas suites en verde, con los contratos cambiados solo donde se aprueben.
- Que `npm run db:reset` pase limpio y que borrar la tabla no deje funciones que fallen al
  ejecutarse.

**Non-Goals:**

- Tocar `routine_assignment_events`, `pending_review`, sus políticas o
  `private.assignment_exclusions`, que hoy son de la asignación manual.
- Cambiar la asignación manual (`create_routine_draft`, `confirm_routine_draft`,
  `discard_routine_draft`) o su pantalla.
- Decidir por Jordy las preguntas P1–P9 de abajo. Mientras no estén respondidas, las tareas
  que dependen de ellas no se empiezan.
- KAN-19: sigue siendo de su propio change.

## Decisions

Solo lo que no depende de las preguntas abiertas.

### D1. Una migración de retirada, con `drop` explícitos y sin `cascade`

`supabase/migrations/<ts>_routines_retire_rules_engine.sql`, con `<ts>` posterior a
`20260925120000`. Lleva el prefijo `routines` porque las seis funciones son de ese slice;
la tabla es del catálogo, así que se avisa a los dos. Orden:

1. Funciones, de quien llama a quien es llamado: `public.commit_routine_assignment`,
   `private.assign_routine_from_rules`, `public.routine_assignment_context`,
   `private.routine_assignment_context`, `public.resolve_assignment_winner`,
   `public.assignment_rule_matches`. Cada una con su firma completa.
2. El tratamiento de los datos de `assignment_rules` que se decida en P1.
3. `drop table public.assignment_rules;` (se llevan su índice, su FK y sus dos políticas).
4. Lo que se decida en P2 y P4, si algo.
5. Una comprobación final en un bloque `do` que falle si queda en `pg_proc` alguna de esas
   funciones o si `to_regclass('public.assignment_rules')` no es nulo.

Sin `cascade`: si algo inesperado depende de un objeto, la migración debe romperse en
`db:reset`, no llevárselo por delante. Cabecera en español con qué se retira, qué se queda y
por qué (el cuadro de arriba, resumido).

*Alternativa descartada:* dejar la tabla y borrar solo el código. No retira nada que moleste y
deja la FK que hoy decide, por accidente, qué plantillas se pueden eliminar (P5).

### D2. La aplicación deja de leer la tabla antes de que la tabla desaparezca

`/templates/[id]` llama a `listRulesUsingTemplate` al pintarse y `setTemplateActive` al
desactivar: con la tabla borrada y la aplicación antigua desplegada, esa pantalla caería en su
`error.tsx`. Por eso el orden de despliegue es **aplicación primero, migración después**
(«Migration Plan»), y el código nuevo no puede leer `assignment_rules` en ningún sitio.

Los mensajes de plantillas y ejercicios cambian de redacción, pero conservan lo que leen las
suites (`docs/11` §4): los prefijos «Plantilla activada», «Plantilla desactivada»,
«Etiquetado clínico guardado» y el fragmento «rutinas ya asignadas siguen igual».

### D3. Se borra el motor en TypeScript entero

Los diez módulos de `lib/catalog/` del inventario, los dos componentes y las siete rutas. No
se conserva `filter-contraindications.ts` «por si acaso»: la exclusión vigente la hace la
base (`private.assignment_exclusions`), y dos implementaciones de la misma regla clínica
podrían divergir sin que nadie lo note.

### D4. Las suites

- Salen `test:rules`, `test:rules:seed` y `test:rules:panel`: prueban algo que deja de
  existir. Sus casos del filtro de contraindicaciones ya los cubre `test:routines` («Elegir
  crea un borrador…», «Un día vacío bloquea…»).
- `test:routines`: sale la inserción de la regla y su limpieza; el subtest de registro se
  queda sin «aunque una regla coincida». Se añade uno que llama por API, como admin, a
  `commit_routine_assignment` y `routine_assignment_context` y espera que no existan
  (PostgREST responde `PGRST202`), sin crear ninguna rutina.
- `test:templates`: sale la limpieza de reglas y el subtest de reglas huérfanas; el de
  eliminar depende de P5.
- Todo cambio de contrato se aprueba antes (`CLAUDE.md` §12; P8) y entra en `docs/11` en el
  mismo PR.

### D5. CI y `verify.sh`

`ci.yml` deja de correr `npm run seed:rules`. `verify.sh` no se toca: lee los `test:*` de
`package.json`. Se comprueba corriendo `bash scripts/verify.sh --full` y viendo que no
aparece ninguna `test:rules*`.

## Preguntas abiertas (las decide Jordy)

Ninguna se resuelve en este change hasta que Jordy responda. Las respuestas se anotan abajo,
en «Decisiones ratificadas», con fecha.

**P1. ¿Qué se hace con los datos de `assignment_rules`?** En producción están al menos las seis
reglas de `seed:rules` (`docs/07`, recorrido del 2026-09-05), quizá editadas por el equipo.
Los eventos antiguos guardan `rule_id` en `payload`, sin FK, así que no se rompen.
- (a) Borrarlas con la tabla.
- (b) Archivarlas antes: copiarlas a una tabla sin acceso desde la API (p. ej. en `private`,
  con RLS activo y sin políticas) o volcarlas a un archivo fuera de la base.
- (c) Conservar la tabla sin uso y retirar solo el código (descartada en D1, pero es
  decisión de Jordy).

**P2. ¿Qué pasa con el historial que dejó el motor?** `routine_assignment_events` admite
`outcome in ('assigned', 'pending_review', 'no_match')`, y el motor dejó filas de los tres
con `rule_id` en `payload`, más alertas con «No hay una regla compatible…» en las bandejas.
- (a) Dejarlo todo como histórico; el `check` sigue admitiendo los tres valores.
- (b) Restringir el `check` a `assigned` para las filas nuevas (`not valid`), conservando
  las viejas.
- (c) Además, marcar como leídas o retirar las alertas `no_match` antiguas.
- `docs/04:95` describe el caso `no_match`: se reescribe según lo que se decida.

**P3. ¿Qué se hace con `public.copy_routine_template`?** Es la única vía que sigue creando una
rutina **activa** sin borrador ni exclusión de contraindicados (solo comprueba ADR-0010).
`docs/15` §F dice que la usan tres suites; son **cuatro**: `test:routines:snapshot`,
`test:routines:items`, `test:calendar` y también `test:routines` (rechazo por especialidad y
el subtest «BACK-003»). Al irse el motor, `private.copy_routine_template` se queda con un solo
llamador.
- (a) Dejarla como deuda, fuera de este change (lo que da por hecho `proposal.md`).
- (b) Quitarla de la API (`revoke execute … from authenticated`) y que las suites preparen
  datos por SQL directo o con `create_routine_draft` + `confirm_routine_draft`.
- (c) Reescribir las cuatro suites sobre el borrador y borrarla junto con
  `private.copy_routine_template` y `record_manual_routine_assignment`.
- (b) y (c) cambian contratos de cuatro suites y añadirían un delta a `routine-assignment`.

**P4. ¿Se reparan los datos que el motor dejó en producción?**
- Rutinas `pending_review` del motor (días cortos): hoy se ven como «Borrador» y se pueden
  confirmar o descartar (D1 de `manual-routine-assignment`). ¿Se dejan así o se archivan en
  la migración?
- Rutinas que el motor «restauró» con el calendario ya cancelado por
  `closed_routine_cancels_calendar`: retirar el motor evita casos nuevos, no arregla los
  viejos. ¿Se detectan primero con una consulta de solo lectura (rutina `active` con
  `routine_schedules` futuros cancelados en el mismo instante que un evento `pending_review`
  del mismo paciente) y se decide con el número delante, se reparan en la migración, o se
  acepta y se avisa al profesional?

**P5. ¿Se puede eliminar una plantilla de la que salieron rutinas?** Hoy lo único que impide
eliminar una plantilla es la FK `on delete restrict` de `assignment_rules`, y solo si una regla
la usa. `routines.source_template_id` es `on delete set null`: sin reglas, cualquier plantilla
se puede eliminar aunque haya rutinas o borradores copiados de ella, que perderían la
«Trazabilidad del origen» que exige `routine-assignment`.
- (a) Aceptarlo: la copia sobrevive y la pantalla ya ofrece desactivar.
- (b) Bloquear el borrado si alguna rutina la cita (comprobación en la acción, o en la base
  con otra FK o un trigger, lo que añadiría un delta a `routine-templates`).
- Afecta al subtest «Una plantilla usada por una regla no se elimina», a la frase contrato
  «Desactívala en lugar de eliminarla» y a los textos de `TemplateForm.tsx`.

**P6. ¿Qué responde `/rules` después?** Con las rutas borradas, Next responde 404. La otra
opción es redirigir `/rules/**` a `/templates` para enlaces guardados.

**P7. ¿Queda algo de asignación automática al terminar el registro?** Comprobado que no:
`finish_patient_onboarding` no llama al motor desde `20260925120000`, `lib/auth/**` no llama a
ninguna RPC del motor y `private.assign_routine_from_rules` —que admite como actor al propio
paciente— no la expone PostgREST y se borra aquí. Lo que sí desaparece del todo es la alerta
`no_match`, que era el único aviso de «paciente sin rutina». ¿Se confirma que no se quiere
ningún aviso al terminar el registro (Non-Goal de `manual-routine-assignment`) o se abre otro
change para él?

**P8. Aprobación de contratos de suites.** No es una duda de diseño sino el permiso que pide
`CLAUDE.md` §12: `test:templates` pierde un subtest (dos con P5) y cambia frases leídas;
`test:routines` pierde la regla y gana un subtest; `docs/11` pierde las filas de `/rules` y las
frases «Reglas:». Si P3 es (b) o (c), cambian además `test:routines:snapshot`,
`test:routines:items` y `test:calendar`.

**P9. Detalles menores.** ¿Se renombra `docs/03-motor-de-reglas.md` (su contenido ya es la
asignación manual, pero el nombre lo enlazan `README.md`, `docs/01`, `docs/02` y varios ADR) o
se conserva? ¿Se anota el cierre en ADR-0009 o basta con `docs/adr/README.md`?

### Decisiones ratificadas

*(vacío hasta que Jordy responda P1–P9)*

## Risks / Trade-offs

- **[Riesgo] Borrar la tabla con la aplicación antigua desplegada rompe `/templates/[id]`.**
  → Aplicación primero, migración después (D2), y un `grep` de `assignment_rules` sobre
  `app/`, `components/` y `lib/` vacío antes de abrir el PR.
- **[Riesgo] Una función que lea la tabla sobrevive y falla al ejecutarse**, porque `plpgsql`
  no registra dependencias. → Borrado explícito y comprobación final en la migración (D1).
- **[Riesgo] Quitar la FK cambia qué plantillas se pueden eliminar.** → P5, antes de la
  migración.
- **[Trade-off] Se pierde el simulador**, que servía para enseñar el criterio clínico en la
  demo. → ADR-0009 lo saca del flujo requerido; la ficha del paciente y los filtros de
  plantillas son la herramienta vigente.
- **[Riesgo] Tocar zonas de otros slices y compartidas** (menú, `AdminHome`, `ConfirmSubmit`,
  `CLAUDE.md`). → Cambios mínimos y aviso al equipo antes del PR.
- **[Trade-off] Sin marcha atrás de datos si P1 es (a).** → Por eso P1 se decide antes.

## Migration Plan

1. Responder P1–P9 y aprobar los contratos (P8).
2. En una rama: el código (sin lecturas de la tabla), las suites y la documentación; después la
   migración, `npm run db:reset` limpio y `npm run db:types` en el mismo commit.
3. Despliegue: **primero la aplicación** (`railway up` desde un árbol limpio, `docs/15` A.2),
   comprobar `/templates/[id]` en producción, y **después** `supabase db push`. Con la
   aplicación nueva y la base vieja no hay ventana rota: la aplicación ya no lee nada del
   motor.
4. Reversión: una migración nueva que recree la tabla (desde el archivo de P1 si se
   archivó) y las funciones con el cuerpo de `20260910130000`, más revertir el commit de la
   aplicación. No se recuperan las reglas si P1 fue (a).
5. OpenSpec: este change solo se puede archivar después de `add-exercise-library-and-rules`,
   `improve-frontend-ux`, `add-auth-and-roles`, `add-routine-execution`,
   `simplify-navigation-and-panel` y `manual-routine-assignment`, que crean en
   `openspec/specs/` los requisitos que estos deltas retiran o modifican.
