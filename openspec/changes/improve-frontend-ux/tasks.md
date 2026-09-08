Antes de empezar cualquier sección, lee
[`docs/11-contratos-de-las-suites-http.md`](../../../docs/11-contratos-de-las-suites-http.md)
y el protocolo de [`ejecucion.md`](ejecucion.md). Cada sección es un pull request.

Las cinco fases de [`design.md`](design.md) se reparten así, y el orden no es negociable:

| Fase | Secciones | Rama por sección |
|---|---|---|
| 1 · Filtros y listados | 1, 2, 3, 4 | `ui/listados-*` |
| 2 · Ficha del paciente | 5, 6 | `ui/ficha-paciente*` |
| 3 · Paciente móvil | 7, 8, 9, 10 | `fix/sesion-acuses`, `ui/paciente-*`, `ui/estados-pendientes` |
| 4 · Edición del personal | 11, 12 | `ui/confirmaciones`, `ui/catalogo-embebido` |
| 5 · Comodidad | 14, 15, 16, 17 | `ui/densidad-listados`, `ui/detalle-en-dialogo`, `ui/acceso-directo`, `ui/estandar-de-manejo` |
| 6 · Cierre | 13 | `docs/cierre-frontend` |

La sección 7 —los dos defectos de la sesión del paciente— puede adelantarse como corrección
independiente si hace falta para una demostración.

La fase 5 se añadió el 2026-09-07 después de medir las pantallas en el navegador
(`docs/12-medicion-de-densidad.md`). Las secciones 1–4 acotan **cuántas** filas se traen;
la fase 5 acota **cuánto ocupa** cada una y **cuánto cuesta llegar** a ella. La 14 depende
de la 1 (necesita `createListParams`), la 15 de nada, y la 16 de la 3 (necesita
`listPeople`) y de la 5 (necesita la agregación del paciente). La sección 13 se ejecuta al
final, después de la 16.

## 1. Cimientos y `/exercises` — rama `ui/listados-cimientos`

- [ ] 1.1 Crear `lib/shared/list-params.ts` con `pageParam`, `searchParam`, `optionalEnum`, `optionalId` y `createListParams({ path, schema, pageSize })` que devuelva `schema`, `pageSize`, `parse`, `href`, `hasActiveFilters`, `empty`, `range` y `pages`; todos los miembros como funciones flecha del closure, para que se puedan desestructurar
- [ ] 1.2 Crear `components/ui/FilterForm.tsx`: `<form method="get">` renderizado en el servidor, autoenvío inmediato al cambiar `<select>`/casilla y con 300 ms de retardo al escribir, `router.push` para lo primero y `router.replace` para lo segundo, `preventDefault` + `FormData` + `startTransition`, `aria-busy` mientras navega, `data-enhanced="true"` tras hidratar y limpieza del temporizador al desmontar
- [ ] 1.3 Verificar con `curl` que el `<form method="get">` y su botón siguen en el HTML del servidor, y a mano que `/exercises` filtra con JavaScript desactivado
- [ ] 1.4 Crear `components/ui/Pagination.tsx` (Server Component) con `{ page, pages, hrefFor, label }`, conservando `Anterior`, `Siguiente`, `rel="prev"/"next"` y `<p aria-live="polite">Página X de Y</p>`; `null` con una sola página y extremos desde cinco
- [ ] 1.5 Crear `components/ui/Chip.tsx` (píldora de filtro activo que enlaza al listado sin ese filtro), `components/ui/Skeleton.tsx` y `components/ui/DataList.tsx`
- [ ] 1.6 Reescribir `lib/catalog/schemas.ts` sobre `createListParams` conservando `exerciseFiltersSchema`, `exercisesHref` y `hasActiveFilters`; comprobar que `exerciseFiltersSchema.parse({ q })` con un subconjunto de claves sigue devolviendo el resto en `undefined`
- [ ] 1.7 Añadir `options?: { pageSize?: number }` a `listExercises`
- [ ] 1.8 Migrar `ExerciseFilters` a `FilterForm` sin cambiar ningún `name`, y añadir la fila de `Chip` de filtros activos
- [ ] 1.9 Migrar `ExercisePagination` a `Pagination` con `label="Páginas del catálogo"`
- [ ] 1.10 Verificar que `/exercises` conserva el `<h2 class="text-base font-semibold leading-6">` de la tarjeta, la frase `N ejercicios encontrados`, y los textos `Ningún ejercicio coincide con estos filtros` y `Ver todo el catálogo` del estado vacío filtrado
- [ ] 1.11 Migrar los `loading.tsx` existentes a `Skeleton` sin cambiar su forma
- [ ] 1.12 `npm run test:catalog` y `npm run test:catalog:custom` en verde, más los cuatro de CI

## 2. Catálogo: plantillas, reglas, planes — rama `ui/listados-catalogo`

- [ ] 2.1 Crear `lib/catalog/template-list.ts` con `q`, `kind`, `goal`, `level`, `environment`, `status` e `incomplete`, todos nacidos en «todas»
- [ ] 2.2 Extender `listTemplates(filters?)` para devolver `{ templates, total, pages }`; sin argumento, primera página sin filtro
- [ ] 2.3 Montar filtros y paginación en `/templates`, conservando el `?eliminada=1` que ya se lee
- [ ] 2.4 Crear `lib/catalog/rule-list.ts` con `q`, `status`, `state=broken` y `template`; **sin ninguna clave de ordenación**
- [ ] 2.5 Extender `listRules(filters?)` **sin tocar** `.order("priority").order("created_at")`
- [ ] 2.6 Ocultar los controles de mover en `/rules` cuando hay filtros activos o página mayor que uno, con un aviso que explique por qué
- [ ] 2.7 Sacar el error de mover del atributo `title` del botón a un mensaje visible bajo el par de botones, conservando los dos formularios separados con su `name="direction"`
- [ ] 2.8 Añadir `filters?` a `listAllPlans` y `listAllServices` con `q` y estado; agrupación de `/offer` intacta
- [ ] 2.9 Verificar que `/rules` sin filtros sigue conteniendo el formulario de mover con `value="<ruleId>"` y `value="up"`
- [ ] 2.10 `npm run test:templates`, `test:templates:seed`, `test:rules:panel`, `test:rules:seed` y `test:plans` en verde, más los cuatro de CI

## 3. Personas y atención — rama `ui/listados-personas`

- [ ] 3.1 Crear `lib/auth/people-queries.ts` con `listPeople(scope, filters)` y `listPatientProfiles(filters)`, sacando la consulta que hoy vive dentro de `PeoplePanel.tsx`
- [ ] 3.2 Sustituir por `listPatientProfiles` las consultas inline duplicadas de `/pro/routines` y `/pro/sessions`
- [ ] 3.3 Montar filtros en `PeoplePanel` con **solo** `q`, `role` y `state`; el filtro por profesional, como `Chip` enlazado. **Ningún `value="<uuid>"` en el formulario de filtros**
- [ ] 3.4 Verificar que en `/admin` y `/pro` el primer formulario con `value="<uuid de la persona>"` sigue siendo el de la baja, y que el del alta conserva `name="fullName"`
- [ ] 3.5 Montar filtros y paginación en `/pro/routines`, con el estado de la rutina visible en la tarjeta
- [ ] 3.6 Extender `patientSessions(patientId, filters?)` con `count:"exact"` y `.range()`, retirando el `.limit(50)`; filtros de estado y de rango de fechas en `/pro/sessions`
- [ ] 3.7 Extender `clinicalAlerts(filters?)` retirando el `.limit(200)`, con filtros de leídas, tipo, severidad y paciente, y página de veinte o más
- [ ] 3.8 Llevar el conteo de alertas sin leer a la consulta, en vez de calcularlo sobre la lista recortada
- [ ] 3.9 Verificar que `/pro/alerts` sin filtros muestra la alerta más reciente y conserva el formulario con `value="<alertId>"`
- [ ] 3.10 `npm run test:people` y `npm run test:routines:sessions` en verde, más los cuatro de CI

## 4. Seguimiento — rama `ui/listados-seguimiento`

- [ ] 4.1 Extender `listPatientsWithMonthAttendance(filters?)` con `month` en formato `YYYY-MM` —por defecto el mes en curso— sustituyendo el rango fijo, más `q` y «sin asistencias»
- [ ] 4.2 Selector de mes en `/attendance`, con navegación al mes anterior y siguiente
- [ ] 4.3 Extender `listPatientsWithLastScreening(filters?)` con `q` y «sin tamizaje»
- [ ] 4.4 Extender `listMembershipsWithPatient(filters?)` y `listPatientsWithMembership(filters?)` con `q`, `status` y `plan`
- [ ] 4.5 Filtros de `/memberships` como `Chip` encima de las tres secciones, que se conservan con sus rótulos cuando no hay estado activo
- [ ] 4.6 Verificar que `/memberships` sigue conteniendo `Próximas a vencer`, `Vencidas` y `vence en N días`, y que la vista del profesional muestra a su paciente sin filtrar
- [ ] 4.7 `npm run test:attendance`, `test:screenings`, `test:memberships` y `test:overview` en verde, más los cuatro de CI

## 5. Ficha del paciente: agregación y banda — rama `ui/ficha-paciente`

- [ ] 5.1 Crear `lib/progress/patient-overview.ts` con `patientOverview(patientId)`: membresía, condiciones activas, último tamizaje, asistencia del mes, rutina activa, sesión abierta y alertas sin leer, en un `Promise.all` y sin ninguna consulta dentro de un `map`
- [ ] 5.2 Crear `components/patients/PatientTabs.tsx` (Server Component, activo por props) con desplazamiento horizontal a 375 px, objetivos de 44 px, `aria-current` y **sin ningún `<form>` dentro**
- [ ] 5.3 Crear `components/patients/PatientHeader.tsx` con nombre, estado, membresía y condiciones, reutilizando `membershipBadgeVariant`
- [ ] 5.4 Añadir el resumen a `/people/[id]` **antes** del contenido actual, dejando los formularios de perfil y de condición en su sitio y en su orden
- [ ] 5.5 Añadir `app/(people)/people/[id]/loading.tsx` con la forma real de la ficha
- [ ] 5.6 Verificar que en `/people/[id]` el primer formulario con `name="goal"` y el primero con `name="conditionId"` siguen siendo los mismos
- [ ] 5.7 `npm run test:people` en verde, más los cuatro de CI

## 6. Ficha del paciente: montaje y enlaces — rama `ui/ficha-paciente-enlaces`

- [ ] 6.1 Montar cabecera y pestañas en `/pro/routines/[patientId]`, **antes** del formulario de asignación, que sigue siendo el primero con `name="patientId"`
- [ ] 6.2 Montarlas en `/pro/sessions` cuando hay paciente seleccionado, `/attendance/[patientId]`, `/screenings/[patientId]` y `/evolution/[patientId]`
- [ ] 6.3 Verificar que `/evolution/[patientId]` conserva `<option value="weight">Peso</option>` e `<option value="bmi">IMC</option>`, y que la gráfica sigue sin montarse cuando no hay datos
- [ ] 6.4 Enlazar a la ficha desde `PeoplePanel`, `/pro/routines`, `/attendance` y `/screenings`
- [ ] 6.5 Comprobar a mano que desde cualquier sección de un paciente se llega a las otras cinco en un toque
- [ ] 6.6 `npm run test:routines`, `test:routines:items`, `test:attendance`, `test:screenings` y `test:evolution` en verde, más los cuatro de CI

## 7. Los dos defectos del paciente — rama `fix/sesion-acuses`

- [ ] 7.1 Cambiar la `key` de la tarjeta de ejercicio a `key={item.id}` y comentar por qué no puede volver a depender del registro
- [ ] 7.2 Comprobar en el navegador que al guardar un registro el bloque sigue abierto y «Registro guardado» permanece a la vista
- [ ] 7.3 Mover el acuse de cierre al informe de la sesión, que sí se renderiza tras cerrar; **no** usar `redirect()`
- [ ] 7.4 Verificar que la respuesta del envío de cierre contiene `Sesión completada` o `Completada` y **no** contiene `Terminar sesión`
- [ ] 7.5 `npm run test:routines:sessions` en verde, más los cuatro de CI

## 8. La sesión en curso — rama `ui/paciente-sesion`

- [ ] 8.1 Crear `components/ui/Progress.tsx` sobre la primitiva de `@base-ui/react`
- [ ] 8.2 Banda de avance fija con la barra, el conteo de ejercicios registrados y accesos por ancla a cada ejercicio
- [ ] 8.3 Abrir el bloque de registro del primer ejercicio pendiente, resuelto en el servidor
- [ ] 8.4 Subir «Terminar sesión» a la banda con aviso de los ejercicios sin registrar; **el texto del aviso no puede contener la cadena `Terminar sesión`**
- [ ] 8.5 Añadir `bodyPartsByMuscleGroup` a `lib/catalog/body-parts.ts` y acotar la zona del dolor al grupo muscular del ejercicio, con salida a la lista completa
- [ ] 8.6 Cambiar `replacementExercises()` a `(muscleGroups?, limit = 200)` con `.overlaps()`, y hacer una sola llamada por sesión en vez de una por ejercicio
- [ ] 8.7 Verificar que el registro sigue enviándose con `name="itemId"` y que el catálogo completo sigue alcanzable
- [ ] 8.8 `npm run test:routines:sessions` en verde, más los cuatro de CI

## 9. Rutina y portada del paciente — rama `ui/paciente-inicio`

- [ ] 9.1 Subir la sesión en curso al principio de `/routine` con acceso para reanudarla
- [ ] 9.2 Colapsar los días en bloques plegables, con el botón de iniciar visible en la cabecera de cada uno
- [ ] 9.3 Verificar que `/routine` conserva el formulario con `value="<dayId>"` por día, el vacío «Tu profesional está preparando tu rutina» y la ausencia de «Pendiente de revisión»
- [ ] 9.4 Dar dato propio a las cuatro tarjetas de `/patient`, reutilizando la agregación de la sección 5
- [ ] 9.5 Añadir `loading.tsx` a `/routine` y a `/routine/sessions/[sessionId]`
- [ ] 9.6 Revisar las cinco pantallas del paciente a 375 px, en claro y en oscuro
- [ ] 9.7 `npm run test:routines:sessions` y `test:auth:screens` en verde, más los cuatro de CI

## 10. Estados pendientes y avisos — rama `ui/estados-pendientes`

- [ ] 10.1 Crear `components/ui/SubmitButton.tsx` con `useFormStatus`
- [ ] 10.2 Devolver al servidor los componentes que hoy son de cliente solo para deshabilitar su botón
- [ ] 10.3 Crear `components/ui/FlashToast.tsx`, que convierte el acuse de la URL en aviso efímero y limpia la URL, conservando el mensaje del servidor debajo
- [ ] 10.4 Estado optimista al marcar una alerta como leída; **no generalizarlo**
- [ ] 10.5 Comprobar que ninguna server action queda envuelta en una función de cliente
- [ ] 10.6 Las veinticinco suites en verde, más los cuatro de CI

## 11. Confirmación de acciones destructivas — rama `ui/confirmaciones`

- [ ] 11.1 Crear `components/ui/ConfirmSubmit.tsx`: botón de envío que intercepta su clic, abre el diálogo y confirma con `form.requestSubmit()`, dejando intacto el `<form action>` y su rótulo
- [ ] 11.2 Aplicarlo a quitar un ejercicio de la rutina, conservando ese formulario como el primero del ítem y sin `name="sets"`
- [ ] 11.3 Aplicarlo a quitar un ejercicio de una plantilla y a eliminar un día, conservando el rótulo `Eliminar día`
- [ ] 11.4 Aplicarlo a eliminar una plantilla, conservando el rótulo `Eliminar plantilla`
- [ ] 11.5 Aplicarlo a eliminar una regla
- [ ] 11.6 Aplicarlo a asignar una rutina cuando reemplaza a la activa, **sin añadir ningún campo obligatorio** al formulario
- [ ] 11.7 Comprobar las seis confirmaciones con JavaScript activado y desactivado
- [ ] 11.8 `npm run test:templates`, `test:rules:panel`, `test:routines` y `test:routines:items` en verde, más los cuatro de CI

## 12. Construir una plantilla sin recargar — rama `ui/catalogo-embebido`

- [ ] 12.1 Buscador único y permanente en `/templates/[id]`, con filtros, paginación y `pageSize` reducido, y un `<select name="dayId">` por resultado
- [ ] 12.2 Verificar que el formulario de añadir sigue conteniendo `value="<exerciseId>"` y que los de eliminar conservan sus rótulos
- [ ] 12.3 Mismo buscador en `/pro/routines/[patientId]`, **conservando el comportamiento de `?dia=` y `?item=`**, que la suite abre literalmente
- [ ] 12.4 Comprobar que en esa pantalla el formulario de quitar sigue siendo el primero del ítem
- [ ] 12.5 Sustituir los acuses de la URL por `FlashToast` en `/templates`, `/rules`, `/exercises` y `/plans`
- [ ] 12.6 `npm run test:templates`, `test:templates:seed` y `test:routines:items` en verde, más los cuatro de CI

## 13. Cierre — rama `docs/cierre-frontend`

- [ ] 13.1 Añadir a `docs/10-sistema-de-diseno.md` los componentes nuevos y cuándo usar `ConfirmDialog` frente a `ConfirmSubmit`
- [ ] 13.2 Escribir `docs/adr/0009-estado-de-listado-en-la-url.md`: por qué el estado vive en la URL y por qué el autoenvío no es una excepción del ADR-0008
- [ ] 13.3 Declarar `lib/shared/**` como territorio compartido en la sección 3 de `CLAUDE.md`
- [ ] 13.4 Añadir a `scripts/verify-design-system.test.mjs` la comprobación de que todo segmento dinámico con `page.tsx` tiene su `loading.tsx`
- [ ] 13.5 Recorrer los caminos del paciente en un teléfono real y registrar el resultado
- [ ] 13.6 Las veinticinco suites en verde sobre la rama fusionada, más los cuatro de CI

## 14. Densidad de los listados — rama `ui/densidad-listados`

Nace de la medición del 2026-09-07 (`docs/12-medicion-de-densidad.md`): paginar acota el
total pero no la altura de la página. Con los filtros de las secciones 1–4 ya montados,
esto es lo que hace que una lista quepa.

- [x] 14.1 Añadir `vista` (`tarjetas` | `lista`) a `createListParams`, con `tarjetas` por defecto y el valor en la URL como un parámetro más
- [x] 14.2 Crear `components/ui/DataRow.tsx`: fila de 64 px con miniatura de 48 px, título, dos campos secundarios y un objetivo táctil de 44 px, tomando como referencia la tarjeta de `/pro/routines`, que hoy mide 66 px
  - Creada junto con 17.2. `DataRow` recibe `media`/`icon` (48 px), `title` —lo pinta quien llama para no perder el `<h2>` de contrato del catálogo—, `secondary`, `trailing` y siempre un chevron. La adoptan los listados en sus propias secciones; aquí sólo se estrena en `ExerciseRow`.
- [x] 14.3 Montar el conmutador tarjetas/lista en `/exercises` como dos enlaces (**no** un `<form method="get">`: la pantalla no admite otro formulario antes del de filtros), y subir `pageSize` cuando la vista es lista (quedó en 60, no en 48: medida la fila, 60 caben en las mismas pantallas que 24 tarjetas)
- [x] 14.4 Verificar que en vista de tarjetas `/exercises` conserva el `<h2 class="text-base font-semibold leading-6">` que lee `verify-catalog-list.test.mjs`, y que en vista de lista el mismo `<h2>` sigue siendo el primer elemento con el nombre del ejercicio
- [x] 14.5 Plegar la evidencia de cada alerta en `/pro/alerts`: la primera sesión visible, el resto tras un `<details>` con el rótulo «Ver las otras N sesiones». La alerta baja de 658 px a unos 240
- [x] 14.6 Verificar que `/pro/alerts` conserva el formulario con `value="<alertId>"` y que la evidencia plegada sigue en el HTML del servidor —`<details>` sin JavaScript se abre igual—, no en un portal
  - `EvidenceItem` extraído; la primera sesión se ve, el resto va en `<details>`. `test:routines:sessions` 18/18 contra la app viva: «Camino 5: sesión 3» (3ª sesión, plegada) y el formulario `value="<alertId>"` siguen en el HTML. **Falta medir el px antes/después en Chrome (14.9).**
- [ ] 14.7 Añadir `orden` a `exerciseList`, `templateList` y a los listados de seguimiento, con las claves que cada pantalla puede ordenar y sin tocar el `.order("priority")` de `/rules`
- [ ] 14.8 Ordenación por defecto explícita en cada listado, documentada en un comentario junto a su `createListParams`
- [ ] 14.9 Medir de nuevo `/exercises` y `/pro/alerts` en Chrome a 1440×900 y 606×667 y registrar las cifras en `docs/12-medicion-de-densidad.md`
- [ ] 14.10 `npm run test:catalog`, `test:catalog:custom` y `test:routines:sessions` en verde, más los cuatro de CI

Añadidas tras la revisión de Yordy en Safari (2026-09-07): las pantallas de edición abrían
con **todos los formularios de todos los ejercicios desplegados a la vez**. Mismo patrón que
`/patient/profile` (17.3): resumen en una línea, formulario tras un `<details>` cerrado.

- [x] 14.11 `/pro/routines/[patientId]`: cada ejercicio muestra su prescripción en una línea («4 × 8 · 45 kg · 90 s de descanso») y el `RoutineItemForm` + la sustitución van en un `<details>` cerrado, forzado abierto con `?item=<id>`. El botón de quitar queda fuera y primero del ítem. `test:routines:items` 9/9.
- [x] 14.12 `/templates/[id]`: `ItemSummary` (que ya existía para la vista de solo lectura) se muestra siempre; el `ItemForm` y la cabecera de día (renombrar/eliminar) van en `<details>` cerrados. `test:templates` 19/19.

## 15. Detalle sin salir de la pantalla — rama `ui/detalle-en-dialogo`

`Dialog` lleva construido desde la fase 3 del rediseño y hoy solo lo usa `OfferControls`.
Las tres lecturas de aquí son territorio libre: ninguna suite las recorre, porque no hay
ningún `<form>` dentro. **Ninguna de estas tareas mueve un formulario a un diálogo**
(ADR-0008).

- [ ] 15.1 Crear `components/ui/DetailDialog.tsx`: diálogo de solo lectura con su disparador, cierre por `Esc` y por clic fuera, y foco devuelto al disparador
- [ ] 15.2 Ficha del ejercicio desde `/exercises` en `DetailDialog` —nombre, imagen, indicaciones, músculos, equipo, entorno, nivel—, **conservando** el enlace a `/exercises/[id]` como ruta propia para compartir y para quien no tenga JavaScript
- [ ] 15.3 Evidencia completa de una alerta en `DetailDialog`, encadenada con el plegado de 14.5
- [ ] 15.4 Detalle de una sesión desde `/pro/alerts` y desde `/pro/sessions` en `DetailDialog`, conservando `/pro/sessions/[sessionId]` como ruta
- [ ] 15.5 Comprobar con `curl` que las tres pantallas no han perdido ningún `<form>` del HTML del servidor, y a mano que con JavaScript desactivado los enlaces siguen llevando a la ruta completa
- [ ] 15.6 `npm run test:catalog`, `test:routines:sessions` y `test:overview` en verde, más los cuatro de CI

## 16. Llegar al paciente sin recorrer una lista — rama `ui/acceso-directo`

Las pestañas de las secciones 5 y 6 resuelven moverse **dentro** de un paciente. Esto
resuelve llegar hasta él.

- [ ] 16.1 Crear `lib/auth/patient-search.ts` con `searchPatients(term, limit = 8)`, acotado por RLS y sin `select("*")`
- [ ] 16.2 Buscador de paciente en la cabecera de `AppShell` para `admin` y `professional`: `<form method="get">` que apunta a `/people`, con sugerencias tras dos caracteres y salto directo a la ficha
- [ ] 16.3 **Antes de montarlo**, verificar que el formulario nuevo queda *después* del de cerrar sesión en el HTML del servidor: `auth-http.mjs` toma el primer `<form>` que contiene el marcador y `AppShell` documenta que solo puede haber uno
- [x] 16.4 Crear `app/(people)/people/page.tsx` con el directorio completo —la consulta de `listPeople` de 3.1, con sus filtros y su paginación— y mover ahí la lista y el alta que hoy viven en `PeoplePanel`
  - Hecho tras la revisión de Yordy («no siento que sea la sección para crear un paciente»). `/people/page.tsx` = `PeoplePanel` (lista + alta + asignación + baja), rol resuelto con `requireStaff`. Filtros y paginación (3.1) aún no; el `PeoplePanel` se movió tal cual. `nav-items.ts` gana «Personas» (admin) y «Pacientes» (professional) apuntando a `/people`.
- [~] 16.5 Convertir `/admin` en panel de trabajo: alertas sin leer, sesiones de hoy, membresías por vencer y tamizajes pendientes, reutilizando `getBusinessOverview` y la agregación de 5.1
  - Parcial: `/admin` y `/pro` son ahora `components/progress/StaffHome.tsx` = `BusinessOverview` (clientes activos, cumplimiento, asistencia del mes) + una tarjeta hacia `/people`. **Falta** alertas sin leer, sesiones de hoy, membresías por vencer y tamizajes pendientes — necesitan la agregación de 5.1, aún sin construir.
- [x] 16.6 Adaptar `scripts/verify-people.test.mjs` a la ruta nueva: es el único punto de todo el change donde un contrato de suite se cambia a propósito, y el PR tiene que decirlo en su descripción
  - El archivo real es `scripts/verify-people-onboarding.test.mjs`. Movidas a `/people` las seis operaciones de personas (alta admin, alta profesional, «Personas y equipo», el paciente listado, baja sin confirmar y baja); añadido `/people` a la lista de rutas que rebotan a un paciente sin onboarding. Las redirecciones de login siguen a `/admin` y `/pro`. `test:people` 10/10.
- [x] 16.7 Verificar que en `/people` el primer formulario con `value="<uuid de la persona>"` sigue siendo el de la baja y que el del alta conserva `name="fullName"`
  - `test:people` «Camino 1» lo recorre en `/people` y pasa: la baja se localiza por `value="<proId>"` y el alta por `name="fullName"`.
- [ ] 16.8 Comprobar a mano que desde cualquier pantalla del personal se llega a un paciente escribiendo su nombre, sin pasar por ningún listado
- [ ] 16.9 `npm run test:people` y `test:overview` en verde, más los cuatro de CI
  - `test:people` 10/10 y `test:overview` 5/5 contra la app viva; typecheck, lint, test:design y build en verde.

## 17. El estándar de manejo — rama `ui/estandar-de-manejo`

Sale de comparar la aplicación con la de Smart Fit sobre seis capturas
(`docs/13-referencia-smart-fit.md`). No cambia la identidad visual: cambia tres decisiones de
manejo que ahí están resueltas y aquí no.

- [x] 17.1 Crear `components/ui/Carousel.tsx`: colección con desplazamiento horizontal, `scroll-snap`, la tarjeta siguiente asomando por el borde, control por teclado y `overflow-x: auto` propio, de modo que el cuerpo de la página nunca se desplace en horizontal
  - `Carousel` + `CarouselItem`. La pista lleva el `overflow-x`, `snap-x snap-mandatory` y la barra de desplazamiento oculta; `CarouselItem` ocupa `min(78%,20rem)` para que la siguiente asome. Cliente sólo por el teclado (flechas ← →); sin JavaScript se arrastra igual. Aún sin montar en ninguna pantalla —lo harán las secciones 9 y siguientes—.
- [x] 17.2 Añadir el chevron y el patrón de icono a `ExerciseRow`, y extraerlo a `components/ui/DataRow.tsx` para que lo usen los demás listados
  - `ExerciseRow` ahora compone `DataRow`: chevron a la derecha como señal de «lleva a otro sitio» y un icono de mancuerna de reserva cuando el ejercicio no tiene miniatura. El `<h2 class="text-base font-semibold leading-6">` sigue pintándose en `ExerciseRow`, no en `DataRow`, porque es contrato de `verify-catalog-list.test.mjs`.
- [x] 17.3 Convertir `/patient/profile` en resumen de lectura —objetivo, nivel, entorno, equipamiento y condiciones como pares etiqueta/valor— con la edición detrás de un enlace por bloque; **conservar los formularios existentes en su ruta y en su orden**, que es lo que recorre `test:people`
- [x] 17.4 Verificar que `/patient/profile` sigue conteniendo el primer formulario con `name="goal"` y el primero con `name="conditionId"` donde los espera la suite, o mover la suite en el mismo PR y decirlo en su descripción
- [x] 17.5 Sustituir las cuatro tarjetas de `/patient` —que hoy duplican la barra inferior— por la tira de la semana con el día de hoy marcado, la racha de sesiones y la sesión en curso si la hay, reutilizando la agregación de 5.1
  - La racha se cuenta **por semanas** y no por días: quien entrena tres veces por semana nunca pasaría de una racha de un día. La agregación quedó en `lib/progress/patient-overview.ts` con la forma que pide 5.1, pero solo con lo que la portada necesita; la ficha del profesional le añadirá membresía, condiciones y tamizaje.
- [ ] 17.6 Marcar la pestaña activa de `PatientTabs` (5.2) con subrayado de 2 px del color de marca, no con fondo
- [x] 17.7 Llevar las acciones de cabecera a píldoras en `PageHeader` y añadir «Ver todas» junto al título de cada colección que tenga listado propio
  - La forma de píldora vive en `components/ui/button.tsx`: el contenedor de acciones —tanto el de `PageHeader` como el de la nueva `SectionHeader`— lleva `data-slot="header-actions"`, y `buttonVariants` responde con `rounded-full` y, en `ghost`, `border-border`. Ninguna pantalla tiene que pedir la forma.
  - `components/ui/SectionHeader.tsx` (nueva) es la cabecera de una colección dentro de una pantalla: título + `SeeAllLink` alineado a la derecha. Se aplicó a los dos buscadores de catálogo recortados —`/templates/[id]` y `/pro/routines/[patientId]`— con «Ver el catálogo» hacia `/exercises` cuando el resultado llega al tope. No es un `<form>`, así que no altera el orden de formularios de `docs/11`.
  - Falta correr `test:templates` y `test:routines:items` contra un build vivo (Supabase local estaba parado en esta sesión); los cuatro de CI —typecheck, lint, test:design, build— pasan.
- [x] 17.8 Medir de nuevo `/patient`, `/patient/profile` y `/exercises` en Chrome y registrar el antes y el después en `docs/12-medicion-de-densidad.md`
- [x] 17.9 `npm run test:people`, `test:auth:screens` y `test:catalog` en verde, más los cuatro de CI
