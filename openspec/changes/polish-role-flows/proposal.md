## Why

Recorrido de las vistas de los cuatro perfiles (admin, entrenador, fisioterapeuta y paciente)
el 2026-10-09, antes de salir a producción, a 375 px y en escritorio. Todas responden en el
servidor en menos de 110 ms y ninguna falla, pero hay seis puntos donde el flujo se siente
pesado o no se entiende, el más serio creado por `routine-today-only`: el paciente solo
entrena lo programado para hoy y nada le dice al profesional que tiene que programarlo.

## What Changes

- **Aviso de programación** en el paso «Rutina activa» de `/pro/routines/[patientId]`: sin
  ninguna sesión programada desde hoy, avisa de que el paciente no puede entrenar y lleva al
  calendario; con sesión, dice cuál es la próxima.
- **«Empezar sesión» antes de la lista** de ejercicios del día en `/routine`: con cuatro
  ejercicios quedaba fuera de la primera pantalla del teléfono.
- **Banda fija de la sesión más baja**: el aviso de ejercicios pendientes pasa a una línea
  («Marca los 3 ejercicios que faltan para poder cerrar.»).
- **Accesos de la portada del paciente** sin la flecha en el teléfono: «Mi evolución» salía
  cortado a 375 px.
- **Filtros del catálogo** con la barra compacta `ListFilters` de los demás listados: la
  tarjeta anterior ocupaba la primera pantalla entera antes del primer ejercicio.
- **Títulos de pestaña** en las trece pantallas que solo decían «AmadorTrainer», y la
  descripción de `/pro/routines` deja de hablar de «propuesta a partir del perfil» (anterior
  a ADR-0009).

## Capabilities

### New Capabilities

- `role-flows`: lo mínimo que cada perfil necesita ver para no quedarse atascado.

## Impact

- `app/(pro)/pro/routines/[patientId]/page.tsx`, `lib/routines/calendar-queries.ts`
  (`nextScheduledDay`).
- `components/routines/TodayRoutineDay.tsx`, `SessionProgress.tsx`;
  `app/(patient)/patient/page.tsx`.
- `components/catalog/ExerciseFilters.tsx`, `app/(admin)/exercises/page.tsx`.
- Trece `page.tsx` con `metadata`; `app/(pro)/pro/routines/page.tsx`.
- Sin migraciones. Los formularios no cambian de orden: el de «iniciar día» sigue siendo el
  único de su tarjeta (`docs/11`).

## Non-goals

- Cambiar la regla de `routine-today-only` (decisión del 2026-10-04).
- El encabezado del personal con el logotipo del paciente: decisión de marca pendiente.
