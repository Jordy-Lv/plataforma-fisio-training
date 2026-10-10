## Why

«Mi rutina» listaba todas las rutinas activas con todos sus días, y cada día tenía su botón
para iniciarlo en cualquier momento. El 2026-10-04 se pidió que el paciente vea solo lo que le
toca hoy, con sus indicaciones, y que no pueda hacer una rutina hasta que llegue su día.

## What Changes

- **«Mi rutina» (`/routine`) solo muestra lo programado para hoy:**
  - cada día con sus ejercicios, su volumen y las indicaciones de su profesional;
  - el botón para empezar, continuar o repetir la sesión.
- **Sin nada programado hoy no se entrena:** la pantalla dice cuál es la próxima sesión y el
  nombre de su rutina.
- **El historial sale de la vista general** y pasa a `/routine/history`, al que se llega con
  «Ver historial de sesiones».
- **Las sesiones a medias de días anteriores se dan por cerradas:** la portada ya no las
  ofrece y su pantalla ya no deja registrar.
- **La pantalla del día del calendario** solo deja iniciar si ese día está programado para
  hoy.
- **La regla se aplica en las pantallas**, por decisión del usuario: no hay migración. La
  función `start_routine_session` sigue aceptando cualquier día de la rutina propia.

## Capabilities

### New Capabilities

- `patient-routine`: lo que el paciente puede hacer de su rutina y cuándo.

## Impact

- `app/(patient)/routine/page.tsx` (reescrita) y `app/(patient)/routine/history/page.tsx`
  (nueva).
- `components/routines/TodayRoutineDay.tsx` (nuevo); `SessionHistory`, con `className`.
- `app/(patient)/routine/sessions/[sessionId]/page.tsx`: las sesiones de días anteriores se
  muestran cerradas.
- `app/(patient)/routine/calendar/days/[dayId]/page.tsx`: exige que el día esté programado
  hoy.
- `app/(patient)/patient/page.tsx`: ignora la sesión a medias de días anteriores.
- `lib/routines/queries.ts`: `routine_items.notes`, las indicaciones.
- **Contrato** (`docs/11`): el formulario «iniciar día» de `/routine` solo existe para los días
  programados hoy. `test:routines:sessions` programa el día antes de enviarlo y limpia la
  programación al terminar.

## Non-goals

- Hacer cumplir la regla en la base de datos.
- Cerrar automáticamente (`abandoned`) las sesiones a medias antiguas.
