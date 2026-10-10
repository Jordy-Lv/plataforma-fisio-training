## Why

El paciente solo veía su progreso en la portada: el último peso y una línea pequeña. La
evolución completa —peso, medidas y cargas— existía solo para el equipo
(`/evolution/[patientId]`, `requireStaff`). El 2026-10-03 se pidió que el paciente tenga en «Mi
rutina» su evolución detallada, con gráficas, en el teléfono y en escritorio.

`docs/00-contexto-y-alcance.md` ya incluye la «gráfica de evolución» del tamizaje y el registro
de dolor y esfuerzo por ejercicio. Este change no añade datos: muestra al paciente lo suyo.

## What Changes

- **Pestañas en «Mi rutina»:** «Mi rutina» (`/routine`, sin cambios) y **«Mi evolución»**
  (`/routine/evolution`, nueva), con el mecanismo de pestañas de sección que ya usa el
  personal.
- **«Mi evolución»**, solo lectura:
  - **cuatro cifras:**
    - sesiones terminadas en 12 semanas;
    - constancia: programadas y terminadas en 4 semanas;
    - dolor medio de 30 días frente a los 30 anteriores;
    - peso actual y cambio desde el primer tamizaje;
  - **Tu constancia:** barras con las sesiones terminadas por semana (12 semanas);
  - **Dolor y esfuerzo:** la media de cada sesión, de 0 a 10, en las últimas 12;
  - **Peso y medidas** y **Progresión de carga:** las mismas gráficas que ve el equipo
    (`EvolutionChart`);
  - **Tus mejores marcas:** el peso máximo por ejercicio y cuánto subió desde el primero;
  - **Dónde te ha dolido:** las zonas con más dolor registrado en 12 semanas.
- Rejilla de 12 columnas en escritorio y una columna en el teléfono, sin desbordes a 375 px.

## Capabilities

### New Capabilities

- `patient-evolution`: la evolución que el paciente ve de sí mismo.

## Impact

- **Pantalla nueva:** `app/(patient)/routine/evolution/page.tsx`.
- **Datos:** `lib/progress/patient-progress.ts`, tres lecturas en paralelo con RLS del
  paciente: sesiones, registros y calendario. Reutiliza `getPatientScreenings`,
  `buildScreeningSeries` y `getLoadProgression`.
- **Componentes nuevos:** `components/progress/WeeklyBars.tsx` y
  `components/progress/PainEffortChart.tsx`.
- **Menú:** `components/shell/nav-items.ts`, pestañas en la entrada «Mi rutina» del paciente.
- **Sin migraciones, sin políticas nuevas y sin dependencias.** La RLS ya deja al paciente
  leer sus sesiones, sus registros y sus tamizajes.

## Non-goals

- Cambiar la evolución del equipo (`/evolution/[patientId]`).
- Exportar o compartir la evolución.
- Metas personales o comparativas con otros pacientes.
