## Why

La portada del paciente (`/patient`) mostraba una tira de la semana y un enlace a la rutina,
con una frase que remitía al menú. No decía lo que el paciente viene a mirar al entrar: qué le
toca hoy, cómo va su semana y si su membresía está en orden. El 2026-10-03 se pidió un
rediseño, con barra y menú propios del paciente, validado antes sobre una maqueta aparte.

## What Changes

- **Portada del paciente**, en este orden:
  - **Hoy:** qué le toca y el botón para hacerlo. Cubre cinco casos: sesión a medias, sesión
    programada, hoy ya entrenó, sin rutina y día de descanso, este último con la próxima
    sesión.
  - **Su semana:** días entrenados, días programados, meta semanal y «Ver calendario».
  - **Tres datos:** racha, visitas del mes y membresía, cada uno con enlace a su pantalla.
- **Aviso por vencer:** si la membresía está por vencer, sale un aviso flotante abajo, que se
  puede cerrar, con «Saber más» hacia Membresía.
- **Barra del paciente:**
  - siempre oscura;
  - la marca, con el símbolo del logo como «A» de AMADORTRAINER;
  - el plan vigente: el nombre real de su membresía activa o por vencer, o «Básico» si no
    tiene ninguna;
  - el saludo, el tema y «Cerrar sesión».
- **Menú lateral del paciente plegable:** queda en un riel de iconos y recuerda el estado en
  una cookie.
- **Sin cambios para el personal:** la barra y el menú siguen como estaban.

## Capabilities

### New Capabilities

- `patient-home`: lo que el paciente ve al entrar y la barra de sus pantallas.

## Impact

- **Portada:** `app/(patient)/patient/page.tsx`.
- **Componentes nuevos:**
  - `components/patients/TodayCard.tsx`;
  - `components/patients/MembershipExpiryBanner.tsx`;
  - `components/shell/PatientSidebar.tsx`;
  - `components/patients/UpcomingSessions.tsx`, `EvolutionCard.tsx` y `CareCard.tsx`
    (portada de escritorio);
  - `components/brand/ClientWordmark.tsx`.
- **Componentes modificados:**
  - `components/patients/WeekStrip.tsx`: días programados y nuevo estilo;
  - `components/shell/AppShell.tsx`: barra y menú del paciente;
  - `components/auth/Workspace.tsx`: lee el plan y deja `title` opcional.
- **Datos nuevos:**
  - `lib/progress/patient-agenda.ts`: hoy, meta y próxima sesión, sobre `patientCalendar`;
  - `lib/progress/patient-plan.ts`: el rótulo del plan;
  - `formatWeekdayDate` en `lib/progress/vocabulary.ts`.
- **`app/globals.css` (compartido):** `--font-wordmark` (Montserrat, cargada solo por la
  marca).
- **Recurso nuevo:** `public/brand/amadortrainer/simbolo-blanco.png`, recortado del original
  blanco.
- **Sin migraciones ni dependencias nuevas.** Montserrat llega por `next/font`.

## Non-goals

- Cambiar la barra o el menú del personal.
- Cobrar o renovar desde la app: el aviso remite a renovar con el equipo.
- Avisar de membresías vencidas o canceladas: solo «por vencer», que es lo que se pidió.
