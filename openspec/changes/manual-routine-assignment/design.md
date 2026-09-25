# Design

## Context

El motivo está en `proposal.md`, y los requisitos en `specs/`. Estado actual que condiciona el
diseño:

- **Asignación hoy.** `public.commit_routine_assignment` y `public.finish_patient_onboarding`
  entran por `private.assign_routine_from_rules` (migración `20260910130000`), que resuelve la
  regla ganadora, copia con `private.copy_routine_template` y quita los contraindicados con
  `private.assignment_exclusions`.
- **Camino manual directo.** `public.copy_routine_template` (BACK-003) copia una plantilla
  **activa en el acto** y registra un evento `assigned`. No excluye contraindicados ni mira la
  especialidad. Tres suites lo usan para preparar datos: `test:routines:snapshot`,
  `test:routines:items` y `test:calendar`.
- **`private.copy_routine_template` cierra la rutina activa del mismo tipo** antes de copiar,
  y el trigger `closed_routine_cancels_calendar` cancela el calendario de la rutina que se
  cierra. Por eso un borrador **no puede** crearse con esa función y «restaurar» después la
  anterior (que es lo que hace hoy el camino de reglas con `pending_review`): se perderían las
  sesiones programadas del paciente.
- **Reglas de acceso.** `pending_review` ya lo oculta al paciente la política «paciente no lee
  propuestas pendientes» y `can_read_routine`. La política de `update` de `routines` deja que
  el admin o un profesional a cargo cambien `status` directamente.
- **La pantalla.** Los formularios de ejercicio (`RoutineItems.tsx`) llevan
  `name="patientId"` oculto. Hoy el formulario de asignar gana el marcador de `test:routines`
  porque va primero. `docs/11` §1: «gana el primero».
- **Otras dos suites asignan por la pantalla**, no solo `test:routines`:
  - `test:calendar` entra por el enlace `data-calendar-create`, envía el formulario
    `id="assign-routine"` y lee el enlace de vuelta dentro de `#assign-routine`.
  - `test:smoke` envía `{}` al marcador `name="patientId"`.

## Goals / Non-Goals

**Goals:**

- Un borrador se crea, se ajusta y se confirma sin tocar la rutina activa ni el calendario del
  paciente hasta confirmar.
- La especialidad (ADR-0010) y la exclusión de contraindicados se cumplen en la base de
  datos, no solo en la interfaz.
- Conservar los contratos de `docs/11` que siguen teniendo sentido: `?dia=`, `?item=`,
  quitar antes que prescripción, `id="assign-routine"` y la frase «Rutina asignada. El
  paciente ya puede consultarla».

**Non-Goals:**

- Borrar `assignment_rules`, `commit_routine_assignment`, `assign_routine_from_rules`,
  `resolve_assignment_winner`, `/rules`, el simulador o `seed:rules`: quedan para
  `retire-rules-engine`. Este change solo deja de invocarlos desde la aplicación.
- Restringir la edición de ejercicios por especialidad (ADR-0010 la deja abierta).
- Avisar al profesional cuando un paciente termina el registro. Hoy tampoco hay aviso fuera
  del caso `no_match`; el listado de `/pro/routines` ya distingue a quien no tiene rutina
  activa. Si hace falta, será otro change.
- Cerrar el hueco existente de que un profesional a cargo pueda insertar una fila en
  `routines` directamente (política de `insert`). No lo agrava este change.

## Decisions

### D1. El borrador es `pending_review`, con el rótulo «Borrador»

Se reutiliza el estado, no se crea `draft`. La lectura del paciente ya lo excluye en todas
las consultas y no hay que tocar el enum, las políticas ni `can_read_routine`.

*Alternativa:* un valor `draft` nuevo. Exigiría repasar cada política y consulta que filtra
por estado, sin ganar nada que el paciente pueda notar.

*Consecuencia:* las filas `pending_review` que dejó el motor de reglas (días cortos) se verán
como «Borrador» y se podrán confirmar o descartar. Es coherente: significan lo mismo,
«preparada y no visible».

### D2. Una migración nueva del slice de rutinas

`supabase/migrations/<ts>_routines_manual_assignment.sql`. No se edita ninguna migración
existente. Contenido:

1. **`private.copy_template_content(target_routine uuid, template_id uuid)`**: el bucle que
   copia días y ejercicios, extraído de `private.copy_routine_template`. Esta última se
   reescribe (`create or replace`) para usarla, **sin cambiar su comportamiento**: sigue
   cerrando la activa, con la fecha de America/Bogota y los mismos mensajes.
2. **`public.create_routine_draft(target_patient uuid, template_id uuid) returns uuid`**,
   `security definer`, `search_path = ''`:
   - Comprueba el actor con `private.can_assign_routine_kind`, que la plantilla está activa y
     que el paciente está activo y con el registro completo (`onboarding_step = 3`).
   - Toma `pg_advisory_xact_lock` por paciente, la misma clave que la copia.
   - Si ya hay un borrador de ese tipo, falla con `22023` y un mensaje accionable.
   - Inserta la rutina en `pending_review` con `assigned_by = null`, sin tocar la activa.
   - Copia el contenido con `copy_template_content`.
   - Borra los contraindicados que da `private.assignment_exclusions`.
   - Escribe en `notes` los nombres de los ejercicios quitados y la condición de cada uno.
   - No registra ningún evento.
3. **`public.discard_routine_draft(target_routine uuid)`**: misma autorización, solo sobre
   `pending_review`. Pasa el borrador a `archived`, no lo borra: conserva la traza y evita
   que la cascada se lleve eventos antiguos del motor.
4. **`public.confirm_routine_draft(target_routine uuid) returns jsonb`**:
   - Misma autorización, con la especialidad comprobada contra `routines.kind`.
   - Rechaza con `22023` si algún día no tiene ejercicios, nombrando el día.
   - Cierra como `completed` la activa del mismo tipo, con la fecha de hoy en Bogotá.
   - Activa el borrador con `starts_on` = hoy y `assigned_by = auth.uid()`.
   - Inserta en `routine_assignment_events` un evento `assigned` con
     `payload.source = 'manual'`. El trigger existente avisa a los profesionales de ese tipo.
   - Devuelve `{routine_id, short_days}`.
5. **`private.can_assign_routine_kind(target_patient uuid, kind professional_specialty)`**
   (ADR-0010): devuelve verdadero si el actor está activo y además es `is_admin()`, o es un
   profesional con `specialty = kind` y una `care_assignments` vigente sobre el paciente de
   ese `kind`.
6. **`public.copy_routine_template`** se reescribe para exigir también
   `can_assign_routine_kind` sobre el tipo de la plantilla. Es el único cambio: el camino
   directo sigue existiendo para las suites que preparan datos con él, pero ya no se salta
   ADR-0010.
7. **Guarda de activación.** Un trigger `before update of status on routines` rechaza con
   `42501` que un borrador pase de `pending_review` a `active` cuando
   `current_user = 'authenticated'`, es decir, fuera de una función `security definer`. Es el
   mismo recurso que ya usa BACK-003. Cerrar una rutina (`completed`) sigue permitido, como
   exige `test:calendar`.
8. **Un borrador por tipo.** Antes de crear el índice, se archivan los borradores duplicados
   que existan y se conserva el más reciente por paciente y tipo. Después se crea
   `create unique index routines_one_draft_per_kind on routines (patient_id, kind) where
   status = 'pending_review'`.
9. **`public.finish_patient_onboarding`** se reescribe sin la llamada a
   `private.assign_routine_from_rules`. Es una función del slice 1: se avisa al equipo antes
   del PR.
10. Permisos: `revoke all … from public, anon` y `grant execute … to authenticated` en las
    tres funciones públicas, más `comment on function` en español.

*Alternativa descartada:* reutilizar `private.assign_routine_from_rules` pasándole una
plantilla en vez de una regla. Arrastraría el cierre y restauración de la activa (el problema
del calendario de arriba) y el bloqueo de `assignment_rules`.

### D3. Acciones y consultas en `lib/routines/`

- `lib/routines/schemas.ts`: `chooseTemplateSchema` ({patientId, templateId}),
  `routineDraftSchema` ({patientId, routineId}) y los filtros de plantillas (`dias`, `nivel`,
  `entorno`, y `tipo` solo para el admin), con mensajes en español.
- `lib/routines/assignment-actions.ts` se reescribe con tres server actions:
  `createRoutineDraft`, `discardRoutineDraft` y `confirmRoutineDraft`. Siguen la forma de
  `CLAUDE.md` §5 y conservan el patrón actual de mostrar tal cual los errores `22023` y
  `42501`. La frase de éxito de confirmar se mantiene literal.
- `lib/routines/assignment.ts`: se retira `prepareAssignment`, que es la única importación de
  `evaluate-rules` desde el slice de rutinas. Queda el esquema.
- `lib/routines/assignment-queries.ts` (nuevo), dos consultas sin `select("*")` ni N+1:
  - la ficha del paciente: `patient_details` con columnas enumeradas más
    `activeConditions`;
  - las plantillas activas del tipo en curso, con sus días y los `contraindications` de sus
    ejercicios en **una** consulta embebida. Con eso la tarjeta dice cuántos ejercicios se
    quitarían, sin consultar por plantilla.

### D4. La pantalla por pasos

El tipo en curso es la especialidad del profesional. El admin lo elige con chips de enlace
`?tipo=training|physio`, por defecto `training`. El paso se decide en el servidor:

| Estado del tipo en curso | Paso mostrado |
|---|---|
| hay borrador | ② Ajustar y confirmar |
| hay activa, sin borrador, sin `?paso=plantilla` | ③ Rutina activa |
| lo demás | ① Elegir plantilla |

Orden del documento, fijado por `docs/11`:

1. Cabecera y `PatientTabs` (enlaces, sin formularios).
2. Ficha breve del paciente y el indicador de pasos (`<ol>` con `aria-current`).
3. Según el paso:
   - **① Elegir plantilla.** Chips de filtro (enlaces, no un `<form>`, patrón §5 «Acotar una
     lista sin añadir un `<form>`») y una lista de tarjetas.
     - Cada tarjeta es un `<form>` con `templateId` oculto; el `patientId` va ligado a la
       acción con `.bind`, así que el formulario **no contiene `name="patientId"`**. Su
       botón es «Usar esta plantilla».
     - Los parámetros del calendario se conservan en la URL de la acción.
   - **② Borrador.**
     - Primero, **antes de cualquier ejercicio**, el formulario `id="assign-routine"` con
       `patientId` y `routineId` ocultos y el botón «Confirmar y asignar». Lleva
       `ConfirmSubmit` cuando reemplaza una activa o hay días cortos; la descripción nombra
       los días.
     - Dentro de ese mismo formulario, el enlace «Volver al calendario para programar»
       cuando hay contexto de calendario.
     - Después, el formulario de descartar (`routineId`, sin `patientId`, con
       `ConfirmSubmit`).
     - Después, la rutina.
   - **③ Activa.** La rutina, con el enlace «Cambiar de plantilla» (`?paso=plantilla`, sin
     precarga).
4. **La rutina** (pasos ② y ③), un solo nivel de tarjeta:
   - Los días como secciones separadas por borde, no tarjetas anidadas.
   - Cada ejercicio es una fila: quitar primero, después la prescripción en `<details>`. El
     orden no cambia.
   - «Qué se excluyó» sustituye a «Por qué se asignó y qué se excluyó».
5. **El buscador del catálogo** solo se muestra con `?dia=` o `?item=`; sin foco no aparece.
   El modo general de añadir con desplegable de día (`AddRoutineItemDayPicker`) se retira.
   Las dos URLs contrato siguen respondiendo igual.
6. Aviso de la rutina activa del otro tipo, si existe: una línea, sin ejercicios ni
   formularios. El admin la ve cambiando de chip.
7. «Rutinas anteriores»: un `<details>` con nombre y fechas de las `completed` del tipo, sin
   formularios.

Componentes:
- Nuevos en `components/routines/`: `TemplateChoice.tsx` (tarjeta con el formulario de
  elegir), `RoutineDraftBar.tsx` (confirmar y descartar, sustituye a `AssignmentForm.tsx`) y
  `AssignmentSteps.tsx` (el indicador).
- La rutina sale de la página a `RoutineEditor.tsx`, un Server Component que reutiliza
  `RoutineItems.tsx`.
- Todo con tokens y componentes de `components/ui`, objetivos de 44 px, diseño a 375 px y
  enlaces sin precarga donde conviven con formularios (KAN-19).

Estados:
- Carga y error: los de `app/(pro)/loading.tsx` y `app/(pro)/error.tsx`.
- Vacíos con instrucción: sin plantillas de su tipo, y un borrador con un día vacío.

### D5. Contratos de suites

Cambian filas de `docs/11` §3 y el texto de §4. Aprobado por Jordy el 2026-09-25 para
`test:routines`, y también para `test:calendar` y `test:smoke`, que asignan por esta misma
pantalla:

| Pantalla | Marcador | Suites |
|---|---|---|
| `/pro/routines/[patientId]` · elegir plantilla | `value="<templateId>"` + `$ACTION_`, sin `name="patientId"` | `test:routines`, `test:calendar`, `test:smoke` |
| `/pro/routines/[patientId]` · confirmar | `name="patientId"` e `id="assign-routine"`, cuerpo `{}`; es el primer formulario con ese marcador cuando hay borrador | las tres |
| `/pro/routines/[patientId]` · descartar | `value="<routineId>"` + `$ACTION_`, sin `name="patientId"` | `test:routines` |

- Frases: se mantiene «Rutina asignada. El paciente ya puede consultarla». Se añaden
  «Borrador creado», «ya tiene un borrador» y «Borrador descartado».
- `test:calendar` y `test:smoke` solo necesitan un paso previo, enviar el formulario de
  elegir. Sus aserciones posteriores no cambian.

### D6. La suite `test:routines`

Se reescribe `scripts/verify-routine-assignment.test.mjs` sobre el ciclo nuevo, con un
subtest por escenario de `specs/routine-assignment` y `specs/patient-onboarding`:
- elegir, borrador invisible y activa intacta;
- exclusión de contraindicados, día vacío y días cortos;
- confirmar, reemplazo y evento `assigned` con alerta del tipo;
- especialidad por RPC directa (entrenador con plantilla `physio`, profesional ajeno,
  paciente, anónimo);
- guarda de activación, índice de un borrador, descartar;
- el registro no asigna.

Salen los subtests del motor (BACK-002, `no_match`, «Cambiar la regla…»). Su código SQL sigue
vivo hasta `retire-rules-engine`, que decidirá si se conservan en `test:rules`.

### Decisiones ratificadas

Jordy revisó y ratificó el 2026-09-25, sin vetos, las decisiones de este documento que no
venían dadas: registro terminado para crear borrador (D2.2), descartar archiva (D2.3), un
borrador abierto bloquea elegir otra plantilla (D2.2), ADR-0010 también en
`copy_routine_template` (D2.6), guarda de activación (D2.7), buscador solo con foco (D4),
chips `?tipo=` para el admin (D4) y ninguna alerta al terminar el registro (Non-Goals).

## Risks / Trade-offs

- **[Riesgo] Reescribir `private.copy_routine_template` puede cambiar fechas o mensajes del
  calendario.** → Solo se extrae el bucle. `test:routines:snapshot`, `test:calendar` y
  `test:calendar:dates` tienen que pasar sin tocarlas.
- **[Riesgo] El camino de reglas, invocado por RPC, puede chocar con el índice nuevo** al
  crear un segundo `pending_review`. → La aplicación ya no lo invoca. Si alguien lo llama,
  recibe `23505` y no se corrompe nada. Se retira en `retire-rules-engine`.
- **[Trade-off] `public.copy_routine_template` sigue creando rutinas activas sin borrador ni
  exclusión**, solo con la comprobación de especialidad. → Lo necesitan tres suites para
  preparar datos. Cerrarlo del todo queda anotado en `docs/15`.
- **[Riesgo] La guarda por `current_user` depende de que las funciones que activan rutinas
  sean `security definer`.** → Se documenta en el comentario del trigger. `test:routines`
  prueba el rechazo directo y el éxito por la función.
- **[Riesgo] Tocar `finish_patient_onboarding` (slice 1).** → Cambio mínimo, que solo quita la
  llamada. Aviso al equipo antes del PR. `test:auth` y `test:smoke` cubren el registro.
- **[Trade-off] Retirar el buscador general** obliga a elegir antes el día donde se añade.
  → Es el camino que ya usan los enlaces por día. Reduce un formulario permanente, que es
  parte de la confusión de la pantalla.

## Migration Plan

1. Migración nueva, `npm run db:reset` limpio y `npm run db:types` → `lib/db/types.ts` en el
   mismo PR.
2. En una base con datos, el paso de duplicados (D2.8) archiva los borradores sobrantes antes
   del índice; no se pierde ninguna rutina activa.
3. Despliegue: primero la migración (`supabase db push`), después la aplicación. Con la
   migración aplicada y la aplicación vieja, el botón «Evaluar y asignar» sigue funcionando
   porque el camino de reglas no se borra: no hay ventana rota.
4. Reversión: una migración nueva que restaure la llamada en `finish_patient_onboarding` y
   elimine el índice, la guarda y las tres funciones. La aplicación anterior no las usa.
