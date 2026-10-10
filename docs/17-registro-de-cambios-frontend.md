# 17 — Registro de cambios del frontend

Bitácora de **cada cambio que se hace en el frontend**, del más pequeño al más grande, desde el
2026-10-03. La entrada más reciente va arriba.

Sirve para que quien llegue después sepa qué cambió en una pantalla, por qué y cómo se
comprobó, sin tener que reconstruirlo desde los commits.

## Cuándo basta esta bitácora y cuándo hace falta un change de OpenSpec

| El cambio… | Dónde se documenta |
|---|---|
| Ajusta una pantalla sin ampliar lo que hace: textos, espaciado, orden visual, un estado vacío, un defecto | Solo aquí |
| Añade o quita comportamiento, toca varias pantallas, cambia un contrato de suite ([`11`](11-contratos-de-las-suites-http.md)) o necesita migración | Un change en `openspec/changes/<change>/` (proposal, design, `tasks.md`) **y** una entrada aquí que lo enlace |

Si hay duda, change de OpenSpec: [`CLAUDE.md`](../CLAUDE.md) §12 pide no inventar alcance.

## Formato de cada entrada

```markdown
### AAAA-MM-DD — Título corto en infinitivo

- **Pantallas:** rutas afectadas (`/pro/routines/[patientId]`) y roles que las ven.
- **Qué cambió:** el antes y el después, en una o dos frases.
- **Por qué:** quién lo pidió o qué problema resuelve.
- **Archivos:** los principales, enlazados.
- **Contratos de suites:** los de `docs/11` que se tocan, o «ninguno».
- **Verificación:** suites corridas, ancho probado (375 px el paciente), capturas.
- **Change de OpenSpec:** enlace, o «no aplica».
- **Commit / PR:** referencia cuando exista.
- **Pendiente:** lo que queda abierto, o «nada».
```

---

## Entradas

### 2026-10-04 — Calendario del paciente al estilo de la app

- **Pantallas:** `/routine/calendar` (paciente), en el teléfono y en escritorio. El calendario
  del profesional (`RoutineCalendar`) no cambia.
- **Qué cambió:** con la captura de Smart Fit como referencia, y mejorado:
  - **Tres cifras arriba:**
    - semanas seguidas, con el fueguito;
    - sesiones terminadas en el mes que se mira, «Sesiones en octubre» (antes, las del año);
    - meta de la semana: «4/5», con «N de M completadas» para el lector de pantalla, que es
      lo que mira `test:calendar`.
  - **Navegación:** flechas con «Octubre, 2026» (o el rango de la semana), un botón «Hoy»
    si se está en otra fecha y el cambio Mes / Semana en píldora.
  - **Mes:**
    - cada día es un enlace que lo selecciona; hoy va en dorado con «Hoy» y el elegido con
      contorno;
    - los días de otros meses van apagados;
    - cada sesión es un punto: dorado lleno si se completó, contorno dorado si está
      programada, contorno ámbar si quedó pendiente;
    - leyenda debajo.
  - **Semana:** siete días (filas en el teléfono, columnas en escritorio), cada uno con sus
    sesiones como tarjetas que llevan al día de rutina, o «Descanso». Hoy, resaltado.
  - **Día elegido** (a la derecha en escritorio, debajo en el teléfono): «Hoy» o la fecha, y
    cada sesión con su estado, «Ver rutina» y «Ver registro» o «Continuar sesión». Sin nada:
    «Ningún entrenamiento programado en esta fecha».
  - **Sin «Registrar rutina»** de la referencia: el paciente no programa.
  - **Sesión de un día anterior:** una a medias se rotula «Sin terminar», no «En curso», con
    la regla de `routine-today-only`.
- **Por qué:** lo pidió el usuario para la web y el teléfono («si lo puedes mejorar, hazlo»).
  Sustituye a la maqueta del calendario que estaba pendiente, que se retira de
  `.claude/launch.json`.
- **Archivos:**
  - [`PatientCalendar`](../components/routines/PatientCalendar.tsx) (nuevo);
  - [`app/(patient)/routine/calendar/page.tsx`](../app/(patient)/routine/calendar/page.tsx);
  - `monthSessionCount` en [`patient-progress.ts`](../lib/progress/patient-progress.ts): una
    consulta de conteo por mes, para que valga también en la vista de semana.
- **Contratos de suites:** se conservan todos los de `test:calendar`:
  - `[data-calendar-goal]` con «N de M completadas»;
  - siete `[data-calendar-date]` en la semana, con el `a[title]` de hoy hacia
    `/routine/calendar/days/<dayId>?date=…&view=week`;
  - el título del evento en el mes, sin `data-calendar-schedule` ni `data-calendar-create`.
- **Verificación:**
  - `typecheck`, `lint`, auditoría de diseño 5/5, `test:calendar` 9/9, `test:people` 11/11
    y `test:smoke` 11/11;
  - mes y semana a 390 px y a 1536 px, en oscuro y claro.
- **Change de OpenSpec:** no aplica (rediseño de una pantalla, con los mismos datos y
  contratos).
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-04 — «Mi rutina» solo con lo de hoy; historial aparte

- **Pantallas:**
  - `/routine` (reescrita) y `/routine/history` (nueva);
  - `/routine/sessions/[id]`, `/routine/calendar/days/[dayId]` y `/patient`.
- **Qué cambió:**
  - **«Mi rutina» muestra solo lo programado para hoy:** cada día con sus ejercicios, su
    volumen, las **indicaciones** de su profesional (`routine_items.notes`) y el botón. Este
    dice «Empezar sesión», «Continuar sesión» o «Hacerla otra vez», con «Completada hoy» si
    ya la terminó.
  - **Sin nada programado hoy no se entrena:** «No tienes sesión programada», la próxima
    sesión y el nombre de su rutina, sin botones.
  - **El historial sale de la vista general** y va a `/routine/history`, con el botón «Ver
    historial de sesiones». La rutina completa por días (`RoutineSummary`) tampoco se
    muestra ya.
  - **Las sesiones a medias de días anteriores se dan por cerradas:** la portada ya no las
    ofrece, y su pantalla dice «Esta sesión quedó sin terminar el …» sin formularios.
  - **El día del calendario** solo deja iniciar si está programado hoy (antes bastaba con la
    fecha de hoy en la URL).
  - La regla vive en las pantallas, por decisión del usuario: sin migración.
- **Por qué:** lo pidió el usuario. Sus respuestas: solo la de hoy con sus indicaciones; sin
  programación no se entrena; las sesiones de días anteriores se cierran; historial detrás de
  un botón.
- **Archivos:**
  - [`app/(patient)/routine/page.tsx`](../app/(patient)/routine/page.tsx) y
    [`history/page.tsx`](../app/(patient)/routine/history/page.tsx);
  - [`TodayRoutineDay`](../components/routines/TodayRoutineDay.tsx) y
    [`SessionHistory`](../components/routines/SessionHistory.tsx);
  - la pantalla de la sesión, la del día del calendario y la portada;
  - [`lib/routines/queries.ts`](../lib/routines/queries.ts).
- **Contratos de suites:** **cambia uno, aprobado al pedir la regla.** El formulario «iniciar
  día» de `/routine` (`value="<dayId>"`) solo existe para los días programados hoy.
  `test:routines:sessions` programa el día antes del «Camino 5» y borra la programación al
  limpiar (no cae en cascada con la rutina). Actualizado en
  [`docs/11`](11-contratos-de-las-suites-http.md). `test:routines` sigue viendo el nombre de
  la rutina y «Tu profesional está preparando tu rutina».
- **Verificación:**
  - `typecheck`, `lint`, auditoría de diseño 5/5, `test:routines:sessions` 19/19,
    `test:routines` 14/14, `test:calendar` 9/9 y `test:smoke` 11/11. La prueba de humo
    falló una vez porque el servidor de desarrollo se había caído; se levantó de nuevo;
  - Diego sin nada hoy (domingo), con una programación temporal de fisio para hoy (ya
    retirada) a 390 y 1536 px, y su sesión de ayer cerrada.
- **Change de OpenSpec:** [`routine-today-only`](../openspec/changes/routine-today-only/).
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:**
  - `OpenSessionCard` y `RoutineSummary` quedaron sin uso;
  - si la regla debe ser infranqueable, llevarla a la base con una migración.

### 2026-10-04 — Cabecera de las pantallas del paciente al estilo de la app

- **Pantallas:** todas las del paciente con título (`/routine`, `/routine/evolution`,
  `/routine/calendar`, `/attendance/me`, `/memberships/me`, `/patient/profile`…), en el
  teléfono y en escritorio. El personal no cambia.
- **Qué cambió:** con la captura de Smart Fit como referencia:
  - **título** grande en negrita (32 px en el teléfono, 40 px en escritorio), con sus
    acciones a la derecha en píldora;
  - **pestañas de la sección debajo del título** (antes iban encima), grandes y en negrita:
    la activa en el color del texto con una raya dorada debajo, las demás apagadas y sin
    línea de fondo;
  - **brillo dorado detrás**, el mismo de la portada, pegado a la barra;
  - en «Mi rutina» y «Mi evolución» el título pasa a ser el de la sección, **«Rutinas»**,
    sin la frase de debajo, y el botón **«Calendario»** va en una píldora con contorno e
    icono (antes «Ver calendario»).
  - No se añadió el botón «⋮» de la referencia: no hay acciones que meter en él.
- **Por qué:** lo pidió el usuario para «Rutinas» en el teléfono y «en otras vistas donde
  lo veas necesario».
- **Archivos:**
  - [`AppShell`](../components/shell/AppShell.tsx): orden y brillo del paciente;
  - [`PageHeader`](../components/ui/PageHeader.tsx) y
    [`TabBar`](../components/shell/TabBar.tsx), los dos **compartidos**, con la nueva
    variante `hero` (la `default` del personal queda igual);
  - [`SectionTabs`](../components/shell/SectionTabs.tsx);
  - [`app/(patient)/routine/page.tsx`](../app/(patient)/routine/page.tsx) y
    [`evolution/page.tsx`](../app/(patient)/routine/evolution/page.tsx).
- **Contratos de suites:** ninguno. «Ver calendario» solo lo busca `test:calendar` en la
  pantalla del profesional, que no cambia.
- **Verificación:**
  - `lint`, auditoría de diseño 5/5, `test:smoke` 11/11, `test:routines` 14/14,
    `test:routines:sessions` 19/19 y `test:calendar` 9/9;
  - `/routine` a 390 px, `/routine/evolution` a 1536 px y `/attendance/me` a 390 px en
    claro.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local. `components/ui/PageHeader.tsx` es
  compartido: hay que avisar en el PR.
- **Pendiente:** nada.

### 2026-10-04 — «Te quedaste aquí» pasa a «Tu rutina del día de hoy»

- **Pantallas:** `/patient`, en el teléfono y en escritorio.
- **Qué cambió:** la etiqueta de la sesión a medias dice «Tu rutina del día de hoy» (en
  mayúsculas por estilo) en vez de «Te quedaste aquí».
- **Por qué:** lo pidió el usuario.
- **Observación:** si la sesión a medias se empezó otro día, la etiqueta dice «de hoy» y la
  línea de debajo, «· ayer» o «· desde el …». Queda pendiente decidir si en ese caso la
  etiqueta debe cambiar.
- **Archivos:** [`TodayCard`](../components/patients/TodayCard.tsx).
- **Contratos de suites:** ninguno; ninguna suite busca ese texto.
- **Verificación:** `test:smoke` 11/11, 1536 × 730 y 390 px.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** la observación anterior.

### 2026-10-03 — Menú lateral del paciente rediseñado y plan fuera de la barra

- **Pantallas:** todas las del paciente en escritorio: menú lateral y barra superior.
- **Qué cambió:** se aplica la propuesta A de la maqueta.
  - **Grupos:** «Entrenar» (Inicio, Mi rutina, Calendario) y «Mi cuenta» (Asistencia,
    Membresía, Mi perfil). Plegado, los títulos se vuelven una línea.
  - **Entrada activa:** píldora dorada translúcida, barrita dorada a la izquierda, icono
    dorado y texto en negrita. Antes era un círculo dorado sólido. Las demás van apagadas y
    se encienden al pasar el ratón.
  - **Al pie:** la tarjeta **«Tu plan»** (nombre, días para que venza y barra de lo que
    queda; en ámbar si está por vencer; «Básico» si no hay plan), que lleva a Membresía, y
    el botón **«Plegar menú»**, que sustituye al círculo flotante del borde. Plegado, solo
    queda el botón.
  - **Barra superior:** se quita «Plan: SEMESTRAL» (el plan está ahora en el menú), y el
    saludo baja de 18 a 15 px con un avatar de 32 px.
- **Por qué:** lo pidió el usuario: eligió la A de tres propuestas; después pidió reducir
  la letra de la barra y quitar el plan.
- **Archivos:**
  - [`PatientSidebar`](../components/shell/PatientSidebar.tsx) y
    [`SidebarPlan`](../components/shell/SidebarPlan.tsx) (nuevo);
  - [`AppShell`](../components/shell/AppShell.tsx);
  - [`patient-plan.ts`](../lib/progress/patient-plan.ts): `currentPlan`, con fechas y
    estado, y `currentPlanLabel` sobre ella, en la misma `cache`.
- **Contratos de suites:** ninguno. «Cerrar sesión» y el único formulario siguen igual; el
  botón de plegar no es un formulario.
- **Verificación:**
  - `typecheck`, `lint`, auditoría de diseño 5/5 y `test:smoke` 11/11;
  - `test:memberships` falla 2/11 por los datos de prueba de Diego, como antes, no por este
    cambio: la prueba mira `/memberships/me`;
  - 1536 × 730 abierto en oscuro y plegado en claro.
- **Change de OpenSpec:** [`refresh-patient-home`](../openspec/changes/refresh-patient-home/):
  el requisito de la barra pasa a ser «El menú lateral muestra el plan vigente», y se
  añaden las tareas 7.1–7.3.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:**
  - en desarrollo, el indicador «N» de Next.js tapa el botón «Plegar menú» (abajo a la
    izquierda). En producción no aparece.

### 2026-10-03 — Entrenamiento un poco más grande en escritorio

- **Pantallas:** `/patient` desde 1024 px. El teléfono no cambia.
- **Qué cambió:**
  - título de 20 a 28 px, rutina a 16 px y etiqueta a 13 px;
  - casillas de ejercicios y aviso más altas: 14 px de texto, numeración de 24 px y bordes
    más redondeados;
  - botones de 48 px con texto de 16 px.
- **Por qué:** lo pidió el usuario («un poquito más grande»).
- **Archivos:** [`TodayCard`](../components/patients/TodayCard.tsx). Solo clases `lg:`.
- **Contratos de suites:** ninguno.
- **Verificación:**
  - auditoría de diseño 5/5 y `test:smoke` 11/11;
  - 1536 × 730;
  - sin desplazamiento en los 12 tamaños probados.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — La barra de la meta llega hasta «Calendario»

- **Pantallas:** `/patient` en escritorio (`WeekHeader`).
- **Qué cambió:** la barra «4 de 5 sesiones esta semana» pierde su ancho máximo
  (`lg:max-w-md`) y ocupa todo el espacio hasta el enlace «Calendario».
- **Por qué:** lo pidió el usuario.
- **Archivos:** [`WeekHeader`](../components/patients/WeekHeader.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:** 1536 × 730 en oscuro.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Etiquetas «Entreno» y «Fisio» solo con contorno

- **Pantallas:** `/patient` en escritorio, «Próximas sesiones».
- **Qué cambió:** las etiquetas dejan su relleno de color. El texto va en el color del
  texto (blanco en oscuro) y el contorno en el color de la especialidad: dorado
  (`border-brand-bright`) para entreno y azul (`border-info`) para fisio.
- **Por qué:** lo pidió el usuario.
- **Archivos:** [`UpcomingSessions`](../components/patients/UpcomingSessions.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:** auditoría de diseño 5/5, `test:smoke` 11/11 y 1920 × 990 en oscuro y
  claro.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — El aviso de cuidado como cuarta casilla de los ejercicios

- **Pantallas:** `/patient`, en el teléfono y en escritorio.
- **Qué cambió:**
  - «Cuida tu rodilla. Registra dolor en la sesión si aparece.» deja de ir suelto bajo los
    botones y pasa a ser una casilla más de la cuadrícula de ejercicios, con su mismo
    formato (fondo `bg-muted`, texto e icono dorados);
  - con tres ejercicios, la cuadrícula de escritorio queda en 2 × 2;
  - si no hay lista de ejercicios, el aviso sigue suelto bajo los botones.
- **Por qué:** lo pidió el usuario.
- **Archivos:** [`TodayCard`](../components/patients/TodayCard.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - auditoría de diseño 5/5 y `test:smoke` 11/11;
  - 1536 × 730 y 390 px en oscuro.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Portada de escritorio con el diseño del teléfono

- **Pantallas:** `/patient` desde 1024 px.
- **Qué cambió:** el escritorio adopta el diseño del teléfono:
  - **Arriba, sin tarjeta y sobre el brillo dorado:**
    - la racha;
    - **catorce días**: la semana en curso y la siguiente, separadas por una línea y con lo
      ya programado en punteado;
    - la meta semanal y «Calendario».
  - **Debajo, a 8 columnas:** el entrenamiento suelto (sin caja ni triángulos), con los
    ejercicios en dos columnas, los botones y el aviso de cuidado.
  - **A la derecha, a 4 columnas:** las próximas sesiones (tres siempre, sin la regla por
    alto de ventana) y los accesos «Mi evolución» y «Mi equipo».
  - **Salen del escritorio:** los cuatro datos, la tarjeta «Tu semana», «Tu evolución» y
    «Tu equipo». También sobra el alto fijo de la rejilla: ya no hay desplazamiento en
    ningún tamaño probado, ni a 1366 × 657.
  - `MobileWeekHeader` pasa a ser `WeekHeader`, para los dos anchos.
  - `patientAgenda.plannedDates` cubre esta semana y la siguiente.
- **Por qué:** lo pidió el usuario: la vista de PC «similar» a la del teléfono, con más días.
- **Archivos:**
  - [`WeekHeader`](../components/patients/WeekHeader.tsx) (sustituye a
    `MobileWeekHeader`);
  - [`TodayCard`](../components/patients/TodayCard.tsx) y
    [`UpcomingSessions`](../components/patients/UpcomingSessions.tsx);
  - [`patient-agenda.ts`](../lib/progress/patient-agenda.ts);
  - [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx), reescrita.
- **Contratos de suites:** ninguno. `/patient` sigue sin formularios propios.
- **Verificación:**
  - `lint`, auditoría de diseño 5/5, `test:smoke` 11/11, `test:overview` 6/6 y
    `test:calendar` 9/9;
  - 1536 × 730 en oscuro, 1920 × 990 en claro y 390 px en el teléfono;
  - documento del alto de la ventana en 12 tamaños, de 1366 × 657 a 1920 × 1080.
- **Change de OpenSpec:** [`refresh-patient-home`](../openspec/changes/refresh-patient-home/):
  el requisito de escritorio se reescribe y se añaden las tareas 6.1–6.5.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** quedaron sin uso `EvolutionCard`, `CareCard`, `WeekStrip` y
  `lib/progress/patient-evolution.ts` (tarea 6.5). No se borran sin confirmarlo: son
  archivos sin versionar.

### 2026-10-03 — Aviso de cuidado y etiqueta de estado en dorado, sin fondo amarillo

- **Pantallas:** `/patient`, tarjeta de hoy, en el teléfono y en escritorio.
- **Qué cambió:**
  - el aviso de cuidado deja el azul informativo;
  - fondo `bg-foreground/8`: blanco translúcido en oscuro y gris muy suave en claro;
  - texto e icono en el dorado de la marca (`text-brand`).
  - la etiqueta del estado («Te quedaste aquí», «Hoy te toca»…) pierde su fondo amarillo
    y queda solo en letras doradas, en el teléfono y en escritorio.
- **Por qué:** lo pidió el usuario.
- **Archivos:** [`TodayCard`](../components/patients/TodayCard.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - auditoría de diseño 5/5 y `test:smoke` 11/11;
  - 390 px en oscuro y claro, y 1536 × 730;
  - escritorio sin desplazamiento.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Accesos del teléfono más compactos

- **Pantallas:** `/patient` por debajo de 1024 px.
- **Qué cambió:** las tarjetas «Mi evolución» y «Mi equipo» pasan a ser una fila baja (48
  px), con el icono en amarillo sin fondo, el título al lado y la flecha a la derecha. Se
  quitan las líneas «Peso 80,3 kg» y «2 profesionales».
- **Por qué:** lo pidió el usuario.
- **Archivos:** [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:** `test:smoke` 11/11 y 390 px en oscuro y claro.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Accesos «Mi evolución» y «Mi equipo» en el teléfono, y «Mi equipo» en el perfil

- **Pantallas:**
  - `/patient` por debajo de 1024 px;
  - `/patient/profile` (paciente) en los dos anchos.
- **Qué cambió:**
  - **Portada del teléfono:** bajo el entrenamiento, dos tarjetas en una fila. «Mi
    evolución», con el último peso, lleva a `/routine/evolution`. «Mi equipo», con cuántos
    profesionales le acompañan, lleva a `/patient/profile#equipo`.
  - **Mi perfil:** nueva sección **«Mi equipo»**, arriba, con un hueco por especialidad
    (Entrenamiento y Fisioterapia). Si tiene profesional, va con «Te acompaña» y un punto
    verde; si no, «Sin asignar» con borde punteado. Debajo dice cómo cambiar de profesional
    (pedírselo al administrador) o que se lo asignarán tras la evaluación inicial.
  - Antes el perfil del paciente no consultaba el equipo, porque solo vería especialidades
    sin nombre. Ahora lo lee para esta sección.
- **Por qué:** lo pidió el usuario: dos tarjetas en el teléfono para la evolución y el
  equipo, con el equipo en el perfil «por ahora».
- **Archivos:**
  - [`MyTeamSection`](../components/patients/MyTeamSection.tsx) (nuevo);
  - [`PatientProfile`](../components/auth/PatientProfile.tsx);
  - [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx).
- **Contratos de suites:** ninguno. «Mi equipo» no lleva `<form>`, así que el primero de
  `/patient/profile` sigue siendo el de `name="goal"`.
- **Verificación:**
  - `lint`, auditoría de diseño 5/5, `test:people` 11/11, `test:auth:resilience` 16/16 y
    `test:smoke` 11/11;
  - Diego a 390 px (portada y perfil) y a 1440 px (perfil).
- **Change de OpenSpec:** no aplica (reutiliza `getCareTeam` y la RLS existentes).
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:**
  - el nombre del profesional, que exige cambiar la RLS de `profiles` (tarea 5.5 de
    `refresh-patient-home`);
  - si «Mi equipo» pasa a ser una pantalla propia más adelante.

### 2026-10-03 — Quitar el saludo y el chip del plan de la portada del teléfono

- **Pantallas:** `/patient` por debajo de 1024 px.
- **Qué cambió:** «Hola, Diego» y el chip «Plan SEMESTRAL» dejan de verse. La portada del
  teléfono empieza directamente por la racha y la semana. El encabezado (fecha, saludo con
  el `h1` y plan) sigue en la página con `sr-only`, para el lector de pantalla, en los dos
  anchos.
- **Por qué:** lo pidió el usuario.
- **Consecuencia:** en el teléfono el plan ya no se ve en la portada, porque la barra
  superior del teléfono no lo lleva. Sigue en «Membresía» y en el aviso de vencimiento.
- **Archivos:** [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx).
- **Contratos de suites:** ninguno. El `h1` sigue existiendo.
- **Verificación:** `test:smoke` 11/11, auditoría de diseño 5/5 y 390 px en oscuro y claro.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Quitar la insignia ✓ de los días entrenados

- **Pantallas:** `/patient` en el teléfono (`MobileWeekHeader`).
- **Qué cambió:** se quita la ✓ amarilla de la esquina, añadida en la entrada siguiente. Un
  día entrenado se marca solo con el número en dorado y en negrita (más el punto si hubo
  visita), frente al gris de los días sin sesión.
- **Por qué:** lo pidió el usuario.
- **Archivos:** [`MobileWeekHeader`](../components/patients/MobileWeekHeader.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:** `test:smoke` 11/11 y 390 px en oscuro.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Línea más corta bajo la sesión a medias

- **Pantallas:** `/patient`, tarjeta «Te quedaste aquí», en el teléfono y en escritorio.
- **Qué cambió:** «Hipertrofia · fase 1 · empezaste el 3 de octubre de 2026» pasa a ser solo
  la rutina, «Hipertrofia · fase 1», si la empezó hoy. Si es de antes se añade lo justo:
  «· ayer» o «· desde el 1 de oct».
- **Por qué:** lo pidió el usuario: decía demasiadas cosas en una línea.
- **Archivos:** [`TodayCard`](../components/patients/TodayCard.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:** `test:smoke` 11/11 y Diego a 390 px (sesión empezada hoy).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Días entrenados con insignia ✓ en vez de círculo relleno

- **Pantallas:** `/patient` en el teléfono (`MobileWeekHeader`).
- **Qué cambió:** un día con sesión terminada ya no rellena el círculo de dorado. Lleva el
  número en dorado, en negrita, y una insignia ✓ pequeña en la esquina. Lo demás sigue
  igual: borde punteado si está programado, anillo para hoy y punto debajo si hubo visita.
- **Por qué:** lo pidió el usuario: otra forma de marcar el entrenamiento sin pintar todo
  el círculo.
- **Archivos:** [`MobileWeekHeader`](../components/patients/MobileWeekHeader.tsx). La
  tarjeta «Tu semana» de escritorio (`WeekStrip`) no cambia.
- **Contratos de suites:** ninguno.
- **Verificación:**
  - auditoría de diseño 5/5 y `test:smoke` 11/11;
  - 390 px en oscuro y claro.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** decidir si `WeekStrip` (escritorio) adopta la misma marca.

### 2026-10-03 — Ejercicios, «Ver mi rutina» y aviso de cuidado también en el teléfono

- **Pantallas:** `/patient` por debajo de 1024 px.
- **Qué cambió:** el bloque del entrenamiento enseña en el teléfono lo mismo que en
  escritorio, en versión compacta:
  - la lista de ejercicios en una columna de filas bajas (12 px de texto, 4 px entre filas),
    con hechos, saltados y «Siguiente» igual que en escritorio;
  - «Continuar sesión» o «Empezar sesión» junto a «Ver mi rutina», en una sola fila;
  - el aviso «Cuida tu rodilla…» en una línea;
  - en cambio, las etiquetas de debajo del título («0 de 3 ejercicios», «3 ejercicios ·
    Entrenamiento») se quitan del teléfono: la lista ya lo dice. En escritorio siguen.
  - también se quitan del teléfono los datos de abajo (sesiones, asistencia y membresía):
    cada uno sigue en su pantalla del menú inferior, y la membresía por vencer la avisa el
    banner. La portada del teléfono queda en saludo, semana y entrenamiento.
- **Por qué:** lo pidió el usuario: «algo compacto que no ocupe mucho» y, después, quitar
  del teléfono «0 de 3 ejercicios» y los tres datos.
- **Archivos:** [`TodayCard`](../components/patients/TodayCard.tsx). Lo que antes era
  `hidden lg:…` ahora se ve siempre, con medidas de teléfono.
- **Contratos de suites:** ninguno.
- **Verificación:**
  - auditoría de diseño 5/5 y `test:smoke` 11/11;
  - 390 × 844 en oscuro y 320 px en claro, sin desbordes;
  - escritorio igual y sin desplazamiento.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Entrenamiento alineado a la izquierda y brillo desde la barra

- **Pantallas:** `/patient` por debajo de 1024 px.
- **Qué cambió:**
  - el bloque del entrenamiento sigue sin tarjeta, pero vuelve a ir alineado a la
    izquierda: se deshace el centrado de la entrada anterior;
  - el brillo dorado deja de ser el fondo de la franja de la semana, que lo cortaba a su
    altura. Ahora lo pinta la portada desde arriba: sube el relleno de `main` con margen
    negativo, empieza pegado a la barra superior, cubre el saludo y la semana y se
    desvanece debajo.
- **Por qué:** lo pidió el usuario: se veía un corte entre la barra y la franja.
- **Archivos:** [`TodayCard`](../components/patients/TodayCard.tsx),
  [`MobileWeekHeader`](../components/patients/MobileWeekHeader.tsx) y
  [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - auditoría de diseño 5/5 y `test:smoke` 11/11;
  - 390 × 844 en oscuro y claro;
  - escritorio sin cambios y sin desplazamiento.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — La tarjeta de hoy, suelta y centrada en el teléfono

- **Pantallas:** `/patient` por debajo de 1024 px. El escritorio no cambia.
- **Qué cambió:**
  - en el teléfono, «Te quedaste aquí», «Hoy te toca» y los demás estados dejan de ir en
    tarjeta: sin contorno dorado, sin fondo, sin sombra y sin triángulos;
  - el contenido va centrado sobre el fondo, como en la app de Smart Fit, debajo de la
    semana;
  - el botón sigue a todo el ancho.
- **Por qué:** lo pidió el usuario.
- **Archivos:** [`TodayCard`](../components/patients/TodayCard.tsx). La caja es ahora
  `lg:`, y el teléfono solo lleva `py-2 text-center`.
- **Contratos de suites:** ninguno.
- **Verificación:**
  - auditoría de diseño 5/5 y `test:smoke` 11/11;
  - 390 × 844 en oscuro y claro, y 1536 × 730, igual que antes.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Portada en el teléfono: racha y semana arriba, sin tarjeta

- **Pantallas:** `/patient` por debajo de 1024 px. El escritorio no cambia.
- **Qué cambió:** al estilo de la app de Smart Fit, la semana sale de su tarjeta y sube:
  - una franja sobre un brillo dorado suave, con la **racha** a la izquierda: el fueguito
    se enciende con al menos una semana y lleva el número de semanas. Enlaza a «Mi
    evolución»;
  - a la derecha, **los siete días**: relleno dorado si entrenó, borde punteado si tiene
    sesión programada, «Hoy» en negrita con anillo y un punto si hubo visita registrada;
  - debajo, la meta semanal en una barra fina y el enlace «Calendario»;
  - luego viene la tarjeta del entrenamiento (`TodayCard`);
  - la fecha desaparece en el teléfono (la semana ya dice «Hoy»), y el saludo y el chip del
    plan quedan en una línea;
  - en los datos de abajo, la racha deja su sitio a «Sesiones» del mes;
  - por debajo de 360 px los círculos bajan de 32 a 28 px para que no se toquen.
- **Por qué:** lo pidió el usuario con una captura de Smart Fit como referencia.
- **Archivos:** [`MobileWeekHeader`](../components/patients/MobileWeekHeader.tsx) (nuevo) y
  [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx).
- **Contratos de suites:** ninguno. Sin formularios nuevos.
- **Verificación:**
  - `lint`, auditoría de diseño 5/5 y `test:smoke` 11/11;
  - 390 × 844 en oscuro y claro, y 320 px, sin desbordes;
  - en escritorio, sin desplazamiento en los mismos tamaños que antes.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** revisarlo en un teléfono real.

### 2026-10-03 — «Tu evolución» sin gráfica y «Siguiente» solo con contorno

- **Pantallas:** `/patient` en escritorio.
- **Qué cambió:**
  - **Tu evolución:** se quita la línea del peso. Quedan el peso y el IMC del último
    tamizaje, con su cambio, y un botón **«Ver evolución completa»** (contorno dorado, que
    se rellena al pasar el ratón) que lleva a `/routine/evolution`, donde están las
    gráficas. Sin tamizajes, el botón sigue, junto a un texto que dice qué hay en la
    evolución mientras tanto.
  - **Sesión a medias:** el ejercicio «Siguiente» pierde el fondo dorado suave y queda solo
    con el contorno amarillo.
- **Por qué:** lo pidió el usuario.
- **Archivos:** [`EvolutionCard`](../components/patients/EvolutionCard.tsx) y
  [`TodayCard`](../components/patients/TodayCard.tsx).
- **Contratos de suites:** ninguno. El botón es un enlace, no un formulario.
- **Verificación:**
  - auditoría de diseño 5/5 y `test:smoke` 11/11;
  - claro y oscuro a 1536 × 730;
  - sin desplazamiento en los mismos tamaños; a 1366 × 657 sobran 58 px, como ya pasaba por
    debajo de 720 px de alto.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Vista previa de los ejercicios en la sesión a medias

- **Pantallas:** `/patient` en escritorio, tarjeta «Te quedaste aquí». En el teléfono solo se
  añade el contador.
- **Qué cambió:** la tarjeta de la sesión a medias ya no queda vacía:
  - un contador, «1 de 3 ejercicios», también en el teléfono;
  - en escritorio, la lista de los ejercicios del día: los hechos con ✓ en verde y el nombre
    apagado, los saltados con «–», el siguiente resaltado en dorado con «Siguiente» y el
    resto con su número y su volumen;
  - con más de cuatro ejercicios, la ventana empieza justo antes del siguiente y añade «+N
    ejercicios más».
- **De dónde salen los datos y cómo se actualizan:**
  - el ejercicio y su volumen vienen de la rutina **actual** del paciente (`routine_items`);
  - lo marcado viene de los registros de esa sesión (`session_logs`);
  - el admin o el profesional con asignación vigente editan la rutina en
    `/pro/routines/[patientId]`: ajustar series, repeticiones y peso, añadir, quitar o
    sustituir un ejercicio. Lo autoriza la RLS `can_write_routine`;
  - esos cambios escriben en `routine_items` de la rutina del paciente, que es una copia de
    la plantilla: cambiar la plantilla no la toca;
  - `/patient` se pinta en cada petición (lee la sesión), así que el cambio sale en la
    siguiente carga sin revalidar nada. Se comprobó cambiando un ejercicio de 3 × 12 a
    5 × 8;
  - lo ya registrado conserva lo que se prescribió al registrarlo (`prescribed_*`).
- **Por qué:** lo pidió el usuario: la tarjeta de la sesión a medias quedaba vacía.
- **Archivos:**
  - [`TodayCard`](../components/patients/TodayCard.tsx);
  - [`patient-agenda.ts`](../lib/progress/patient-agenda.ts): `openSessionProgress`, dos
    lecturas en paralelo;
  - [`patient-overview.ts`](../lib/progress/patient-overview.ts): `OpenSession.dayId`;
  - [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx).
- **Contratos de suites:** ninguno. Sin formularios nuevos en `/patient`.
- **Verificación:**
  - `lint`, auditoría de diseño, `test:smoke` 11/11, `test:overview` 6/6,
    `test:routines:items` 9/9 y `test:routines:sessions` 19/19;
  - Diego con 0 y con 1 ejercicio marcado (el registro temporal se retiró);
  - la portada sigue sin desplazamiento en los mismos tamaños.
- **Change de OpenSpec:** no aplica (amplía una tarjeta existente con datos que ya se leían).
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Portada del paciente sin desplazamiento en escritorio

- **Pantallas:** `/patient` desde 1024 px. El teléfono no cambia.
- **Qué cambió:**
  - la rejilla mide el alto útil de la ventana: `100svh` menos la barra (61 px) y el relleno
    de `main` (16 + 16 px), 5rem menos con el aviso de vencimiento;
  - las dos primeras filas (hoy | semana y próximas; los cuatro datos) miden lo que piden;
  - la última fila (evolución | equipo) se queda con lo que sobra, y la gráfica de evolución
    se estira con ella;
  - espacios y rellenos algo menores: 12 px entre tarjetas y 16 px de relleno en la semana y
    en la evolución.

  La última fila nunca baja de lo que necesita su contenido (`minmax(min-content, 1fr)`):
  si no cabe, la página se desplaza en vez de recortar las tarjetas.

  **Segunda pasada**, porque en una ventana de portátil seguía habiendo desplazamiento:
  - la leyenda de la semana solo se ve en el teléfono;
  - las próximas sesiones son más compactas;
  - con poco alto se enseñan menos: dos hasta 820 px y una hasta 760 px
    (`nth-…:[@media(max-height:…)]:hidden`).
- **Por qué:** lo pidió el usuario: reducir un poco los márgenes y quitar el desplazamiento
  vertical.
- **Archivos:** [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx) y
  [`EvolutionCard`](../components/patients/EvolutionCard.tsx), que pasa a estirarse.
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `lint`, auditoría de diseño 5/5 y `test:smoke` 11/11;
  - alto del documento igual al de la ventana, con Diego y su sesión a medias, en 1920 ×
    1080, 990, 940 y 900; 1570 × 915 y 860; 1536 × 864 y 730; 1440 × 900 y 820; 1280 × 800 y
    720;
  - 375 px sin cambios.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:**
  - con la sesión a medias, la tarjeta de hoy queda con espacio libre: podría mostrar
    cuántos ejercicios lleva;
  - por debajo de 720 px de alto (un portátil de 1366 × 768, unos 657 px útiles) aún sobran
    27 px.

### 2026-10-03 — «Mi evolución» para el paciente, dentro de «Mi rutina»

- **Pantallas:**
  - `/routine/evolution` (nueva, paciente), en el teléfono y en escritorio;
  - pestañas «Mi rutina» / «Mi evolución» arriba de `/routine` y de la pantalla nueva.
- **Qué cambió:** el paciente ve su evolución completa con gráficas:
  - **cuatro cifras:** sesiones en 12 semanas, constancia sobre lo programado en 4 semanas,
    dolor medio del mes frente al anterior, y peso con su cambio;
  - **Tu constancia:** barras por semana;
  - **Dolor y esfuerzo:** líneas de 0 a 10 por sesión;
  - **Peso y medidas** y **Progresión de carga:** las gráficas del equipo;
  - **Tus mejores marcas** y **Dónde te ha dolido**.

  Cada bloque tiene su estado vacío, que explica qué hacer.
- **Por qué:** lo pidió el usuario para que el paciente lleve su progreso.
- **Archivos:**
  - [`app/(patient)/routine/evolution/page.tsx`](../app/(patient)/routine/evolution/page.tsx);
  - [`lib/progress/patient-progress.ts`](../lib/progress/patient-progress.ts);
  - [`WeeklyBars`](../components/progress/WeeklyBars.tsx) y
    [`PainEffortChart`](../components/progress/PainEffortChart.tsx): rótulos en HTML, para
    que no se encojan en el teléfono;
  - [`nav-items.ts`](../components/shell/nav-items.ts): las pestañas.
- **Contratos de suites:** ninguno.
  - `/routine` gana la barra de pestañas, que son enlaces y no formularios;
  - el formulario «iniciar día» sigue igual (`value="<dayId>"`).
- **Verificación:**
  - `typecheck`, `lint`, auditoría de diseño, `build`, `test:smoke`, `test:evolution` y
    `test:routines:sessions`;
  - Laura a 1440 px en oscuro y a 375 px en claro;
  - el ancho del documento a 375 px es 375. Las rejillas con texto truncado necesitaban
    `grid-cols-1`: con una columna `auto`, la pantalla medía 440 px.
- **Change de OpenSpec:**
  [`add-patient-evolution`](../openspec/changes/add-patient-evolution/).
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:**
  - las gráficas de `EvolutionChart` (compartidas con el equipo) se ven estrechas en el
    teléfono porque estiran su SVG con el texto dentro (tarea 3.3);
  - revisión en un teléfono real.

### 2026-10-03 — Marca de la barra del paciente toda en blanco

- **Pantallas:** la barra de todas las pantallas del paciente, en el teléfono y en escritorio.
- **Qué cambió:**
  - «TRAINER» deja de ir en dorado: toda la marca va en el color del texto, que en la barra
    oscura es blanco;
  - «MADOR» sigue en peso medio y «TRAINER» en fino, así que se siguen distinguiendo.
- **Por qué:** lo pidió el usuario.
- **Archivos:** [`ClientWordmark`](../components/brand/ClientWordmark.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:** barra revisada a 375 y a 1440 px.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Agrandar la marca de la barra del paciente en el teléfono

- **Pantallas:** la barra de todas las pantallas del paciente, por debajo de 640 px.
- **Qué cambió:** «AMADORTRAINER» pasa de 11,5 a **15 px**, con más espacio entre letras
  (0,08 → 0,1 em). El símbolo que hace de «A» pasa de 15 a 19 px de alto. Desde 640 px no
  cambia (19 px).
- **Por qué:** lo pidió el usuario: la marca se veía pequeña en el teléfono.
- **Archivos:** [`ClientWordmark`](../components/brand/ClientWordmark.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:** barra revisada a 375 y a 320 px, junto al botón sol/luna y al de cerrar
  sesión, sin cortes ni desbordes.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Compactar la tarjeta de acceso en el teléfono

- **Pantallas:** `/login`, `/recuperar` y `/actualizar-contrasena` por debajo de 640 px.
- **Qué cambió:** rellenos y espacios algo más cortos, solo en el teléfono (desde `sm`
  vuelven los de antes):
  - tarjeta con 20 px de relleno, antes 24, y 24 px de margen inferior, antes 40;
  - encabezado: título a 26 px, frase a 15 px con interlineado de 24 px y menos espacio
    debajo;
  - 16 px entre campos, antes 20;
  - el recuadro «¿Aún no tienes acceso?» más bajo;
  - el logo de la franja a 176 px, antes 192, y la franja 8 px más baja.

  El inicio de sesión pasa de 782 a **702 px de alto a 375 px de ancho**. Ya no hay
  desplazamiento en teléfonos de 740 px de alto o más; en un iPhone SE (667 px) quedan 35 px.
- **Por qué:** lo pidió el usuario: había un desplazamiento mínimo en el inicio de sesión.
- **Archivos:** [`app/(auth)/layout.tsx`](../app/(auth)/layout.tsx),
  [`AuthHeading`](../components/auth/AuthHeading.tsx),
  [`AuthForm`](../components/auth/AuthForm.tsx),
  [`AuthBrandPanel`](../components/auth/AuthBrandPanel.tsx) y
  [`login/page.tsx`](../app/(auth)/login/page.tsx).
- **Contratos de suites:** ninguno. Ni el formulario ni sus campos cambian.
- **Verificación:**
  - `typecheck`, auditoría de diseño 5/5, `test:smoke` 11/11 y `test:auth:screens` 10/10;
  - alto medido a 375 × 667, 375 × 740 y 390 × 844.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Portada en el teléfono: las tres áreas como pasos

- **Pantallas:** `/` (portada pública) por debajo de 1024 px. El escritorio no cambia.
- **Qué cambió:** se aplica la opción C de la maqueta.
  - Las tres áreas dejan de ser cajas con borde dorado y pasan a ser **pasos**: el número en
    un cuadrado dorado, el título a 16 px y el texto a 14 px, unidos por una línea vertical
    dorada que se desvanece.
  - **Sin huecos:** titular, pasos y botón se reparten el alto que deja el logo
    (`justify-evenly`). El logo sube y se achica un poco: 200 px, antes 220.
  - Bajo «Comenzar ahora»: «¿Aún no tienes acceso? Pídeselo a tu profesional.», como en las
    pantallas de acceso.
- **Por qué:**
  - el usuario pidió mejorar la portada en el teléfono;
  - de tres propuestas (todo a la vista, carrusel, pasos) eligió la de pasos;
  - en la versión anterior sobraba espacio entre el logo y el titular, y las cajas pesaban
    mucho con texto de 12 px.
- **Archivos:** [`app/page.tsx`](../app/page.tsx). En escritorio, cada clase nueva del
  teléfono tiene su contraparte `lg:`, que devuelve las cajas de antes.
- **Contratos de suites:** ninguno (`test:smoke` no abre la portada).
- **Verificación:**
  - `lint`, auditoría de diseño 5/5, `build` y `test:smoke` 11/11;
  - 375 × 740 en oscuro y claro, 375 × 667 (iPhone SE: cabe sin desplazar) y 1440 px, igual
    que antes;
  - sin desbordes ni errores de consola.
- **Change de OpenSpec:** no aplica (reordena una pantalla sin ampliar lo que hace).
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** revisarlo en un teléfono real.

### 2026-10-03 — Descenso adicional del bloque de marca y ampliación de los vectores triangulares

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **Descenso acentuado del bloque de marca:** se incrementó el margen superior a `mt-[90px] sm:mt-[105px]`, situando el conjunto del logo y los vectores más abajo en la pantalla con excelente proporción hacia el titular.
  - **Triángulos vectoriales de mayor envergadura:** se reformuló el SVG en móvil (`viewBox="0 0 380 170"`) para que los cuatro triángulos concéntricos alcancen una envergadura de hasta 360 px (abarcando prácticamente todo el ancho de la pantalla), con trazo más robusto (`strokeWidth={1.8}`) y opacidades reforzadas, dándoles gran fuerza y protagonismo visual.
- **Por qué:** el usuario solicitó bajar esto más y hacer los vectores más grandes.
- **Archivos:**
  - [`components/home/HomeArt.tsx`](../components/home/HomeArt.tsx).
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - Capturas de pantalla verificadas en modo claro y oscuro con Playwright.
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Descenso solidario de los vectores vectoriales con el logotipo

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **Alineación y descenso conjunto de los vectores:** se reemplazó el padding superior interno por margen superior en el contenedor (`mt-[65px] sm:mt-[75px]` con `py-2`), de modo que el fondo vectorial (`HomeArt`) baje en perfecta sincronía con el logotipo en lugar de quedar flotando en la parte superior del contenedor. Los triángulos quedan perfectamente concéntricos y abrazando el logotipo en su nueva posición descendida.
- **Por qué:** el usuario solicitó bajar los vectores también.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - Mediciones directas en el DOM con Playwright.
  - Capturas de pantalla verificadas en modo claro y oscuro.
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Ajuste de descenso adicional del bloque de logotipo en portada móvil

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **Descenso adicional del bloque de marca:** se incrementó el espaciado superior (`pt-[92px] sm:pt-[100px]`), bajando el logotipo y sus elementos acompañantes un poco más hacia el cuerpo de la pantalla.
- **Por qué:** el usuario solicitó bajarla otro poco.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - Capturas de pantalla verificadas en modo claro y oscuro con Playwright.
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Centrado geométrico del logotipo entre el borde superior y el titular

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **Centrado equidistante del bloque de marca:** se ajustó el espaciado superior (`pt-[76px] sm:pt-[84px]`) para que la distancia desde el borde superior de la pantalla hasta el logotipo (~68 px) sea exactamente igual a la distancia desde el bloque del logotipo hasta el comienzo del titular «Entrena tu mejor versión» (~68 px), logrando un centrado geométrico perfecto en el tercio superior de la pantalla.
- **Por qué:** el usuario solicitó bajarlo para que quede centrado entre el borde superior y donde empieza la frase de «Entrena tu mejor versión».
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - Mediciones directas en el DOM con Playwright (distancias simétricas de 68 px).
  - Capturas de pantalla verificadas en modo claro y oscuro.
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Subtítulo bajo el logotipo y ligero descenso del logo en portada móvil

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **«Entrenamiento y fisioterapia» ubicado inmediatamente bajo el logotipo:** en móvil se movió el subtítulo de la marca para que quede situado justo debajo del logo de AmadorTrainer (`mt-1.5 text-center text-xs text-brand`), acompañando la base de los vectores triangulares, mientras que en escritorio se preserva en la columna izquierda sobre el titular (`hidden lg:block`).
  - **Logotipo descendido levemente:** se ajustó el espaciado superior (`pt-5 sm:pt-6`) para bajar el bloque del logotipo un poco más desde el borde superior de la pantalla.
- **Por qué:** el usuario solicitó poner «Entrenamiento y fisioterapia» justo debajo del logo y bajar el logo solo un poquito.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
  - Capturas de pantalla verificadas en modo claro y oscuro con Playwright.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Botón de acción al pie y logotipo elevado en portada móvil

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **Botón «Comenzar ahora» anclado abajo del todo:** se reorganizó la distribución vertical de la sección para situar el botón al final del viewport con un contenedor dedicado al pie (`px-4 pb-4`).
  - **Logotipo elevado hacia arriba:** se ajustaron los espaciados del bloque de marca (`pt-3 pb-1 sm:pt-4`) para subir la posición del logo, dejando el titular y las tarjetas centrados armónicamente en el espacio intermedio.
- **Por qué:** el usuario solicitó colocar el botón abajo del todo y subir el logo de Amador un poco más.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
  - Capturas de pantalla verificadas en modo claro y oscuro con Playwright.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Ampliación y mayor presencia de los triángulos vectoriales de fondo

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **Triángulos de fondo más grandes y definidos:** se aumentaron las dimensiones y el alcance horizontal y vertical de los triángulos concéntricos en móvil (`viewBox="0 0 420 220"`), sumando una cuarta capa concéntrica externa, aumentando el grosor del trazo (`strokeWidth={1.75}`) y calibrando las opacidades para darles mayor fuerza y protagonismo estético alrededor del logotipo.
- **Por qué:** el usuario solicitó hacer los vectores de triángulo más grandecitos.
- **Archivos:**
  - [`components/home/HomeArt.tsx`](../components/home/HomeArt.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
  - Capturas de pantalla verificadas en modo claro y oscuro con Playwright.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Vectores amarillos completos enmarcando el logotipo en la portada

- **Pantallas:**
  - La portada pública (`/`) en vista móvil y escritorio.
- **Qué cambió:**
  - **Vectores de fondo completos en móvil:** se reemplazó el recorte de líneas diagonales por tres triángulos concéntricos completos (`mobileTriangles`) trazados específicamente para la relación de aspecto móvil (`viewBox="0 0 380 200"`), de modo que el vértice superior, los lados y la base horizontal quedan 100% visibles envolviendo el logotipo.
  - **Ajuste de respiración en el contenedor del logo:** se calibró el padding vertical del contenedor de la marca (`px-4 py-5 sm:py-7`) para dar suficiente holgura a los vectores geométricos sin generar scroll.
- **Por qué:** el usuario solicitó completar los vectores amarillos de fondo que acompañan al logo para que no se vieran cortados y lucieran bien.
- **Archivos:**
  - [`components/home/HomeArt.tsx`](../components/home/HomeArt.tsx).
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
  - Capturas de pantalla verificadas en modo claro y oscuro con Playwright.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Centrado completo de la portada en vista móvil

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **Centrado vertical y horizontal unificado:** el contenedor principal en móvil (`<main>`) ahora distribuye y centra todo el contenido en el medio de la pantalla (`flex flex-col items-center justify-center`).
  - **Centrado del titular:** el título «Entrena tu mejor versión» ahora tiene alineación centrada (`text-center origin-center`) en móvil (manteniendo `lg:text-left` en escritorio), alineándose de forma consistente con el saludo superior y el logotipo.
  - **Agrupación armónica de elementos:** se eliminaron los espaciados extremos (`justify-between`, `mt-auto`, `justify-end`), de modo que el logotipo, los textos, las tres tarjetas y el botón de acción quedan alineados y centrados verticalmente en la mitad del viewport, sin scroll y sin huecos desproporcionados.
- **Por qué:** el usuario solicitó que todo en esa vista quede centrado en la mitad de la pantalla.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Bajar y centrar el logotipo en la portada móvil

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **Se bajó y centró el logotipo de AmadorTrainer:** se aumentó el espaciado superior (`pt-7 sm:pt-9`) para alejarlo del borde superior de la pantalla y del botón de tema, aplicándole centrado horizontal estricto (`w-full flex-col items-center mx-auto`).
- **Por qué:** lo pidió el usuario para bajar el logo y dejarlo perfectamente centrado.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Incrementar tamaño del logotipo AmadorTrainer en la portada

- **Pantallas:**
  - La portada pública (`/`).
- **Qué cambió:**
  - **Se amplió el ancho del logotipo del cliente:** pasó a `215px` (y `245px` en pantallas intermedias) en móvil y `420px` en escritorio, mejorando su prominencia y presencia visual.
- **Por qué:** lo pidió el usuario para que el logo de AmadorTrainer sea más visible y prominente.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Acercar titular «Entrena tu mejor versión» a las tarjetas en móvil

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **Se bajó el bloque del titular mediante `mt-auto` y se redujo la separación con las tarjetas a solo 4 px (`mt-1`)**, haciendo que quede prácticamente pegado justo encima del primer bloque de servicios y dando mayor aire y presencia al logotipo en la parte superior.
- **Por qué:** lo pidió el usuario para que el titular no quede flotando arriba y quede casi pegado a las tarjetas.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Destacar cabecera móvil (logo y titular) y compactar tarjetas de servicio

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **Se aumentó el tamaño del logo (`175px`), el subtítulo de especialidad y el titular principal (`32px` / `36px`)** para darles mayor protagonismo y presencia visual en teléfonos.
  - **Se redujo la altura y el padding de las 3 tarjetas de servicio** (`px-3.5 py-2`, badge de número de tamaño compacto), haciéndolas más compactas y elegantes para equilibrar el espacio sin generar scroll vertical.
- **Por qué:** lo pidió el usuario para destacar el bloque del logo y titular reduciendo el tamaño de las tarjetas.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Portada pública en móvil visible al 100% sin scroll en cualquier teléfono

- **Pantallas:**
  - La portada pública (`/`) en vista móvil.
- **Qué cambió:**
  - **Ajuste responsivo vertical para encajar todo el contenido (logo, titular, áreas de servicio y botón de inicio) en el 100% del alto de la pantalla sin scroll:**
    - El contenedor principal usa `h-svh max-h-svh overflow-hidden` en móvil con distribución vertical flexible.
    - Las 3 tarjetas de servicio usan `flex-1` para expandirse y aprovechar proporcionalmente todo el espacio vertical disponible, sin huecos vacíos y con su texto y descripción completos (sin puntos suspensivos).
    - La sección del logo y el botón inferior se integran a la perfección sin desbordar ni provocar scroll.
- **Por qué:** lo pidió el usuario para que la pantalla inicial sea 100% visible sin necesidad de scroll en ningún teléfono celular.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Retirar texto secundario descriptivo de la portada pública

- **Pantallas:**
  - La portada pública (`/`).
- **Qué cambió:**
  - **Se eliminó el párrafo descriptivo bajo el titular:** «Tu rutina, tus reportes de dolor y tu progreso viven en el mismo lugar, para que cada sesión tenga contexto.» tanto en escritorio como en móvil, conectando de forma directa el titular principal con las tarjetas de áreas de servicio.
- **Por qué:** lo pidió el usuario para simplificar el texto de la portada pública.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Soporte a todos los estados del equipo en la tarjeta de acompañamiento

- **Pantallas:**
  - La portada del paciente (`/patient`).
- **Qué cambió:**
  - **Soporte visual completo y simétrico para los estados de asignación de equipo en `CareCard`:**
    1. **Ambos asignados:** Muestra las dos tarjetas activas en paralelo (Entrenamiento con mancuerna dorada `Dumbbell` y Fisioterapia con `Activity`), sin círculos pesados, y con indicador verde de estado «Te acompaña».
    2. **Solo uno asignado:** La especialidad asignada se muestra activa y la no asignada se muestra con un slot punteado estilizado («Sin asignar»), manteniendo la cuadrícula de 2 columnas balanceada sin huecos vacíos.
    3. **Ninguno asignado:** Muestra ambos slots punteados con sus iconos representativos (`Dumbbell` y `Activity`) y un aviso claro de que el equipo será asignado tras la valoración inicial.
    4. **Zonas a cuidar:** Si no hay zonas registradas, se presenta un estado positivo con icono `ShieldCheck` («Sin zonas de cuidado registradas»).
- **Por qué:** lo pidió el usuario para contemplar adecuadamente todos los estados (ninguno asignado, uno solo, o ambos).
- **Archivos:**
  - [`components/patients/CareCard.tsx`](../components/patients/CareCard.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Retirar el contenedor oscuro alrededor de los iconos en las tarjetas de estadísticas

- **Pantallas:**
  - La portada del paciente (`/patient`).
- **Qué cambió:**
  - **Se eliminó el recuadro redondeado (`bg-brand-soft`) alrededor de los iconos en las 4 tarjetas de estadísticas** (Racha, Sesiones, Asistencia, Membresía). Ahora se muestra únicamente el icono limpio y directo en color amarillo dorado (`text-brand-bright`).
- **Por qué:** lo pidió el usuario para eliminar el contorno cuadrado y dejar solo el icono de color amarillo.
- **Archivos:**
  - [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Eliminar el despliegue vertical (scroll) en la portada del paciente

- **Pantallas:**
  - La portada principal del paciente (`/patient`).
- **Qué cambió:**
  - **Ajuste de distribución vertical y rellenos compactos en la vista del paciente para evitar el desbordamiento vertical.** La tarjeta principal (`TodayCard`), las tarjetas de estadísticas clave y el bloque de semana se optimizaron en altura y espacios (`gap-3.5`, `py-3`, `p-4`) para encajar limpiamente en una sola pantalla sin necesidad de desplazar la página.
- **Por qué:** lo pidió el usuario para que toda la información del paciente se visualice como un panel compacto de un solo vistazo.
- **Archivos:**
  - [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx);
  - [`components/patients/TodayCard.tsx`](../components/patients/TodayCard.tsx);
  - [`components/shell/AppShell.tsx`](../components/shell/AppShell.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Unificar el conmutador de tema a un solo botón sol/luna en toda la aplicación

- **Pantallas:**
  - La portada pública (`/`);
  - Las pantallas de acceso (`/login`, `/recuperar`, `/actualizar-contrasena`);
  - La barra del paciente y la barra del personal en el marco global (`AppShell`).
- **Qué cambió:**
  - **Se reemplaza el grupo de tres opciones (`ThemeToggle`) por un solo botón sol/luna (`ThemeSwitch`) en escritorio y teléfono.** Al pulsar el botón, alterna directamente entre el tema claro (sol) y oscuro (luna) en todas las resoluciones.
  - Se eliminan las referencias a `ThemeToggle` de `app/page.tsx`, `app/(auth)/layout.tsx` y `components/shell/AppShell.tsx`.
- **Por qué:** lo pidió el usuario para simplificar el cambio de tema en escritorio y tener una experiencia visual uniforme en toda la aplicación.
- **Archivos:**
  - [`app/page.tsx`](../app/page.tsx);
  - [`app/(auth)/layout.tsx`](../app/(auth)/layout.tsx);
  - [`components/shell/AppShell.tsx`](../components/shell/AppShell.tsx).
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck` (0 errores) y `test:design` (5/5 en verde).
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Quitar el saludo de la portada en escritorio y volver a la marca anterior

- **Pantallas:**
  - `/patient` en escritorio;
  - la barra de todas las pantallas del paciente.
- **Qué cambió:**
  - **La fecha y «Hola, Nombre» ya no se ven en escritorio.** La barra ya saluda («¡Hola,
    Diego!») y la portada empieza directamente con la tarjeta de hoy. El `h1` sigue en la página
    con `lg:sr-only`, para el lector de pantalla. En el teléfono no cambia: allí la barra no
    saluda y la fecha y el chip del plan siguen arriba.
  - **La barra vuelve a ser la anterior:** oscura en los dos temas, con «AMADORTRAINER» en
    Montserrat y el símbolo como «A». Esto **deshace el logo que cambiaba con el tema** de la
    entrada siguiente. Se restauraron `ClientWordmark`, `--font-wordmark`, `CLIENT_SYMBOL_WHITE`
    y `simbolo-blanco.png`; el PNG se regeneró con el mismo recorte del original.
  - Se mantiene lo demás de la entrada siguiente: la portada sin ancho máximo y sin la píldora
    del plan.
- **Por qué:** lo pidió el usuario.
- **Archivos:**
  - [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx) y
    [`components/shell/AppShell.tsx`](../components/shell/AppShell.tsx);
  - [`components/brand/ClientWordmark.tsx`](../components/brand/ClientWordmark.tsx),
    [`lib/brand/client.ts`](../lib/brand/client.ts), `app/globals.css`,
    [`docs/10`](10-sistema-de-diseno.md) y el README de `public/brand/amadortrainer/`.
- **Contratos de suites:** ninguno.
- **Verificación:**
  - `typecheck`, `lint`, auditoría de diseño 5/5, `build` y `test:smoke` 11/11;
  - Diego en claro y Laura en oscuro a 1440 px, y Laura a 375 px.
- **Change de OpenSpec:**
  [`refresh-patient-home`](../openspec/changes/refresh-patient-home/): propuesta y tareas 2.1
  y 2.2 vueltas a la marca anterior.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada.

### 2026-10-03 — Portada del paciente a todo el ancho y logo del tema en su barra

- **Pantallas:**
  - `/patient` en escritorio;
  - la barra de todas las pantallas del paciente, en los dos anchos.
- **Qué cambió:**
  - **Se quita la píldora «Tu plan · vigencia»** junto al saludo. El plan sigue en la barra y
    la vigencia en el dato de Membresía.
  - **La portada ya no tiene ancho máximo propio (antes 70rem).** Ocupa todo `main`, que ya se
    limita a 100rem y se centra. Al plegar el menú lateral, las tarjetas crecen en vez de
    dejar un hueco a la derecha. Se probó a 1440 px con el menú abierto y plegado, y a
    1920 px.
  - **La barra del paciente sigue el tema** (antes era siempre oscura) y lleva **el logo del
    cliente**: dorado en claro y blanco en oscuro, como en la portada pública
    (`ClientLogoCropped`). Sustituye a la marca en Montserrat. El fondo va en la propia
    cabecera para que la fusión del logo funcione.
  - **Se retira lo que solo usaba la marca anterior:** `ClientWordmark`, `--font-wordmark` en
    `app/globals.css` (compartido), `CLIENT_SYMBOL_WHITE` y `simbolo-blanco.png`. Nada de eso
    estaba subido.
- **Por qué:** lo pidió el usuario: el plan se repetía, el menú plegado dejaba espacio muerto y
  quería en la barra el logo de claro y oscuro de la portada.
- **Archivos:**
  - [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx) y
    [`components/shell/AppShell.tsx`](../components/shell/AppShell.tsx);
  - [`lib/brand/client.ts`](../lib/brand/client.ts), `app/globals.css`,
    [`docs/10`](10-sistema-de-diseno.md) y el README de `public/brand/amadortrainer/`.
- **Contratos de suites:** ninguno. «Cerrar sesión» y el único formulario siguen igual.
- **Verificación:**
  - `typecheck`, `lint`, auditoría de diseño 5/5 y `test:smoke` 11/11;
  - Laura en oscuro con el menú plegado a 1440 px, en claro a 1920 px y a 375 px;
  - Diego en claro a 1440 px;
  - sin desbordes ni errores de consola.
- **Change de OpenSpec:**
  [`refresh-patient-home`](../openspec/changes/refresh-patient-home/): propuesta, requisito y
  tareas 2.1, 2.2 y 5.3 actualizados.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:** nada nuevo.

### 2026-10-03 — Repartir la portada del paciente en rejilla en escritorio

- **Pantallas:** `/patient` (paciente), **solo desde 1024 px**. En el teléfono no cambia nada.
- **Qué cambió:** la portada pasa a una rejilla de 12 columnas. Cada fila suma 12 y sus
  tarjetas tienen el mismo alto, así que ya no quedan huecos bajo la tarjeta de hoy ni junto a
  los datos. Filas:
  1. el saludo y, a su derecha, **su plan con su vigencia** («Vigente hasta el 20 de dic»,
     «Vence en 3 días» en ámbar o «Sin membresía activa»), que lleva a Membresía;
  2. **Hoy** (7 columnas), con los primeros cuatro ejercicios del día y su volumen, «+N
     ejercicios más», «Empezar sesión» junto a «Ver mi rutina» y, si tiene una zona en cuidado,
     el recordatorio de registrar el dolor | **Tu semana** (5), con la meta y, debajo, las
     **tres próximas sesiones** (día, título, rutina y si es entreno o fisio), cada una
     enlazada a su día;
  3. **cuatro datos** con icono: racha, **sesiones terminadas del mes** (nuevo), visitas del
     mes y membresía;
  4. **Tu evolución** (7): peso e IMC del último tamizaje, cuánto cambió el peso desde el
     anterior y la línea de los últimos seis | **Tu equipo** (5): sus especialidades y sus
     **zonas a cuidar**.

  Con el aviso de vencimiento abierto se deja sitio abajo para que no tape la última fila.
- **Por qué:** lo pidió el usuario sobre la maqueta, para repartir mejor el espacio y mostrar al
  entrar todo lo que el paciente necesita saber. Pidió aplicarlo **solo en la vista web por
  ahora**.
- **Archivos:**
  - [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx);
  - [`components/patients/TodayCard.tsx`](../components/patients/TodayCard.tsx);
  - nuevos: [`UpcomingSessions`](../components/patients/UpcomingSessions.tsx),
    [`EvolutionCard`](../components/patients/EvolutionCard.tsx),
    [`CareCard`](../components/patients/CareCard.tsx),
    [`lib/progress/patient-evolution.ts`](../lib/progress/patient-evolution.ts);
  - datos: [`patient-agenda.ts`](../lib/progress/patient-agenda.ts) (ejercicios de hoy en
    una sola consulta, que también da el conteo, y próximas sesiones) y
    [`patient-overview.ts`](../lib/progress/patient-overview.ts) (`monthSessions`, sin
    consulta nueva).
- **Limitaciones:**
  - **El nombre del profesional no sale.** La política de `profiles` no deja al paciente leer
    el perfil de su profesional, así que «Tu equipo» muestra la especialidad («Entrenamiento ·
    Te acompaña»), igual que `CareTeamCard`. Mostrar el nombre exige una migración: hay que
    hablarlo con el equipo.
  - La evolución no enlaza a ninguna pantalla: `/evolution/[patientId]` es solo del personal.
  - Sin duración de la sesión: no hay ningún dato del que sacarla.
- **Contratos de suites:** ninguno. `/patient` sigue sin formularios propios (solo el de cerrar
  sesión).
- **Verificación:**
  - `typecheck`, `lint`, auditoría de diseño 5/5 y `build`;
  - `test:smoke` 11/11, `test:calendar` 9/9 y `test:overview` 6/6;
  - recorrido con Laura (con una programación temporal para hoy, ya retirada) y Marcos (plan
    por vencer) a 1440 px en oscuro y claro, y a 375 px para confirmar que el teléfono no
    cambia. Sin desbordes ni errores de consola.
- **Change de OpenSpec:**
  [`refresh-patient-home`](../openspec/changes/refresh-patient-home/), requisito «En
  escritorio la portada aprovecha todo el ancho» y tareas 5.1–5.5.
- **Commit / PR:** pendiente; se trabaja en local.
- **Pendiente:**
  - decidir si el paciente ve el nombre de su profesional (tarea 5.5);
  - llevar la rejilla al teléfono cuando se pida.

### 2026-10-03 — Botón sol/luna también en el acceso y en la barra del paciente

- **Pantallas:**
  - en el teléfono: `/login`, `/recuperar`, `/actualizar-contrasena` y la barra de todas las
    pantallas del paciente;
  - en el acceso, además, el logo de la franja va **centrado**.
- **Qué cambió:** el grupo de tres botones de tema pasa a un solo botón sol/luna
  (`ThemeSwitch`), como en la portada. En escritorio y en el personal no cambia nada.
- **Por qué:** se pidió lo mismo que en la portada.
- **Contratos de suites:** **se cambió `test:smoke`, con permiso del usuario.**
  - **Antes:** al abrir cada pantalla esperaba ver el grupo de tema con su opción marcada.
  - **Ahora:** espera al control de tema que esté visible, sea el grupo o el botón sol/luna
    con `data-ready="true"`. El resto de la suite no cambia.
  - **Dónde queda escrito:** en `docs/11`.
- **Archivos:**
  - **La suite:** [`scripts/verify-demo-smoke.test.mjs`](../scripts/verify-demo-smoke.test.mjs),
    en `open()`.
  - **El botón:** [`ThemeSwitch`](../components/ui/ThemeSwitch.tsx), que añade `data-ready`.
  - **Dónde se usa:** [`app/(auth)/layout.tsx`](../app/(auth)/layout.tsx) y
    [`AppShell`](../components/shell/AppShell.tsx).
  - **Logo centrado:** [`AuthBrandPanel`](../components/auth/AuthBrandPanel.tsx).
- **Verificación:**
  - **Capturas a 375 px en claro y en oscuro:**
    - en el acceso, «← Inicio» a la izquierda, el botón a la derecha y el logo centrado;
    - en el paciente, la marca, el botón y salir.
  - **En escritorio:** el grupo de tres se sigue viendo.
  - **Suites:** `test:smoke` 11/11, `test:auth:screens` 10/10, `test:auth:resilience` 16/16 y
    `test:people` 11/11.
  - **Calidad:** `test:design` 5/5, y `typecheck`, `lint` y `build` en verde.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; por ahora se trabaja solo en local.
- **Pendiente:** la opción «Sistema» solo queda en escritorio.

### 2026-10-03 — Portada en el teléfono: un solo botón sol/luna y el saludo centrado

- **Pantallas:** `/` a 375 px. En escritorio no cambia.
- **Qué cambió:**
  - **Tema:** el grupo de tres botones (claro, oscuro, sistema) pasa a **un solo botón**. El
    sol indica modo claro y la luna, modo oscuro; al pulsarlo cambia al otro. Si la
    preferencia era «sistema», el icono muestra el modo aplicado y el primer toque fija el
    contrario.
  - **Saludo:** «ENTRENAMIENTO Y FISIOTERAPIA» va centrado.
  - **Escritorio:** sigue con el grupo de tres opciones.
- **Por qué:** se pidió que los tres botones no ocuparan tanto en el teléfono.
- **Archivos:** el nuevo [`ThemeSwitch`](../components/ui/ThemeSwitch.tsx), en
  `components/ui/`, que es **compartido**: hay que avisarlo en el PR. Y
  [`app/page.tsx`](../app/page.tsx).
- **Contratos de suites:** se quiso aplicar lo mismo al login y no se puede.
  - **Primer intento:** fue un desplegable que escondía el grupo tras un botón, en portada y
    acceso.
  - **Qué pasó:** `test:smoke` cayó en 5 de 11. La suite abre `/login` con un móvil y espera
    **ver** el grupo de tema con su opción marcada, para saber que la página hidrató.
  - **Qué se hizo:** se deshizo en el login y en `ThemeToggle`, y la suite no se tocó. Queda
    anotado en `docs/11`.
  - **Para cambiarlo:** compactar también el login y las pantallas del paciente exigiría
    acordar otro marcador de hidratación para esa suite.
- **Verificación:**
  - **Con Playwright a 375 px:** el botón alterna claro, oscuro y claro, y la clase `dark` de
    `<html>` lo sigue.
  - **En escritorio:** se ve el grupo y no el botón.
  - **Calidad:** `typecheck`, `lint` y `test:design` (5/5) en verde.
  - **Suites:** `test:smoke` 11/11 y `test:auth:screens` 10/10.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; por ahora se trabaja solo en local.
- **Pendiente:**
  - **Opción «Sistema» en el teléfono:** en la portada desaparece; en escritorio sigue.
  - **Login y pantallas del paciente:** mantienen el grupo de tres en el teléfono. Para
    cambiarlo hay que acordar otro marcador de hidratación para `test:smoke`.

### 2026-10-03 — Portada: logo centrado en el teléfono

- **Pantallas:** `/` a 375 px.
- **Qué cambió:** en el teléfono, el logo de la franja superior queda **centrado**. El
  conmutador de tema sigue arriba a la derecha, en su propia fila, encima del logo. En escritorio
  no cambia nada.
- **Por qué:** se pidió centrar el logo sin perder el cambio de tema. En una misma fila no caben a
  375 px: el logo centrado ocupa de 92 a 282 px y el conmutador empieza en 219 px, así que se
  pisarían.
- **Archivos:** [`app/page.tsx`](../app/page.tsx). La franja pasa a `justify-center` y deja
  hueco arriba para el conmutador (`pt-[4.5rem]`).
- **Contratos de suites:** ninguno. Sigue habiendo un solo conmutador.
- **Verificación:**
  - **Capturas:** a 375 px, en claro y en oscuro, sin desplazamiento horizontal; y en escritorio,
    sin cambios.
  - **Calidad:** `typecheck`, `lint` y `test:design` en verde.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; por ahora se trabaja solo en local.
- **Pendiente:** nada.

### 2026-10-03 — Cambio de sección inmediato en el menú del paciente

- **Pantallas:** las del paciente, al moverse por el menú lateral y por la barra inferior del
  teléfono. La barra inferior es común, así que también aplica al personal en el teléfono.
- **Qué cambió:**
  - **Precarga por intención:** los enlaces del menú precargan la pantalla **completa**, con
    sus datos, cuando el usuario muestra intención de abrirla: al pasar el ratón, al enfocarla
    o al empezar a tocarla. Con eso suele estar lista al hacer clic.
  - **El plan de la barra ya no bloquea la pantalla:** se pinta dentro de un `Suspense`.
- **Por qué:** se notaba la espera y el esqueleto de carga al cambiar de sección.
  - **Mediciones en producción:**
    - cada cambio tardaba ~380–480 ms;
    - de eso, 180–400 ms eran del servidor: la sesión en el middleware, el perfil y las
      consultas de cada pantalla;
    - los enlaces tenían la precarga apagada desde KAN-19.
  - **Por qué no la precarga normal:** reactivarla precargaría todo el menú en cuanto se pinta
    la pantalla. Eso es justo lo que competía con el guardado de una sesión (KAN-19). La
    precarga por intención pide una sola pantalla, la que se va a abrir.
- **Archivos:**
  - nuevo [`use-intent-prefetch.ts`](../components/shell/use-intent-prefetch.ts);
  - [`PatientSidebar`](../components/shell/PatientSidebar.tsx);
  - [`MobileNav`](../components/shell/MobileNav.tsx);
  - [`AppShell`](../components/shell/AppShell.tsx), donde va `PatientPlan` en `Suspense`;
  - [`Workspace`](../components/auth/Workspace.tsx), que solo pasa el id.
- **Contratos de suites:** ninguno.
- **Verificación:**
  - **Cronómetro con Playwright en producción** (`next start`): pasando el ratón 250 ms antes
    del clic, cada cambio de sección baja de ~400 ms a **40–70 ms**, sin esqueleto. Las
    visitas repetidas también son inmediatas.
  - **KAN-19:** `test:smoke` 11/11 **dos veces contra producción**, que es donde existe la
    precarga e incluye el registro de ejercicios durante una sesión. Además, 11/11 en
    desarrollo.
  - **Otras comprobaciones:** `test:auth:screens` 10/10, `test:design` 5/5, y `typecheck`,
    `lint` y `build` en verde.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; por ahora se trabaja solo en local.
- **Pendiente:**
  - **En modo desarrollo (`npm run dev`)** la mejora no se ve: Next no precarga en desarrollo
    y compila cada pantalla la primera vez que se abre. La espera de la primera visita es del
    modo desarrollo, no de la app.
  - **En el teléfono** la precarga empieza al tocar, unos 100 ms antes del clic: mejora, pero
    menos que con ratón.
  - **Lo precargado se reutiliza hasta 5 minutos:** las acciones del propio paciente lo
    invalidan, porque llaman a `revalidatePath`. Un cambio hecho por el equipo, como una
    asistencia registrada, puede tardar ese tiempo en verse, o hasta recargar.
  - **El menú lateral del personal** sigue sin precarga. Se le puede aplicar lo mismo.

### 2026-10-03 — Rediseñar la portada y la barra del paciente

- **Pantallas:**
  - `/patient`, la portada;
  - la barra y el menú lateral de todas las pantallas del paciente.

  El personal no cambia.
- **Qué cambió:**
  - **Portada, «Hoy»:** qué le toca y el botón para hacerlo, con cinco casos:
    - sesión a medias → «Continuar sesión»;
    - sesión programada → «Empezar sesión», que lleva al día de rutina;
    - hoy ya entrenó;
    - sin rutina;
    - descanso, con la próxima sesión.
  - **Portada, «Tu semana»:**
    - los días entrenados van en dorado;
    - los programados, con borde punteado;
    - la visita registrada, con un punto;
    - además, la meta semanal con barra y «Ver calendario».
  - **Portada, tres datos:** racha, visitas del mes y membresía, en ámbar si está por vencer.
    Cada uno es un enlace.
  - **Aviso por vencer:** si la membresía está por vencer, un aviso flotante abajo dice «Tu plan
    vence en N días», con «Saber más» hacia `/memberships/me`. Se puede cerrar y queda cerrado
    durante la sesión para esa fecha.
  - **Barra del paciente:**
    - siempre oscura;
    - la marca «[símbolo]MADORTRAINER», con «MADOR» en blanco y «TRAINER» en dorado, en
      Montserrat;
    - «Plan: X», con el plan real de su membresía activa o por vencer, o «BÁSICO» si no tiene;
    - el avatar, «¡Hola, Nombre!», el tema y «Cerrar sesión».
  - **En el teléfono:** el plan pasa a una etiqueta junto al saludo.
  - **Menú lateral del paciente:** se pliega a un riel de iconos. La entrada activa lleva el
    icono en un círculo dorado, y el estado se recuerda en una cookie.
- **Por qué:** se pidió una portada que muestre solo lo que al paciente le interesa al entrar,
  con barra y menú al estilo de la referencia. Se iteró sobre una maqueta aparte en este orden:
  - el contenido;
  - la barra con el plan real;
  - el menú plegable;
  - la marca con el símbolo como «A»;
  - el aviso de vencimiento;
  - «Ver calendario».
- **Archivos:**
  - **Portada:** [`app/(patient)/patient/page.tsx`](../app/(patient)/patient/page.tsx).
  - **Componentes de la portada:** [`TodayCard`](../components/patients/TodayCard.tsx),
    [`WeekStrip`](../components/patients/WeekStrip.tsx) y
    [`MembershipExpiryBanner`](../components/patients/MembershipExpiryBanner.tsx).
  - **Shell:** [`PatientSidebar`](../components/shell/PatientSidebar.tsx),
    [`AppShell`](../components/shell/AppShell.tsx) y
    [`Workspace`](../components/auth/Workspace.tsx); en este último `title` pasa a ser
    opcional.
  - **Marca:** [`ClientWordmark`](../components/brand/ClientWordmark.tsx) y
    `public/brand/amadortrainer/simbolo-blanco.png`.
  - **Datos:** [`patient-agenda.ts`](../lib/progress/patient-agenda.ts),
    [`patient-plan.ts`](../lib/progress/patient-plan.ts) y `formatWeekdayDate`.
  - **`--font-wordmark`** en `app/globals.css`, que es **compartido**: hay que avisarlo en el
    PR.
- **Contratos de suites:**
  - El botón de salir sigue llamándose «Cerrar sesión», que es lo que busca `test:smoke`. Por
    eso no dice «Salir», como en la maqueta.
  - `/patient` sigue con un solo formulario: el de cerrar sesión.
  - Ambos contratos quedan anotados en `docs/11`.
- **Verificación:**
  - **Calidad:** `typecheck`, `lint`, `build` y `test:design` (5/5) en verde.
  - **Suites:**
    - `test:auth:screens` 10/10;
    - `test:auth:resilience` 16/16;
    - `test:people` 11/11;
    - `test:memberships` 11/11;
    - `test:smoke` 11/11;
    - `test:calendar` 9/9;
    - `test:overview` 6/6;
    - `test:routines:sessions` 19/19.
  - **Capturas reales con tres pacientes de la demo:**
    - Diego: sin membresía y sin rutina;
    - Laura: Trimestral. «Hoy te toca» se probó con dos programaciones temporales insertadas
      en la base local y borradas después; «Empezar sesión» abrió el día de rutina correcto;
    - Marcos: Mensual por vencer, con el aviso.
  - **Vistas revisadas:**
    - escritorio y 375 px;
    - claro y oscuro;
    - menú plegado;
    - sin desplazamiento horizontal ni errores de consola.
  - **El personal** conserva su barra.
- **Change de OpenSpec:** [`refresh-patient-home`](../openspec/changes/refresh-patient-home/proposal.md).
- **Commit / PR:** pendiente; por ahora se trabaja solo en local.
- **Pendiente:**
  - **«Básico»:** es un rótulo para quien no tiene membresía vigente, no un plan de la tabla
    `plans`.
  - **Aviso de vencimiento:** solo cubre «por vencer». Vencida o cancelada no avisa.
  - **Racha, asistencia y membresía:** quedan en la fila de tres datos y no se repiten en otra
    parte.
  - **Teléfono real:** falta la revisión en un dispositivo de verdad (tarea 4.4).

### 2026-10-03 — Favicon con el logo blanco de AmadorTrainer

- **Pantallas:** todas, en la pestaña del navegador.
- **Qué cambió:**
  - **Antes:** el favicon era un icono genérico verde con una línea de pulso.
  - **Ahora:** es el símbolo del logo de AmadorTrainer en blanco, sobre un cuadrado oscuro
    de esquinas redondeadas.
  - **Solo el símbolo:** el nombre completo es ilegible a 16 px.
  - **Fondo oscuro:** un blanco sin fondo desaparecería en las pestañas claras.
- **Por qué:** se pidió el logo blanco de AmadorTrainer como favicon.
- **Archivos:**
  - **`public/favicon.ico`:** regenerado con tamaños de 16, 32 y 48 px.
  - **`public/icons/favicon-96.png`:** nuevo.
  - **[`app/layout.tsx`](../app/layout.tsx):** la cabecera declara solo esos dos iconos. Se
    retiraron de ahí `icon.svg` y los PNG de 192 y 512 px, porque el navegador podía elegirlos
    para la pestaña. Siguen en `app/manifest.ts` para la PWA.
  - **Nota de la marca:** actualizada en `public/brand/amadortrainer/README.md`.
- **Contratos de suites:** ninguno.
- **Verificación:**
  - **Servidor:** las dos URLs responden 200, y el HTML de `/login` trae solo esos dos
    `<link rel="icon">`.
  - **Revisión visual:** se miró el icono a 16, 32 y 256 px.
  - **Ajuste posterior:** se pidió el símbolo más grande. Ahora ocupa ~86 % del cuadrado
    (antes ~68 %), con el margen interior bajado del 16 % al 7 %.
  - **Calidad:** `lint` y `test:design` (5/5) en verde.
  - **Suites:** `test:smoke` 11/11.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; por ahora se trabaja solo en local.
- **Pendiente:**
  - **Iconos de instalación:** los de la PWA y `apple-touch-icon.png`, que es el icono al
    añadir la app a la pantalla de inicio, siguen siendo los genéricos verdes. Cambiarlos es
    decisión aparte.
  - **Caché del navegador:** guarda mucho el favicon, así que para ver el nuevo puede hacer
    falta recargar forzando (Ctrl+F5).

### 2026-10-03 — Portada: el título de cada área junto a su número

- **Pantallas:** `/`.
- **Qué cambió:** en las tres cajas de la portada, el título («Tu rutina de hoy», «Tu dolor,
  atendido», «Progreso visible») pasa a la misma fila que su número, a la derecha. Debajo
  sigue la descripción. Para que los títulos quepan en una línea en escritorio:
  - van a 15 px;
  - la fila de cajas se ensancha un poco hacia el panel del logo (`lg:-mr-14`);
  - el relleno lateral de las cajas baja a 14 px.
- **Por qué:** se pidió que el título fuera al lado del número.
- **Archivos:** [`app/page.tsx`](../app/page.tsx). La rejilla de cada caja pasa de tres filas
  a dos: número con título, y descripción.
- **Contratos de suites:** ninguno.
- **Verificación:**
  - **Capturas:**
    - a 1340 px, los tres títulos en una línea;
    - a 375 px, sin desplazamiento horizontal.
  - **Calidad:** `lint` y `test:design` (5/5) en verde.
  - **Suites:** `test:smoke` 11/11.
- **Change de OpenSpec:** no aplica.
- **Commit / PR:** pendiente; por ahora se trabaja solo en local.
- **Pendiente:** nada.

### 2026-10-03 — Un ojo en lugar de «Mostrar/Ocultar» en la contraseña

- **Pantallas:**
  - `/login`, en el campo de contraseña;
  - `/actualizar-contrasena`, en los dos campos.
- **Qué cambió:** el botón de texto «Mostrar/Ocultar» pasa a ser un icono:
  - un ojo abierto cuando la contraseña está oculta;
  - un ojo tachado cuando está a la vista.

  Como el botón ya no tiene texto, lleva `aria-label` y `title`: «Mostrar contraseña» u
  «Ocultar contraseña». Sigue indicando con `aria-pressed` si la contraseña se ve. El campo
  reserva menos espacio a la derecha (`pr-12` en vez de `pr-24`).
- **Por qué:** se pidió un ojito en vez del texto.
- **Archivos:** [`components/auth/AuthForm.tsx`](../components/auth/AuthForm.tsx)
  (`PasswordInput`), con los iconos `Eye` y `EyeOff` de `lucide-react`, que ya era
  dependencia del proyecto.
- **Contratos de suites:** ninguno. El botón sigue siendo `type="button"` y no tiene `name`.
- **Verificación:**
  - **Prueba con Playwright:** pulsar «Mostrar contraseña» pone el campo en `type="text"`,
    `aria-pressed="true"` y la etiqueta pasa a «Ocultar contraseña».
  - **Calidad:** `typecheck`, `lint` y `test:design` (5/5) en verde.
  - **Suites:** `test:auth:screens` 10/10 y `test:smoke` 11/11.
- **Change de OpenSpec:** [`refresh-auth-screens`](../openspec/changes/refresh-auth-screens/proposal.md), tarea 1.9. El requisito se actualizó: el control ya no se nombra por su texto visible.
- **Commit / PR:** pendiente; por ahora se trabaja solo en local.
- **Pendiente:** nada.

### 2026-10-03 — Migas de pan para volver al inicio desde el acceso

- **Pantallas:** `/login`, `/recuperar` y `/actualizar-contrasena`.
- **Qué cambió:** arriba a la izquierda del panel oscuro aparece «← Inicio › Iniciar sesión»
  en blanco; el último tramo es «Recuperar acceso» o «Nueva contraseña» según la pantalla.
  «Inicio» lleva a la portada. En el teléfono solo se ve «← Inicio», encima del logo: el
  nombre de la pantalla chocaba con el conmutador de tema, y el título de la tarjeta ya lo
  dice.
- **Por qué:** se pidió una forma visible de regresar a la portada desde el login.
- **Archivos:** el nuevo [`AuthBreadcrumb`](../components/auth/AuthBreadcrumb.tsx) y
  [`AuthBrandPanel`](../components/auth/AuthBrandPanel.tsx).
  - **Por qué es de cliente:** `AuthBreadcrumb` necesita `usePathname`, porque el layout no
    sabe qué pantalla muestra.
  - **Por qué sale en blanco:** el panel lleva la clase `dark`, así que el texto sale claro
    sin escribir ningún color.
- **Contratos de suites:** ninguno. Es un `<nav>` con enlaces, sin formularios.
- **Verificación:**
  - **Calidad:** `typecheck`, `lint` y `test:design` (5/5) en verde.
  - **Suites:** `test:auth:screens` 10/10 y `test:smoke` 11/11.
  - **Capturas:**
    - escritorio en claro y en oscuro;
    - móvil a 375 px, sin desplazamiento horizontal.
- **Change de OpenSpec:** [`refresh-auth-screens`](../openspec/changes/refresh-auth-screens/proposal.md), tarea 1.8.
- **Commit / PR:** pendiente; por ahora se trabaja solo en local.
- **Pendiente:** nada.

### 2026-10-03 — Rediseñar la portada

- **Pantallas:** `/`, la portada pública, sin sesión.
- **Qué cambió:**
  - **Antes:** el logo dorado iba en una caja blanca, el titular en Figtree y a la derecha
    había una tarjeta «Tu semana» con tres puntos numerados.
  - **Ahora, mitad izquierda:** el saludo «ENTRENAMIENTO Y FISIOTERAPIA» y el titular
    «ENTRENA TU MEJOR VERSIÓN.», en Russo One inclinada y con un corte fino a media altura de
    cada línea. Debajo, el texto y las tres áreas en cajas de contorno amarillo con su número
    (1, 2, 3) en un cuadrado redondeado, y al final el botón «Comenzar ahora», que lleva a
    `/login`.
  - **Ahora, mitad derecha:** el logo sin margen sobre un fondo vectorial de triángulos
    concéntricos, trama de puntos y diagonales finas. El logo es dorado en claro y blanco en
    oscuro.
  - **Las dos mitades comparten el mismo fondo:** no hay ningún corte entre ellas, ni en
    claro ni en oscuro.
  - **En el teléfono:** el logo pasa a una franja arriba y el resto va debajo, en el mismo
    orden.
- **Por qué:** se pidió una portada más natural y minimalista, con el estilo del login. Se
  iteró sobre una maqueta aparte antes de tocar el código, en este orden:
  - se quitó la tarjeta;
  - los vectores sustituyeron a la foto;
  - el fondo quedó integrado en los dos temas;
  - los vectores se marcaron más en claro;
  - el titular pasó a una tipografía deportiva estilo «EDGE»;
  - los números de las áreas pasaron a cajas con cuadrado;
  - el botón bajó al final.
- **Archivos:**
  - **Portada:** [`app/page.tsx`](../app/page.tsx), con el titular, las áreas y el botón.
  - **Fondo vectorial:** [`HomeArt`](../components/home/HomeArt.tsx).
  - **Logo recortado según el tema:** [`ClientLogoCropped`](../components/brand/ClientLogoCropped.tsx).
  - **Tokens de marca:** [`BRIGHT_BRAND_STYLE`](../components/brand/bright-brand.ts) redefine
    los tokens de marca con `--brand-bright`. Lo comparten la portada y
    [`app/(auth)/layout.tsx`](../app/(auth)/layout.tsx), que antes tenía su propia copia.
  - **Tipografía:** `--font-display` en [`app/globals.css`](../app/globals.css), que es
    **compartido**: hay que avisarlo en el PR.
- **Contratos de suites:**
  - La portada sigue teniendo un `h1` y un único conmutador de tema, que es lo que mira
    `test:smoke`.
  - Ninguna suite busca los textos de la portada; «Iniciar sesión» pasó a «Comenzar ahora»
    sin romper nada.
- **Verificación:**
  - **Calidad:** `typecheck`, `lint`, `build` y `test:design` (5/5, con la copia corregida
    para Windows) en verde.
  - **Suites:** `test:auth:screens` 10/10 y `test:smoke` 11/11.
  - **Capturas con Playwright:**
    - escritorio a 1340 px, en claro y en oscuro;
    - móvil a 375 px;
    - sin desplazamiento horizontal;
    - sin errores de consola;
    - el titular resuelve a Russo One.
  - **Login:** se revisó que sigue igual tras compartir `BRIGHT_BRAND_STYLE`.
- **Change de OpenSpec:** no aplica. Es una sola pantalla y no cambia lo que hace; el único
  cambio compartido es un token de tipografía, documentado en `docs/10`.
- **Commit / PR:** pendiente; por ahora se trabaja solo en local.
- **Pendiente:**
  - **Cortes del titular:** van en `em` y calculados para un interlineado de 1,05em y dos
    líneas. Si cambia el texto, el tamaño o el interlineado, hay que recalcularlos (ver el
    comentario en `app/page.tsx`).
  - **Contraste del amarillo:** el saludo en amarillo sobre blanco da 2,1:1, lo mismo que en
    el login.
  - **`ClientLogo` sin uso:** ya no se usa en ninguna pantalla, pero se conserva porque
    presenta el original completo y lo cita el README de la marca.
  - **Teléfono real:** falta revisarlo en un dispositivo de verdad.

### 2026-10-03 — Mismo amarillo en claro y en oscuro en las pantallas de acceso

- **Pantallas:** `/login`, `/recuperar` y `/actualizar-contrasena`.
- **Qué cambió:** en tema claro, estos elementos pasan del dorado oscuro (`#876000`) al
  amarillo del logo (`#e0aa25`), el mismo del tema oscuro:
  - el saludo («QUÉ BUENO VERTE»);
  - «¿La olvidaste?»;
  - «Volver al inicio de sesión»;
  - el foco de los campos;
  - el tema activo, que ahora es un relleno amarillo.
- **Por qué:** se pidió que el amarillo fuera igual en los dos temas, **solo en las pantallas
  de acceso**. Se descartó cambiarlo en toda la aplicación, porque sobre blanco el texto
  amarillo no se lee bien.
- **Archivos:** [`app/(auth)/layout.tsx`](../app/(auth)/layout.tsx). `<main>` redefine
  `--brand`, `--brand-soft`, `--brand-soft-foreground` y `--ring` a partir de
  `--brand-bright` en un `style`, y todo lo de dentro lo hereda. Se probó antes con
  propiedades arbitrarias de Tailwind (`[--brand:…]`), pero el servidor de desarrollo no
  generó esas clases.
- **Contratos de suites:** ninguno.
- **Verificación:**
  - En el navegador, el saludo, el enlace y el tema activo calculan `rgb(224, 170, 37)`.
  - `typecheck` y `lint` en verde.
  - `test:design` 5/5 y `test:auth:screens` 10/10.
- **Change de OpenSpec:** [`refresh-auth-screens`](../openspec/changes/refresh-auth-screens/proposal.md), tarea 1.7.
- **Commit / PR:** pendiente; por ahora se trabaja solo en local.
- **Pendiente:**
  - **Legibilidad (WCAG 1.4.3).** Como texto pequeño sobre blanco, el amarillo da 2,1:1
    frente al mínimo de 4,5:1 en el saludo y los enlaces. Fue una decisión consciente, y
    conviene revisarla si un paciente tiene dificultad para leerlos.

### 2026-10-03 — Rediseñar las pantallas de acceso

- **Pantallas:** `/login`, `/recuperar` y `/actualizar-contrasena`; las ven todos los roles
  antes de entrar.
- **Qué cambió:**
  - **Antes:** logo pequeño dentro de la tarjeta, panel izquierdo solo con texto y «Olvidé
    mi contraseña» debajo del botón.
  - **Ahora, panel de marca:** siempre oscuro, con el logo blanco grande y centrado sobre una
    foto de gimnasio atenuada. En el teléfono es una franja corta.
  - **Ahora, formulario:** va en una tarjeta en alto relieve, con:
    - encabezado común;
    - «¿La olvidaste?» junto a la contraseña;
    - «Mostrar/Ocultar» en los campos de contraseña;
    - botón en el amarillo del logo;
    - «¿Aún no tienes acceso?» centrado en dos líneas.
- **Por qué:** se pidió el 2026-10-03 para que el acceso transmita la marca. Se iteró sobre una
  maqueta aparte (tarjeta en relieve, sin la lista 1-2-3, logo blanco y visible, foto
  discreta, amarillo de marca, sin filete amarillo ni pie en la tarjeta) antes de tocar el
  código.
- **Archivos:**
  - **Pantallas:** [`app/(auth)/layout.tsx`](../app/(auth)/layout.tsx) y las tres páginas.
  - **Componentes:** [`AuthForm`](../components/auth/AuthForm.tsx) y los nuevos
    [`AuthBrandPanel`](../components/auth/AuthBrandPanel.tsx) y
    [`AuthHeading`](../components/auth/AuthHeading.tsx).
  - **Tokens:** `--brand-bright` en [`app/globals.css`](../app/globals.css), que es
    **compartido**: hay que avisarlo en el PR.
  - **Recursos:** `CLIENT_AUTH_BACKGROUND` en [`lib/brand/client.ts`](../lib/brand/client.ts)
    y `public/brand/amadortrainer/fondo-acceso.webp` (9 KB).
- **Contratos de suites:**
  - `/login` sigue teniendo un único formulario con `name="email"`.
  - «Mostrar» es `type="button"` sin `name`, así que no se envía con el formulario.
  - Contrato que no estaba en `docs/11`: `test:smoke` exige **un solo** conmutador de tema por
    pantalla (`[aria-label="Tema de la aplicación"]`). Una primera versión tenía dos, uno
    oculto según el ancho, y la suite cayó. Ahora hay uno, colocado con `absolute`, y el
    contrato queda escrito en `docs/11` §3.
- **Verificación:**
  - **Calidad:** `typecheck`, `lint` y `build` en verde. `test:design` da 5/5 con una copia
    que corrige la ruta en Windows (ver «Pendiente»).
  - **Suites:**
    - `test:auth:screens` 10/10;
    - `test:people` 11/11;
    - `test:auth:resilience` 16/16;
    - `test:smoke` 11/11 contra `next dev`.
  - `test:auth` no corre en Windows sin el modo desarrollador: necesita crear enlaces
    simbólicos y falla antes de llegar a la app (`EPERM`). No es de este cambio.
  - **En el navegador:**
    - a 375 px y en escritorio, en claro y en oscuro;
    - credenciales erróneas;
    - «Mostrar/Ocultar»;
    - acceso correcto a `/patient`;
    - contraseña nueva;
    - sin desplazamiento horizontal.
- **Change de OpenSpec:** [`refresh-auth-screens`](../openspec/changes/refresh-auth-screens/proposal.md).
- **Commit / PR:** pendiente.
- **Pendiente:**
  - **Licencia de la foto de fondo.** Es una referencia de stock; antes de
    producción hay que cambiarla por una foto propia del cliente o con licencia libre
    (tarea 3.1).
  - **Teléfono real.** Revisión en un dispositivo de verdad (tarea 2.5, en la pasada de
    `docs/15` C.1).
  - **`test:design` en Windows.** Falla en esta plataforma por cómo calcula la raíz del
    repositorio (`URL.pathname` da `C:\C:\…`). No es de este cambio.
