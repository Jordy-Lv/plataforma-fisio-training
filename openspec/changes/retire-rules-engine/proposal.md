# Proposal

## Why

[ADR-0009](../../../docs/adr/0009-asignacion-manual-de-rutinas.md) sustituyó la asignación
automática por reglas por la asignación manual con borrador, y el change
[`manual-routine-assignment`](../manual-routine-assignment/proposal.md) ya la implementó
(migración `20260925120000`): terminar el registro no asigna nada y `/pro/routines/[patientId]`
no evalúa reglas. Pero el motor sigue entero en el repositorio como **código legado que la
aplicación ya no invoca** (`docs/03` §«Estado de implementación», `docs/15` §F):

- la tabla `assignment_rules`, seis funciones SQL del motor (cuatro públicas y dos privadas) y sus permisos;
- el panel `/rules`, el simulador y su entrada «Asignación» en el menú y en el panel del
  administrador, que el admin puede seguir usando sin que cambie nada;
- `seed:rules`, que la CI sigue sembrando, y tres suites `test:rules*`.

Mantenerlo tiene coste: un panel que promete algo que ya no ocurre, textos de plantillas y
ejercicios que siguen hablando del «motor de reglas», un fallo conocido y sin arreglar a
propósito en `private.assign_routine_from_rules` (restaurar una rutina cerrada no recupera su
calendario) y dos suites vivas (`test:templates`, `test:routines`) que insertan reglas para
preparar datos.

## What Changes

- **BREAKING** — Se retira el panel de reglas: `/rules`, `/rules/new`, `/rules/[id]` y
  `/rules/simulador` dejan de existir, y «Asignación» desaparece de las pestañas de
  «Catálogo» y de los accesos rápidos del panel del administrador.
- **BREAKING** — Una migración nueva retira `assignment_rules` y las funciones del motor
  (`commit_routine_assignment`, `routine_assignment_context` pública y privada,
  `assign_routine_from_rules`, `resolve_assignment_winner`, `assignment_rule_matches`). Con
  ello desaparece también el fallo del calendario de `assign_routine_from_rules`. No se edita
  ninguna migración existente. Qué pasa con los datos de las reglas lo decide Jordy
  (`design.md`, P1).
- Se conserva todo lo que nació con el motor y hoy usa la asignación manual: el registro de
  asignaciones y su aviso, el estado `pending_review` (el borrador), la política que se lo
  oculta al paciente y la exclusión de contraindicados.
- `/templates` y `/templates/[id]` dejan de consultar reglas: sin la sección «reglas que la
  usan», sin el aviso de reglas huérfanas al desactivar y con textos que describen la
  elección manual. Los prefijos de las frases contrato se conservan.
- Se borran `lib/catalog/` del motor (evaluación, esquema de condiciones, simulador, panel),
  `components/catalog/RuleForm.tsx` y `RuleControls.tsx`, `scripts/seed-rules.ts` y las
  suites `test:rules`, `test:rules:seed` y `test:rules:panel`.
- `test:templates` y `test:routines` dejan de insertar reglas; `test:routines` comprueba que
  las RPC del motor ya no existen. Los contratos que cambian se aprueban antes (`CLAUDE.md`
  §12) y se registran en `docs/11`.
- La CI deja de correr `seed:rules`. `scripts/verify.sh` no cambia: lee las suites de
  `package.json`.

**Fuera de este change, salvo que Jordy decida lo contrario (`design.md`):** cerrar la deuda
de `public.copy_routine_template` (P3), endurecer el `check` de
`routine_assignment_events.outcome` (P2) y reparar datos que el motor dejó en producción
(P4). Quedan como preguntas abiertas, no como alcance decidido.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

`openspec/specs/` sigue vacío: ningún change se ha archivado. Estos deltas se escriben contra
las capacidades que definen los changes abiertos, y solo se podrán archivar después de ellos
(ver `design.md`, «Migration Plan»).

- `assignment-rules` (de `add-exercise-library-and-rules` e `improve-frontend-ux`): se
  retiran sus ocho requisitos. La exclusión de contraindicados ya la cubre
  `routine-assignment` desde `manual-routine-assignment`.
- `routine-assignment`: se añade que ninguna vía, ni la interfaz ni la API, elige o asigna
  una rutina evaluando reglas.
- `routine-templates`: la definición y la desactivación de plantillas dejan de hablar de
  reglas.
- `exercise-library`: el etiquetado clínico deja de describirse como insumo de «asignaciones
  automáticas».
- `patient-onboarding`: el perfil ya no alimenta a un motor, y sale el escenario que
  mencionaba `assignment_rules`.
- `user-auth`: el menú ya no tiene «Asignación» en ningún rol.

## Impact

- **Base de datos:** una migración nueva (`<ts>_routines_retire_rules_engine.sql`) con `drop`
  explícitos, sin `cascade`. `lib/db/types.ts` regenerado en el mismo PR.
- **Slices y zonas compartidas** (`CLAUDE.md` §3), a avisar antes del PR:
  - slice 2 (catálogo): `app/(admin)/rules/**`, `app/(admin)/templates/**`,
    `components/catalog/*`, `lib/catalog/*`, `scripts/seed-rules.ts`,
    `scripts/verify-rules-*.test.mjs`, `scripts/verify-catalog-templates.test.mjs`;
  - slice 3 (rutinas): las funciones SQL del motor y `scripts/verify-routine-assignment.test.mjs`;
  - slice 4 (seguimiento): `components/progress/AdminHome.tsx` (acceso rápido «Asignación»);
  - compartido: `components/shell/nav-items.ts` (menú), el comentario de
    `components/ui/ConfirmSubmit.tsx`, `CLAUDE.md` y `AGENTS.md` (§3 dice «catalog/ —
    ejercicios, plantillas, reglas»), `package.json` y `.github/workflows/ci.yml`.
- **Dependencias vivas que hay que cortar antes de borrar la tabla:** `/templates/[id]` y
  `setTemplateActive` leen `assignment_rules` (`listRulesUsingTemplate`); `deleteTemplate`
  traduce el `23503` de la FK de las reglas; `test:templates` y `test:routines` insertan
  reglas; la CI siembra `seed:rules`.
- **Pruebas:** salen tres suites (31 → 28 comandos `test:*`). Deben seguir en verde
  `test:templates`, `test:templates:seed`, `test:routines`, `test:routines:items`,
  `test:routines:snapshot`, `test:routines:sessions`, `test:calendar`,
  `test:calendar:dates`, `test:auth`, `test:rls`, `test:catalog:custom`, `test:smoke` (salvo
  KAN-19) y los cinco checks de `CLAUDE.md` §11.
- **Documentación:** `docs/11`, `docs/02`, `docs/03`, `docs/04`, `docs/01`, `docs/07`,
  `docs/08`, `docs/10`, `docs/15`, `docs/adr/README.md`; nota breve en los registros
  históricos (`docs/12`, `docs/14`, `docs/16`).
- **Sin dependencias nuevas.**
