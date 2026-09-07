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
| 5 · Cierre | 13 | `docs/cierre-frontend` |

La sección 7 —los dos defectos de la sesión del paciente— puede adelantarse como corrección
independiente si hace falta para una demostración.

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
