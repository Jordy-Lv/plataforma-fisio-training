# Tasks

## 1. Decisión y aviso al equipo

- [x] 1.1 Redactar `docs/adr/0010-especialidad-en-la-asignacion-de-rutinas.md` y registrarlo en `docs/adr/README.md` (ADR-0007 queda «superada en parte»). Verificación: el índice enlaza ADR-0010 y el archivo existe.
- [x] 1.2 Añadir en `docs/04-roles-y-permisos.md` que crear y confirmar un borrador exige la especialidad del tipo y una asignación de cuidado vigente de ese tipo, y que el admin está exento (ADR-0010). Verificación: la matriz y el texto citan ADR-0010 y no contradicen a ADR-0007 en lectura ni en edición.
- [x] 1.3 Avisar al equipo, antes de abrir el PR, de que la migración reescribe `public.finish_patient_onboarding` (slice 1) (`CLAUDE.md` §3). Verificación: el aviso queda enlazado en la descripción del PR. **Jordy confirmó el 2026-09-25 que el equipo ya está avisado.**

## 2. Migración `routines_manual_assignment`

- [ ] 2.1 Crear `supabase/migrations/<ts>_routines_manual_assignment.sql` con `private.copy_template_content` y `private.copy_routine_template` reescrita para usarla, sin cambiar su comportamiento (design D2.1). Verificación: `npm run db:reset` limpio, y `test:routines:snapshot`, `test:calendar` y `test:calendar:dates` pasan sin tocarlas.
- [ ] 2.2 Añadir `private.can_assign_routine_kind` y usarla en `public.copy_routine_template` (D2.5, D2.6). Verificación: `test:routines:snapshot` y `test:routines:items` siguen en verde, y un entrenador que copia una plantilla `physio` por RPC recibe `42501` (subtest nuevo en `test:routines`).
- [ ] 2.3 Archivar los borradores duplicados y crear `routines_one_draft_per_kind` (D2.8). Verificación: `db:reset` limpio, y un segundo `pending_review` del mismo paciente y tipo falla con `23505` (subtest).
- [ ] 2.4 Añadir `public.create_routine_draft`: autorización, registro completo, un borrador por tipo, copia en `pending_review` sin tocar la activa, exclusión de contraindicados con `notes`, y sin evento (D2.2). Verificación: subtests de `test:routines` para borrador creado, paciente sin acceso al borrador, activa y calendario intactos, contraindicado excluido, perfil sin terminar, doble envío y ausencia de alertas y eventos.
- [ ] 2.5 Añadir `public.discard_routine_draft`, que archiva (D2.3). Verificación: subtest «Descartar el borrador», con la activa intacta y el borrador fuera de las consultas del paciente y del profesional.
- [ ] 2.6 Añadir `public.confirm_routine_draft`, con día vacío rechazado nombrando el día, cierre de la activa, `starts_on`, `assigned_by` y evento `assigned` `source = 'manual'` (D2.4). Verificación: subtests de confirmación, reemplazo con sesiones conservadas, día vacío, días cortos devueltos en `short_days` y alerta solo para profesionales de ese tipo.
- [ ] 2.7 Añadir el trigger de guarda de activación (D2.7). Verificación: un `update … set status = 'active'` directo sobre un borrador, hecho como profesional a cargo, falla con `42501`; `test:calendar` (que cierra rutinas como profesional) sigue en verde.
- [ ] 2.8 Reescribir `public.finish_patient_onboarding` sin la llamada al motor (D2.9). Verificación: subtests «Registro terminado» y «Un perfil que antes coincidía con una regla», sin ninguna rutina ni evento, y `test:auth` en verde.
- [ ] 2.9 Especialidad por RPC directa en las tres funciones: entrenador con plantilla `physio`, profesional sin asignación vigente, paciente y anónimo rechazados; admin con los dos tipos aceptado. Verificación: los subtests de `specs/routine-assignment` «La especialidad limita…» pasan.
- [x] 2.10 Regenerar `lib/db/types.ts` con `npm run db:types` en el mismo commit que la migración. Verificación: `npm run typecheck` pasa y el diff de tipos solo trae las funciones nuevas o cambiadas.

## 3. Acciones y consultas del slice de rutinas

- [ ] 3.1 Añadir a `lib/routines/schemas.ts` `chooseTemplateSchema`, `routineDraftSchema` y el esquema de filtros de plantillas (`dias`, `nivel`, `entorno`, y `tipo` para el admin), con mensajes en español. Verificación: `npm run typecheck`; valores inválidos del filtro se ignoran, sin romper la página (subtest HTTP en 4.8).
- [ ] 3.2 Reescribir `lib/routines/assignment-actions.ts` con `createRoutineDraft`, `discardRoutineDraft` y `confirmRoutineDraft` según `CLAUDE.md` §5, con revalidación de `/pro/routines/<id>`, su calendario, `/routine` y `/routine/calendar`. Verificación: `npm run lint` y `npm run typecheck`; «Rutina asignada. El paciente ya puede consultarla.» sale literal.
- [ ] 3.3 Retirar `prepareAssignment` de `lib/routines/assignment.ts`, que deja de importar `evaluate-rules`. Verificación: `grep -r "evaluate-rules" lib/routines app/\(pro\)` no devuelve nada; `npm run build` pasa.
- [ ] 3.4 Crear `lib/routines/assignment-queries.ts` con la ficha del paciente y las plantillas activas del tipo con los `contraindications` de sus ejercicios en una sola consulta, con columnas enumeradas (D3). Verificación: revisión del diff sin `select("*")` ni consultas dentro de `map`; `npm run typecheck`.

## 4. Pantalla `/pro/routines/[patientId]` por pasos

- [ ] 4.1 Crear `components/routines/AssignmentSteps.tsx`, el indicador de tres pasos con `aria-current`, y la ficha breve del paciente. Verificación: `npm run test:design` y revisión a 375 px.
- [ ] 4.2 Crear `components/routines/TemplateChoice.tsx`: tarjeta con días por semana, objetivo, nivel, entorno y «se quitarán N ejercicios por …», y el formulario «Usar esta plantilla» con `templateId` oculto y `patientId` ligado con `.bind`, **sin `name="patientId"`** (D4). Verificación: el HTML del servidor del paso ① no contiene `name="patientId"` (subtest HTTP).
- [ ] 4.3 Filtros de plantillas con chips de enlace, sin `<form>`, y `?tipo=` para el admin (D4). Verificación: subtest HTTP de filtro, y un profesional nunca ve plantillas del otro tipo, ni forzando `?tipo=`.
- [ ] 4.4 Crear `components/routines/RoutineDraftBar.tsx` (sustituye a `AssignmentForm.tsx`): confirmar `id="assign-routine"` con `patientId` y `routineId` ocultos, `ConfirmSubmit` si reemplaza una activa o hay días cortos, el enlace de vuelta al calendario dentro del formulario, y el formulario de descartar después. Va **antes** de cualquier formulario de ejercicio. Verificación: en el paso ②, el primer `<form>` con `name="patientId"` es `#assign-routine` (subtest HTTP).
- [ ] 4.5 Extraer la rutina a `components/routines/RoutineEditor.tsx`: un solo nivel de tarjeta, días separados por borde, ejercicios en filas, quitar antes que prescripción y «Qué se excluyó». Verificación: `test:routines:items` pasa sin cambios.
- [ ] 4.6 Mostrar el buscador del catálogo solo con `?dia=` o `?item=`, y retirar `AddRoutineItemDayPicker`. Verificación: `test:routines:items` (las URLs contrato) pasa, y sin foco el HTML no contiene el buscador.
- [ ] 4.7 Reescribir `app/(pro)/pro/routines/[patientId]/page.tsx` con la tabla de pasos de D4, el aviso de la rutina del otro tipo, «Rutinas anteriores» en `<details>` sin formularios, el estado vacío sin plantillas y enlaces sin precarga (KAN-19). Borrar `components/routines/AssignmentForm.tsx`. Verificación: subtests HTTP de los escenarios de «La pantalla de rutina del paciente va por pasos».
- [ ] 4.8 Completar en `scripts/verify-routine-assignment.test.mjs` el recorrido HTTP completo (elegir → borrador invisible para el paciente → ajustar → confirmar con cuerpo `{}` → visible) y retirar los subtests del motor (D6). Verificación: `npm run test:routines` en verde.
- [ ] 4.9 Actualizar `docs/11-contratos-de-las-suites-http.md` §3 y §4 con las filas y frases de D5. Verificación: cada marcador nuevo lo usa al menos una suite.

## 5. Suites que asignan por la pantalla (contrato aprobado)

- [x] 5.1 Acordar con el usuario el contrato nuevo para `test:calendar` y `test:smoke`: un paso previo de elegir plantilla, con las mismas aserciones después (D5). Verificación: aprobación explícita anotada en este `tasks.md`. **Aprobado por Jordy el 2026-09-25.**
- [ ] 5.2 Añadir a `scripts/verify-calendar.test.mjs` el paso de elegir plantilla antes de `#assign-routine`, y retirar la regla que inserta (su plantilla sigue). Verificación: `npm run test:calendar` en verde.
- [ ] 5.3 Añadir a `scripts/verify-demo-smoke.test.mjs` el paso de elegir plantilla por especialidad (entrenamiento y rehabilitación), y retirar la regla. Verificación: `npm run test:smoke` en verde, con el contraindicado excluido.

## 6. Textos y documentación

- [ ] 6.1 Cambiar en `components/auth/PatientProfile.tsx` «Tu objetivo y tus condiciones deciden qué rutina se te asigna» por un texto que diga que tu profesional los usa para elegirla (slice 1, en el mismo aviso de 1.3). Mantener el prefijo contrato «Perfil actualizado.» de `lib/auth/onboarding-actions.ts`. Verificación: `test:auth:screens` y `test:smoke` en verde.
- [ ] 6.2 Actualizar `docs/03-motor-de-reglas.md` §«Estado de implementación»: la aplicación ya asigna a mano y el motor queda como legado hasta `retire-rules-engine`. Verificación: el texto no dice que el registro asigne rutina.
- [ ] 6.3 Registrar en `docs/07-plan-de-verificacion.md` la prueba «Asignación manual de rutina» con fecha y resultado, y cerrar en `docs/15` §F lo hecho. Anotar como deuda el camino directo `copy_routine_template` sin borrador (design, Risks). Verificación: las dos entradas enlazan este change.

## 7. Integración

- [ ] 7.1 Pasar los cinco checks de `CLAUDE.md` §11 (`typecheck`, `lint`, `test:design`, `build`, `db:reset`) más `test:routines`, `test:routines:items`, `test:routines:snapshot`, `test:routines:sessions`, `test:calendar`, `test:calendar:dates`, `test:smoke`, `test:auth` y `test:templates`. Verificación: todos en verde en la misma ejecución.
- [ ] 7.2 Recorrer el flujo en un teléfono real a 375 px: elegir, ajustar, confirmar como profesional; el paciente no ve el borrador y ve la rutina al confirmar. Verificación: anotado en `docs/07` con fecha.
