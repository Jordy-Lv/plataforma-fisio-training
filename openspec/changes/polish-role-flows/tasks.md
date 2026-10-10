# Tasks

## 1. Recorrido

- [x] 1.1 Recorrer y medir las rutas de los cuatro perfiles (estado, tiempo de servidor, peso del HTML). Verificación: todas en 200 o redirigen al panel propio; ninguna pasa de 110 ms en local.

## 2. Profesional

- [x] 2.1 `nextScheduledDay` en `calendar-queries.ts` y aviso de programación en el paso 3. Verificación: sin programación aparece «Falta programar sus días»; con sesión hoy, «Próxima sesión: hoy».
- [x] 2.2 Descripción de `/pro/routines` acorde con ADR-0009.

## 3. Paciente

- [x] 3.1 «Empezar sesión» antes de la lista en `TodayRoutineDay`. Verificación: `test:routines:sessions` en verde y botón visible a 375 px sin desplazarse.
- [x] 3.2 Aviso de pendientes en una línea en `SessionProgress`. Verificación: `test:smoke` en verde.
- [x] 3.3 Accesos de la portada sin flecha por debajo de `sm`. Verificación: «Mi evolución» entero a 375 px.

## 4. Catálogo y títulos

- [x] 4.1 `ExerciseFilters` sobre `ListFilters`. Verificación: `test:catalog` en verde.
- [x] 4.2 `metadata.title` en las trece pantallas sin título.

## 5. Cierre

- [ ] 5.1 Revisión en un teléfono real (cabe en la pasada de `docs/15` C.1).
