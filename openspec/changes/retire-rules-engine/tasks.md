# Tasks

## 1. Decisiones y aviso al equipo

- [ ] 1.1 Resolver con Jordy las preguntas P1–P9 de `design.md` y anotar cada respuesta, con fecha, en «Decisiones ratificadas». Si una respuesta cambia el alcance (P3 (b)/(c), P5 (b)), actualizar `proposal.md`, `specs/` y estas tareas antes de seguir. Verificación: ninguna pregunta queda sin respuesta en `design.md` y `npx -y @fission-ai/openspec@1 validate retire-rules-engine --strict` pasa.
- [ ] 1.2 Obtener la aprobación explícita de los contratos de suites que cambian (P8, `CLAUDE.md` §12): `test:templates`, `test:routines`, `docs/11` y, según P3, `test:routines:snapshot`, `test:routines:items` y `test:calendar`. Verificación: la aprobación queda anotada en esta casilla con fecha.
- [ ] 1.3 Avisar al equipo antes de abrir el PR (`CLAUDE.md` §3): slice 2 (catálogo), slice 3 (rutinas), slice 4 (`components/progress/AdminHome.tsx`), el menú compartido (`components/shell/nav-items.ts`), el comentario de `components/ui/ConfirmSubmit.tsx` y `CLAUDE.md`/`AGENTS.md`. Verificación: el aviso queda enlazado en la descripción del PR.

## 2. El catálogo deja de leer reglas (antes de la migración)

- [ ] 2.1 Quitar `listRulesUsingTemplate` y `RuleUsingTemplate` de `lib/catalog/template-queries.ts`, y la sección de reglas de `app/(admin)/templates/[id]/page.tsx` (líneas 151–261 de hoy). Verificación: `grep -rn "assignment_rules\|listRulesUsingTemplate" app components lib` no devuelve nada.
- [ ] 2.2 Reescribir los mensajes de `setTemplateActive` en `lib/catalog/template-actions.ts` sin reglas, conservando los prefijos «Plantilla activada» y «Plantilla desactivada» y el fragmento «rutinas ya asignadas siguen igual» (D2). Verificación: `test:templates` lee los tres literales.
- [ ] 2.3 Resolver en `deleteTemplate` la rama `23503` y los textos de eliminar de `components/catalog/TemplateForm.tsx` (líneas 183 y 199) según P5. Verificación: el subtest de eliminar de `test:templates`, reescrito según P5, pasa.
- [ ] 2.4 Reescribir los textos que citan el motor: `app/(admin)/templates/page.tsx` (64, 102), `app/(admin)/templates/[id]/page.tsx` (214, 480), `components/catalog/TemplateForm.tsx` (125), `components/catalog/ExerciseForm.tsx` (166) y `lib/catalog/exercise-actions.ts` (250, con el prefijo «Etiquetado clínico guardado» intacto), más los comentarios de `lib/catalog/template-schemas.ts` y `lib/catalog/template-status.ts`. Verificación: `grep -rni "motor de reglas\|motor de asignación\|regla" app/\(admin\)/templates app/\(admin\)/exercises components/catalog lib/catalog` solo devuelve usos que no hablan de reglas de asignación; `test:catalog:custom` y `test:templates` en verde.

## 3. Retirar el panel, el simulador y el motor en TypeScript

- [ ] 3.1 Borrar `app/(admin)/rules/**` (`page.tsx`, `error.tsx`, `loading.tsx`, `[id]/page.tsx`, `[id]/loading.tsx`, `new/page.tsx`, `simulador/page.tsx`) y, si P6 lo pide, añadir la redirección de `/rules/**` a `/templates`. Verificación: `GET /rules` y `GET /rules/simulador` como admin responden lo decidido en P6; `npm run test:design` en verde.
- [ ] 3.2 Borrar `components/catalog/RuleForm.tsx` y `components/catalog/RuleControls.tsx`. Verificación: `npm run typecheck`.
- [ ] 3.3 Borrar de `lib/catalog/` `rule-actions.ts`, `rule-list.ts`, `rule-queries.ts`, `rule-schemas.ts`, `rules-schema.ts`, `evaluate-rules.ts`, `describe-rule.ts`, `simulation.ts`, `simulation-schemas.ts` y `filter-contraindications.ts` (D3). Revisar si `lib/catalog/vocabulary.ts` o `equipment.ts` dejan exportaciones sin uso y quitarlas. Verificación: `grep -rn "evaluate-rules\|rules-schema\|rule-\(actions\|list\|queries\|schemas\)\|describe-rule\|simulation\|filter-contraindications" app components lib scripts` vacío; `npm run typecheck` y `npm run lint`.
- [ ] 3.4 Quitar «Asignación» de `catalogTabs` y el filtro del profesional en `components/shell/nav-items.ts`, y el acceso rápido (con el icono `Workflow`) de `components/progress/AdminHome.tsx`. Ajustar el comentario de `components/ui/ConfirmSubmit.tsx`. Verificación: `grep -rn '"/rules"' app components lib` vacío; el HTML de `/admin` y de `/exercises` como admin no contiene `href="/rules"`; `test:overview` y `test:auth:screens` en verde.

## 4. Semilla y suites

- [ ] 4.1 Borrar `scripts/seed-rules.ts`, `scripts/verify-rules-engine.test.mjs`, `scripts/verify-rules-seed.test.mjs` y `scripts/verify-rules-panel.test.mjs`, y sus entradas `seed:rules`, `test:rules`, `test:rules:seed` y `test:rules:panel` de `package.json`. Verificación: `grep -c '"test:' package.json` da 28 y `grep -rn "seed:rules\|test:rules" package.json scripts .github` vacío.
- [ ] 4.2 `scripts/verify-catalog-templates.test.mjs`: quitar los `delete from public.assignment_rules` (limpieza y «El admin elimina la plantilla entera»), el subtest «Desactivarla avisa de las reglas que se quedan sin plantilla» y ajustar «Una plantilla usada por una regla no se elimina» según P5 y el contrato aprobado en 1.2. Verificación: `npm run test:templates` en verde.
- [ ] 4.3 `scripts/verify-routine-assignment.test.mjs`: quitar la regla «Regla que ya no asigna» y su limpieza, la mención de la cabecera y el «aunque una regla coincida» del subtest de registro; añadir un subtest que llame como admin por API a `commit_routine_assignment` y `routine_assignment_context` y espere `PGRST202` sin rutinas, eventos ni alertas nuevas (D4). Verificación: `npm run test:routines` en verde.
- [ ] 4.4 Aplicar P3 a las suites que preparan datos con `copy_routine_template` (`test:routines`, `test:routines:snapshot`, `test:routines:items`, `test:calendar`), solo si P3 es (b) o (c). Verificación: las cuatro en verde; si P3 es (a), marcar esta casilla como «no aplica» con la fecha de la decisión.

## 5. Migración `routines_retire_rules_engine`

- [ ] 5.1 Crear `supabase/migrations/<ts>_routines_retire_rules_engine.sql` (`<ts>` posterior a `20260925120000`) con la cabecera en español y los `drop function` explícitos, sin `cascade`, en el orden de D1: `public.commit_routine_assignment(uuid, jsonb, uuid, uuid[], text)`, `private.assign_routine_from_rules(uuid, text, text)`, `public.routine_assignment_context(uuid)`, `private.routine_assignment_context(uuid)`, `public.resolve_assignment_winner(jsonb)` y `public.assignment_rule_matches(jsonb, jsonb)`. Verificación: `npm run db:reset` limpio.
- [ ] 5.2 Tratar los datos de `assignment_rules` según P1 y después `drop table public.assignment_rules`. Si se archivan, la tabla de archivo nace con `enable row level security` y sin políticas en la misma migración (`CLAUDE.md` §6). Verificación: `db:reset` limpio; si P1 es (b), las filas existen en el archivo y ningún rol `authenticated` o `anon` las lee por API.
- [ ] 5.3 Aplicar P2 y P4 si piden cambios de esquema o de datos (el `check` de `routine_assignment_events.outcome`, las alertas `no_match`, los borradores y calendarios que dejó el motor). Verificación: si P4 pide reparar, la consulta de detección de `design.md` devuelve cero filas después de la migración en una base con datos de prueba; si no piden nada, marcar «no aplica».
- [ ] 5.4 Terminar la migración con el bloque `do` de comprobación de D1. Verificación: `db:reset` limpio, y `select to_regclass('public.assignment_rules')` es nulo y no hay en `pg_proc` ninguna de las seis funciones.
- [ ] 5.5 Regenerar `lib/db/types.ts` con `npm run db:types` en el mismo commit que la migración. Verificación: el diff de tipos solo quita `assignment_rules` y las cuatro funciones públicas del motor (más lo que añadan P1–P4); `npm run typecheck` pasa.

## 6. CI y `verify.sh`

- [ ] 6.1 Quitar `npm run seed:rules` del paso «Sembrar datos iniciales» de `.github/workflows/ci.yml` y «reglas» de su comentario. Verificación: `grep -n "rules\|reglas" .github/workflows/ci.yml` vacío.
- [ ] 6.2 Comprobar que `scripts/verify.sh` no necesita cambios (deriva las suites de `package.json`). Verificación: `bash scripts/verify.sh --full` no lista ninguna `test:rules*`.

## 7. Documentación

- [ ] 7.1 `docs/11-contratos-de-las-suites-http.md`: quitar `verify-rules-panel` (§1), `test:rules:panel` (§2), las cuatro filas `/rules` (§3), las frases «Reglas:» (§4) y `/rules/{new,[id]}` del apartado de formularios largos; recontar «Dieciocho suites» de la introducción; registrar las frases de plantillas y de eliminar que cambien (2.2, 2.3). Verificación: cada marcador y frase que queda lo usa al menos una suite existente.
- [ ] 7.2 `docs/02-modelo-de-datos.md`: quitar `assignment_rules` del diagrama y su sección, y describir `routine_assignment_events` según P2. Verificación: `grep -n "assignment_rules" docs/02-modelo-de-datos.md` solo devuelve, si acaso, una nota histórica.
- [ ] 7.3 `docs/03-motor-de-reglas.md` §«Estado de implementación»: el motor ya no existe, con enlace a este change; renombrar el archivo o no según P9. Verificación: el texto no dice que nada del motor siga en el repositorio.
- [ ] 7.4 Ajustar `docs/04-roles-y-permisos.md` (línea 95, caso `no_match`, según P2 y P7), `docs/01-arquitectura.md` (80, 101), `docs/07-plan-de-verificacion.md` (nota en la fila 2 y en el recorrido del 2026-09-05), `docs/08-onboarding-equipo.md` (68, 160 y «RLS en las 21 tablas»), `docs/10-sistema-de-diseno.md` (102, 151), `docs/adr/README.md` (ADR-0003), `CLAUDE.md`/`AGENTS.md` §3 y `CLAUDE.md` §9 (el recuento «dieciocho suites», igual que en `docs/11`). En `docs/12`, `docs/14` y `docs/16`, solo una nota de que `/rules` se retiró. Verificación: `grep -rn "/rules\|seed:rules\|test:rules" docs CLAUDE.md AGENTS.md README.md` solo devuelve notas históricas.
- [ ] 7.5 `docs/15-pendiente-del-proyecto.md`: cerrar en §F `retire-rules-engine` y el fallo del calendario de `assign_routine_from_rules`, poner al día el recuento de suites (31 → 28) y la deuda de `copy_routine_template` según P3 (corrigiendo «tres suites» por las cuatro que la usan). Verificación: §F y «Dónde retomar» ya no listan este change como pendiente.

## 8. Integración

- [ ] 8.1 Pasar los cinco checks de `CLAUDE.md` §11: `npm run typecheck`, `npm run lint`, `npm run test:design`, `npm run build` y `npm run db:reset`. Verificación: todos en verde en la misma ejecución.
- [ ] 8.2 Con la base sembrada (`seed:exercises`, `seed:templates`, `seed:progress-demo`) y `next start` en el 3000: `test:templates`, `test:templates:seed`, `test:catalog`, `test:catalog:custom`, `test:routines`, `test:routines:items`, `test:routines:snapshot`, `test:routines:sessions`, `test:calendar`, `test:calendar:dates`, `test:auth`, `test:auth:screens`, `test:rls`, `test:overview` y `test:smoke`, más `npm run db:clean` antes y después. Verificación: todas en verde salvo `test:smoke`, que puede seguir en 7/11 solo por KAN-19; o `bash scripts/verify.sh --full` con el mismo resultado.
- [ ] 8.3 `npx -y @fission-ai/openspec@1 validate --all --strict`. Verificación: pasan todos los changes.
- [ ] 8.4 Escribir en la descripción del PR el orden de despliegue de `design.md` («Migration Plan»): aplicación primero, comprobar `/templates/[id]` en producción, después `supabase db push`. Verificación: el PR lo incluye y lo enlaza a `docs/15` A.2.
