# Proposal

## Why

[ADR-0009](../../../docs/adr/0009-asignacion-manual-de-rutinas.md) decidió que la rutina la
elige el entrenador o fisioterapeuta, no un motor de reglas, pero el código sigue asignando
solo: `finish_patient_onboarding` evalúa las reglas al cerrar el registro y el único botón de
`/pro/routines/[patientId]` («Evaluar y asignar rutina») exige una regla ganadora. Además, esa
pantalla es confusa (ver `docs/15` §F), y
[ADR-0010](../../../docs/adr/0010-especialidad-en-la-asignacion-de-rutinas.md) exige que la
especialidad se compruebe en el servidor al asignar.

## What Changes

- **BREAKING** — Terminar el registro deja de asignar una rutina. El paciente queda en su
  estado vacío («Tu profesional está preparando tu rutina») hasta que su profesional confirme
  una.
- **BREAKING** — La asignación desde `/pro/routines/[patientId]` deja de usar
  `assignment_rules`: el profesional elige una plantilla, se crea un **borrador**
  (`pending_review`, invisible para el paciente), lo ajusta y lo **confirma**. Solo al
  confirmar se cierra la rutina activa anterior del mismo tipo y el paciente ve la nueva.
- Al crear el borrador se quitan los ejercicios contraindicados por las condiciones activas y
  la pantalla dice cuáles. Añadir a mano un ejercicio contraindicado sigue permitido, con
  aviso visual.
- Confirmar exige que ningún día quede vacío; un día con uno o dos ejercicios solo pide
  confirmación con aviso.
- Especialidad (ADR-0010): un profesional solo crea y confirma borradores de su especialidad
  para pacientes con asignación de cuidado vigente de ese tipo; el administrador puede ambas.
  La edición de ejercicios sigue abierta a cualquier profesional a cargo.
- Un solo borrador por paciente y tipo.
- `/pro/routines/[patientId]` se rehace por pasos —elegir plantilla, ajustar el borrador,
  confirmar— y el profesional ve solo la rutina de su tipo.
- La suite `test:routines` se reescribe sobre el ciclo nuevo y `docs/11` registra los
  contratos nuevos de la pantalla.

**Fuera de este change:** retirar `assignment_rules`, `/rules`, el simulador, `seed:rules` y
las suites `test:rules*`. Irá en un change aparte (`retire-rules-engine`); mientras tanto el
motor queda como código legado que la aplicación ya no invoca.

## Capabilities

### New Capabilities

El repositorio no tiene especificaciones archivadas en `openspec/specs/`: los changes previos
siguen abiertos y definen sus capacidades como deltas `ADDED`. Este change sigue esa misma
convención y reutiliza los nombres de capacidad que ya existen en ellos.

- `routine-assignment`: selección manual de plantilla, borrador invisible, exclusión de
  contraindicados, confirmación, restricción de especialidad y la pantalla por pasos.
  Sustituye, para la asignación, a los requisitos «Evaluación por prioridad» y «Criterios de
  coincidencia» de `assignment-rules` (change `add-exercise-library-and-rules`), que dejan de
  gobernar qué rutina recibe un paciente.
- `patient-onboarding`: terminar el registro no asigna rutina.

### Modified Capabilities

- Ninguna en `openspec/specs/` (vacío). Ver la nota de arriba.

## Impact

- **Base de datos:** migración nueva del slice de rutinas: funciones de crear, descartar y
  confirmar borrador; índice único parcial; guarda contra activar un borrador sin confirmar;
  comprobación de especialidad en `copy_routine_template`; `finish_patient_onboarding` sin la
  llamada al motor. `lib/db/types.ts` regenerado en el mismo PR.
- **Toca una función del slice 1:** `finish_patient_onboarding`. Hay que avisar al equipo
  antes de abrir el PR (`CLAUDE.md` §3).
- **Código:** `app/(pro)/pro/routines/[patientId]/page.tsx`, `components/routines/*`
  (formulario de asignación nuevo, elección de plantilla), `lib/routines/*` (acciones,
  consultas, esquemas).
- **Pruebas:** reescritura de `test:routines`. Deben seguir pasando `test:routines:items`,
  `test:routines:snapshot`, `test:routines:sessions`, `test:calendar`, `test:auth`,
  `test:design` y los cuatro checks.
- **Documentación:** `docs/11` (filas nuevas), `docs/03` §«Estado de implementación»,
  `docs/07` (prueba «Asignación manual de rutina») y `docs/15` §F.
- **Sin dependencias nuevas.**
