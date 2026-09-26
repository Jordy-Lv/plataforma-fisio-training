Antes de empezar cualquier sección, lee
[`docs/11-contratos-de-las-suites-http.md`](../../../docs/11-contratos-de-las-suites-http.md)
y el protocolo de [`ejecucion.md`](ejecucion.md). Cada sección es un pull request.

Vista consolidada de lo que queda, con orden y dependencias:
[`pendiente-frontend.md`](pendiente-frontend.md) (foto del 2026-09-08).

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

- [x] 1.1 Crear `lib/shared/list-params.ts` con `pageParam`, `searchParam`, `optionalEnum`, `optionalId` y `createListParams({ path, schema, pageSize })` que devuelva `schema`, `pageSize`, `parse`, `href`, `hasActiveFilters`, `empty`, `range` y `pages`; todos los miembros como funciones flecha del closure, para que se puedan desestructurar
- [x] 1.2 Crear `components/ui/FilterForm.tsx`: `<form method="get">` renderizado en el servidor, autoenvío inmediato al cambiar `<select>`/casilla y con 300 ms de retardo al escribir, `router.push` para lo primero y `router.replace` para lo segundo, `preventDefault` + `FormData` + `startTransition`, `aria-busy` mientras navega, `data-enhanced="true"` tras hidratar y limpieza del temporizador al desmontar
- [x] 1.3 Verificar con `curl` que el `<form method="get">` y su botón siguen en el HTML del servidor, y a mano que `/exercises` filtra con JavaScript desactivado
- [x] 1.4 Crear `components/ui/Pagination.tsx` (Server Component) con `{ page, pages, hrefFor, label }`, conservando `Anterior`, `Siguiente`, `rel="prev"/"next"` y `<p aria-live="polite">Página X de Y</p>`; `null` con una sola página y extremos desde cinco
- [x] 1.5 Crear `components/ui/Chip.tsx` (píldora de filtro activo que enlaza al listado sin ese filtro), `components/ui/Skeleton.tsx` y `components/ui/DataList.tsx`
- [x] 1.6 Reescribir `lib/catalog/schemas.ts` sobre `createListParams` conservando `exerciseFiltersSchema`, `exercisesHref` y `hasActiveFilters`; comprobar que `exerciseFiltersSchema.parse({ q })` con un subconjunto de claves sigue devolviendo el resto en `undefined`
- [x] 1.7 Añadir `options?: { pageSize?: number }` a `listExercises`
- [x] 1.8 Migrar `ExerciseFilters` a `FilterForm` sin cambiar ningún `name`, y añadir la fila de `Chip` de filtros activos
- [x] 1.9 Migrar `ExercisePagination` a `Pagination` con `label="Páginas del catálogo"`
- [x] 1.10 Verificar que `/exercises` conserva el `<h2 class="text-base font-semibold leading-6">` de la tarjeta, la frase `N ejercicios encontrados`, y los textos `Ningún ejercicio coincide con estos filtros` y `Ver todo el catálogo` del estado vacío filtrado
- [x] 1.11 Migrar los `loading.tsx` existentes a `Skeleton` sin cambiar su forma
- [x] 1.12 `npm run test:catalog` y `npm run test:catalog:custom` en verde, más los cuatro de CI

## 2. Catálogo: plantillas, reglas, planes — rama `ui/listados-catalogo`

- [x] 2.1 Crear `lib/catalog/template-list.ts` con `q`, `kind`, `goal`, `level`, `environment`, `status` e `incomplete`, todos nacidos en «todas»
- [x] 2.2 Extender `listTemplates(filters?)` para devolver `{ templates, total, pages }`; sin argumento, primera página sin filtro
- [x] 2.3 Montar filtros y paginación en `/templates`, conservando el `?eliminada=1` que ya se lee
- [x] 2.4 Crear `lib/catalog/rule-list.ts` con `q`, `status`, `state=broken` y `template`; **sin ninguna clave de ordenación**
- [x] 2.5 Extender `listRules(filters?)` **sin tocar** `.order("priority").order("created_at")`
- [x] 2.6 Ocultar los controles de mover en `/rules` cuando hay filtros activos o página mayor que uno, con un aviso que explique por qué
- [x] 2.7 Sacar el error de mover del atributo `title` del botón a un mensaje visible bajo el par de botones, conservando los dos formularios separados con su `name="direction"`
- [x] 2.8 Añadir `filters?` a `listAllPlans` y `listAllServices` con `q` y estado; agrupación de `/offer` intacta
- [x] 2.9 Verificar que `/rules` sin filtros sigue conteniendo el formulario de mover con `value="<ruleId>"` y `value="up"`
- [x] 2.10 `npm run test:templates`, `test:templates:seed`, `test:rules:panel`, `test:rules:seed` y `test:plans` en verde, más los cuatro de CI

## 3. Personas y atención — rama `ui/listados-personas`

- [x] 3.1 Crear `lib/auth/people-queries.ts` con `listPeople(scope, filters)` y `listPatientProfiles(filters)`, sacando la consulta que hoy vive dentro de `PeoplePanel.tsx`
- [x] 3.2 Sustituir por `listPatientProfiles` las consultas inline duplicadas de `/pro/routines` y `/pro/sessions`
- [ ] 3.3 Montar filtros en `PeoplePanel` con **solo** `q`, `role` y `state`; el filtro por profesional, como `Chip` enlazado. **Ningún `value="<uuid>"` en el formulario de filtros** — *pendiente a propósito: desde que `/people` son cuatro tarjetas con `SheetModal`, un filtro en la URL navega y cierra el modal en cada tecla. `PeopleFilter` ya filtra en el cliente sobre `<li data-name data-specialty>` y sin JavaScript la lista se ve entera. Reabrir cuando el modal conserve su estado en la URL.*
- [x] 3.4 Verificar que en `/admin` y `/pro` el primer formulario con `value="<uuid de la persona>"` sigue siendo el de la baja, y que el del alta conserva `name="fullName"`
- [x] 3.5 Montar filtros y paginación en `/pro/routines`, con el estado de la rutina visible en la tarjeta
- [x] 3.6 Extender `patientSessions(patientId, filters?)` con `count:"exact"` y `.range()`, retirando el `.limit(50)`; filtros de estado y de rango de fechas en `/pro/sessions`
- [x] 3.7 Extender `clinicalAlerts(filters?)` retirando el `.limit(200)`, con filtros de leídas, tipo, severidad y paciente, y página de veinte o más
- [x] 3.8 Llevar el conteo de alertas sin leer a la consulta, en vez de calcularlo sobre la lista recortada
- [x] 3.9 Verificar que `/pro/alerts` sin filtros muestra la alerta más reciente y conserva el formulario con `value="<alertId>"`
- [x] 3.10 `npm run test:people` y `npm run test:routines:sessions` en verde, más los cuatro de CI

## 4. Seguimiento — rama `ui/listados-seguimiento`

- [x] 4.1 Extender `listPatientsWithMonthAttendance(filters?)` con `month` en formato `YYYY-MM` —por defecto el mes en curso— sustituyendo el rango fijo, más `q` y «sin asistencias»
- [x] 4.2 Selector de mes en `/attendance`, con navegación al mes anterior y siguiente
- [x] 4.3 Extender `listPatientsWithLastScreening(filters?)` con `q` y «sin tamizaje»
- [x] 4.4 Extender `listMembershipsWithPatient(filters?)` y `listPatientsWithMembership(filters?)` con `q`, `status` y `plan`
- [x] 4.5 Filtros de `/memberships` como `Chip` encima de las tres secciones, que se conservan con sus rótulos cuando no hay estado activo
- [x] 4.6 Verificar que `/memberships` sigue conteniendo `Próximas a vencer`, `Vencidas` y `vence en N días`, y que la vista del profesional muestra a su paciente sin filtrar
- [x] 4.7 `npm run test:attendance`, `test:screenings`, `test:memberships` y `test:overview` en verde, más los cuatro de CI

## 5. Ficha del paciente: agregación y banda — rama `ui/ficha-paciente`

- [x] 5.1 Crear `lib/progress/patient-overview.ts` con `patientOverview(patientId)`: membresía, condiciones activas, último tamizaje, asistencia del mes, rutina activa, sesión abierta y alertas sin leer, en un `Promise.all` y sin ninguna consulta dentro de un `map`
  - Ya existía con lo que necesitaba la portada (`week`, `streakWeeks`, `openSession`, 17.5). Se añadieron al mismo `Promise.all` seis lecturas más: membresía vigente con el nombre del plan, condiciones activas, último tamizaje, conteo de asistencia del mes (`head: true`), rutina activa y conteo de alertas sin leer. `unreadAlerts` es cero para el propio paciente porque RLS no le devuelve alertas.
- [x] 5.2 Crear `components/patients/PatientTabs.tsx` (Server Component, activo por props) con desplazamiento horizontal a 375 px, objetivos de 44 px, `aria-current` y **sin ningún `<form>` dentro**
  - Seis pestañas: ficha, rutina, sesiones, tamizajes, asistencia y evolución. Son enlaces: ni un `<form method="get">` —se colaría delante de los formularios de server action— ni ningún `value="<uuid>"`; el identificador viaja en el `href`, que ningún marcador de las suites mira.
- [x] 5.3 Crear `components/patients/PatientHeader.tsx` con nombre, estado, membresía y condiciones, reutilizando `membershipBadgeVariant`
  - Solo lectura: sin ningún `<form>` dentro y sin `value="<uuid>"`, la misma condición que `PatientTabs`. La membresía y las condiciones se pintan como `Badge`; el plazo restante sale de `formatDueIn`.
- [x] 5.4 Añadir el resumen a `/people/[id]` **antes** del contenido actual, dejando los formularios de perfil y de condición en su sitio y en su orden
  - `PatientProfile` monta `PatientHeader` justo después de `PatientTabs`, solo para el personal (`!esPropio`). Los dos `<details>` con `name="goal"` y `name="conditionId"` no se movieron.
- [x] 5.5 Añadir `app/(people)/people/[id]/loading.tsx` con la forma real de la ficha
  - Banda de pestañas + tarjeta de cabecera + dos columnas. Repite el ancho del shell (`mx-auto max-w-[86rem] px-5 py-8 sm:px-8`) porque el shell lo monta la página, no el layout del grupo.
- [x] 5.6 Verificar que en `/people/[id]` el primer formulario con `name="goal"` y el primero con `name="conditionId"` siguen siendo los mismos
  - `PatientHeader` no emite ningún `<form>` ni `value="<uuid>"`, así que el orden no se movió. `test:people` recorre `/people/[id]` enviando a los marcadores `name="goal"` y `name="conditionId"` y pasa 10/10.
- [x] 5.7 `npm run test:people` en verde, más los cuatro de CI
  - `test:people` 10/10 contra el build de producción. `typecheck`, `lint` (solo el aviso preexistente de `verify-auth-screens`), `test:design` 4/4 y `build` en verde. Sin migraciones.

## 6. Ficha del paciente: montaje y enlaces — rama `ui/ficha-paciente-enlaces`

- [x] 6.1 Montar cabecera y pestañas en `/pro/routines/[patientId]`, **antes** del formulario de asignación, que sigue siendo el primero con `name="patientId"`
  - Solo las pestañas: la cabecera de 5.3 necesita la agregación de 5.1, que sigue abierta. `test:routines` 12/12 y `test:routines:items` 9/9 contra el build vivo.
- [x] 6.2 Montarlas en `/pro/sessions` cuando hay paciente seleccionado, `/attendance/[patientId]`, `/screenings/[patientId]` y `/evolution/[patientId]`
  - También en `/people/[id]`, y **solo para el personal**: `PatientProfile` es la misma pantalla que `/patient/profile`, y el paciente no entra en las otras cinco vistas. Los botones sueltos de cabecera —«Ver su asistencia», «Ver su evolución»— se retiran: los sustituye la banda.
- [x] 6.3 Verificar que `/evolution/[patientId]` conserva `<option value="weight">Peso</option>` e `<option value="bmi">IMC</option>`, y que la gráfica sigue sin montarse cuando no hay datos
  - 2026-09-26, Chromium a 375 px contra `next start` sobre `d4ef9a2`, como entrenador. Sin tamizajes (Diego y Elena de la semilla), ninguna de las dos secciones monta `svg[role="img"]` y las dos muestran su estado vacío. Con tres tamizajes temporales de Diego (borrados después), el HTML trae las dos `<option>` exactas, la gráfica dice «Peso: de 82 kg a 79 kg» y al elegir IMC pasa a «IMC: de 25,9 a 24,9».
- [x] 6.4 Enlazar a la ficha desde `PeoplePanel`, `/pro/routines`, `/attendance` y `/screenings`
  - Los dos primeros ya enlazaban. En las tarjetas de `/attendance` y `/screenings` el enlace «Ver ficha» lleva `relative`: sin eso queda debajo del `after:inset-0` que hace clicable toda la tarjeta.
- [x] 6.5 Comprobar a mano que desde cualquier sección de un paciente se llega a las otras cinco en un toque
  - 2026-09-26, recorrido con Chromium (Playwright) a 375 px con toques, no con una persona: como admin (Diego y Elena) y como entrenador (Diego), desde cada una de las seis secciones se tocó cada una de las otras cinco y se comprobó que la pestaña de destino queda activa y la URL es la suya. 90 de 90 toques (18 secciones de partida × 5 destinos), pestañas de 44 px de alto. Al entrenador, Elena (que no tiene asignada) le da 404, sin banda.
- [x] 6.6 `npm run test:routines`, `test:routines:items`, `test:attendance`, `test:screenings` y `test:evolution` en verde, más los cuatro de CI
  - 2026-09-26 sobre `d4ef9a2`, tras `supabase start`, `seed:exercises`, `seed:templates` y `seed:progress-demo`, contra `next start` en el 3000: 14/14, 9/9, 8/8, 8/8 y 7/7. `typecheck`, `lint`, `test:design` 5/5 y `build` en verde.

## 7. Los dos defectos del paciente — rama `fix/sesion-acuses`

- [x] 7.1 Cambiar la `key` de la tarjeta de ejercicio a `key={item.id}` y comentar por qué no puede volver a depender del registro
  - `app/(patient)/routine/sessions/[sessionId]/page.tsx`: la `key` era `` `${item.id}-${JSON.stringify(logs.get(item.id) ?? null)}` ``; ahora es `key={item.id}` con el comentario que explica que al depender del registro cada guardado remontaba el bloque y borraba el «Registro guardado» del `useActionState` (docs/11, §5).
- [x] 7.2 Comprobar en el navegador que al guardar un registro el bloque sigue abierto y «Registro guardado» permanece a la vista
  - Pendiente de confirmar en un navegador real. `test:routines:sessions` sí verifica que la respuesta del POST de guardado contiene `Registro guardado` (18/18), y la `key` estable es el arreglo documentado.
  - 2026-09-26: bloqueada por KAN-19. Con Chromium contra `next start`, `test:smoke` cae justo en este acuse (`getByText(/guardado/)` no aparece en 15 s; 7/11), igual que el 2026-09-25.
  - **Cerrada el 2026-09-26** con KAN-19 resuelto (Next 16.3.6): en Chromium contra `next start`, el subtest 6 de `test:smoke` guarda doce registros en cuatro sesiones y en cada uno espera el acuse «guardado» visible dentro del bloque del ejercicio (`#ejercicio-<id>`), que por tanto sigue abierto. Pasa tres veces seguidas. Verificado con un navegador automatizado, no por una persona.
- [x] 7.3 Mover el acuse de cierre al informe de la sesión, que sí se renderiza tras cerrar; **no** usar `redirect()`
  - `SessionReport` acepta `justClosed?` y pinta un `Notice tone="success"` con «Sesión completada. Tu profesional ya puede consultarla.» —el mismo texto que devuelve `closeSession`—. Lo pasa solo la pantalla del paciente: `recienCerrada(session)` compara `completed_at` (lo fija el trigger de la migración `20260905210000`) con ahora, con una ventana de dos minutos, porque sin `redirect()` el acuse no puede viajar en la URL. `closeSession` sigue sin redirigir.
  - De paso: `SessionReport` mezclaba `performed_on` en ISO y `completed_at` en formato local en la misma línea (hallazgo de 9.6). Ahora las dos salen de `formatDate`/`formatTime` de `lib/progress/vocabulary.ts`: «Sesión del 3 de septiembre de 2026 · cerrada a las 8:30».
- [x] 7.4 Verificar que la respuesta del envío de cierre contiene `Sesión completada` o `Completada` y **no** contiene `Terminar sesión`
  - `test:routines:sessions` lo comprueba en dos caminos (`/Sesión completada|Completada/` tras el POST de cierre, y `!html.includes("Terminar sesión")`). Antes lo satisfacía por casualidad la insignia «Completada»; ahora hay un acuse explícito.
- [x] 7.5 `npm run test:routines:sessions` en verde, más los cuatro de CI
  - `test:routines:sessions` 18/18 contra el build de producción (puerto 3210); `typecheck`, `lint` (solo el aviso preexistente de `verify-auth-screens`), `test:design` 4/4 y `build` en verde. Sin migraciones.

## 8. La sesión en curso — rama `ui/paciente-sesion`

- [x] 8.1 Crear `components/ui/Progress.tsx` sobre la primitiva de `@base-ui/react`
  - Sin `"use client"`: no tiene estado, así que la pinta el servidor. La primitiva pone el `role="progressbar"` con su valor y su máximo, que es lo que hace que un lector de pantalla anuncie «1 de 4».
- [x] 8.2 Banda de avance fija con la barra, el conteo de ejercicios registrados y accesos por ancla a cada ejercicio
  - `components/routines/SessionProgress.tsx`, `sticky top-16` bajo la cabecera del shell. Los accesos son anclas `#ejercicio-<id>`, no un componente de cliente: sin JavaScript funcionan igual. El destino lleva `scroll-mt-72 sm:scroll-mt-56` para no quedar tapado por la propia banda.
- [x] 8.3 Abrir el bloque de registro del primer ejercicio pendiente, resuelto en el servidor
  - La página calcula `primeroPendiente` y se lo pasa a `SessionItemForm` como `defaultOpen`. Al guardar uno, la revalidación abre el siguiente: la sesión avanza sola.
- [x] 8.4 Subir «Terminar sesión» a la banda con aviso de los ejercicios sin registrar; **el texto del aviso no puede contener la cadena `Terminar sesión`**
  - El aviso dice lo que de verdad ocurre: la base **rechaza** cerrar con ejercicios sin marcar («Quedan 3 ejercicios por marcar —hechos, saltados o modificados— antes de poder cerrar»), en vez de dejar que el usuario descubra la regla al chocar con ella. El `<form>` de cierre pasa a estar antes que los de registro; anotado en `docs/11`.
- [x] 8.5 Añadir `bodyPartsByMuscleGroup` a `lib/catalog/body-parts.ts` y acotar la zona del dolor al grupo muscular del ejercicio, con salida a la lista completa
  - Con `bodyPartsFor(grupos)`, que siempre añade «Otra zona» y devuelve la lista entera si el ejercicio no tiene grupos etiquetados: acortar a ciegas escondería la zona que duele. De 12 opciones a 6, con «Ver todas las zonas» al lado.
- [x] 8.6 Cambiar `replacementExercises()` a `(muscleGroups?, limit = 200)` con `.overlaps()`, y hacer una sola llamada por sesión en vez de una por ejercicio
  - Los `<option>` del documento bajan de **1.486 a 637** y la pantalla de 402 kB a 234. Una sustitución ya guardada que quede fuera de la consulta acotada se añade a mano al desplegable: si no estuviera, reguardar el registro la borraría.
- [x] 8.7 Verificar que el registro sigue enviándose con `name="itemId"` y que el catálogo completo sigue alcanzable
  - `test:routines:sessions` recorre el envío por HTTP (18/18). «Ver más ejercicios» abre los 200 que trajo la sesión; el catálogo entero ya no viaja al teléfono, y es una decisión, no un descuido.
- [x] 8.8 `npm run test:routines:sessions` en verde, más los cuatro de CI
  - 18/18. También `test:catalog` 9/9, `test:catalog:custom` 12/12, `test:people` 10/10, `test:overview` 5/5, `test:routines:items` 9/9 y `test:templates` 19/19.

## 9. Rutina y portada del paciente — rama `ui/paciente-inicio`

- [x] 9.1 Subir la sesión en curso al principio de `/routine` con acceso para reanudarla
  - La tarjeta de la portada se extrajo a `components/routines/OpenSessionCard.tsx` y ahora la pintan las dos pantallas. En `/routine` sale del historial que ya se consulta —**sin una consulta más**—: una sesión en curso está por definición entre las veinte más recientes, y si no lo estuviera el botón de cada día la reanuda igual.
- [x] 9.2 Colapsar los días en bloques plegables, con el botón de iniciar visible en la cabecera de cada uno
  - Cabecera con el título, cuántos ejercicios tiene y el botón; la lista detrás de «Ver los ejercicios». **El botón no puede ir dentro del `<summary>`**: un `<button>` ahí alterna el `<details>` al pulsarlo, y ese `<form>` es el que `verify-routine-sessions` localiza por `value="<dayId>"` y envía sin JavaScript.
  - El bloque de la rutina baja de 1.382 px a **482** y el documento de 163 kB a 122 (doc 12).
- [x] 9.3 Verificar que `/routine` conserva el formulario con `value="<dayId>"` por día, el vacío «Tu profesional está preparando tu rutina» y la ausencia de «Pendiente de revisión»
  - Dos formularios con `value="<uuid>"` y `$ACTION_` (uno por día), el vacío intacto y ni rastro de «Pendiente de revisión». Los ejercicios siguen en el HTML del servidor con el día cerrado. `test:routines:sessions` 18/18, `test:auth:screens` 10/10, `test:people` 10/10.
- [x] 9.4 Dar dato propio a las cuatro tarjetas de `/patient`, reutilizando la agregación de la sección 5
  - Superada por 17.5: las cuatro tarjetas —que duplicaban la barra inferior— ya no existen. `/patient` es ahora la tira de la semana con «hoy» marcado, la racha por semanas y la sesión en curso, todo servido por `patientOverview` de `lib/progress/patient-overview.ts` (la agregación de 5.1 con lo que la portada necesita). No queda ninguna tarjeta a la que dar dato propio.
- [x] 9.5 Añadir `loading.tsx` a `/routine` y a `/routine/sessions/[sessionId]`
  - Mismo patrón que los `loading.tsx` ya existentes: `Skeleton`/`SkeletonCard` sobre tokens, `role="status"` con su `aria-label`, y el contenedor con el ancho y los márgenes del shell. Cada esqueleto repite la forma real de su pantalla —`/routine`: tarjeta de sesión en curso, días plegables e historial; la sesión: banda de avance y bloques de registro—. `test:design` 4/4 (incluye «cada grupo de rutas define sus estados de carga y de error»).
- [x] 9.6 Revisar las cinco pantallas del paciente a 375 px, en claro y en oscuro
  - `/patient`, `/routine`, `/routine/sessions/[id]` (en curso y completada), `/patient/profile` y `/attendance/me` revisadas en Chrome a 375 px con `prefers-color-scheme` claro y oscuro. Sin desplazamiento horizontal, objetivos táctiles ≥ 44 px y los tokens resuelven en los dos temas. La tarjeta de sesión en curso (9.1) aparece en la portada y en `/routine`; los días plegables (9.2) y la banda de avance (8.2) se ven bien en ambos temas. Único detalle de redacción, preexistente: el informe de la sesión mezcla fecha ISO (`2026-09-03`) y fecha local (`3/9/2026, 8:30:00 a. m.`) en la misma línea.
- [x] 9.7 `npm run test:routines:sessions` y `test:auth:screens` en verde, más los cuatro de CI
  - 2026-09-08, contra el build de producción: `test:routines:sessions` 18/18, `test:auth:screens` 10/10; typecheck, lint, `test:design` 4/4 y build en verde. También `test:catalog` 9/9, `test:catalog:custom` 12/12, `test:overview` 5/5, `test:routines:items` 9/9, `test:routines` 12/12, `test:templates` 19/19, `test:people` 10/10, `test:rules:panel` 12/12.

## 10. Estados pendientes y avisos — rama `ui/estados-pendientes`

- [x] 10.1 Crear `components/ui/SubmitButton.tsx` con `useFormStatus` — botón de envío que se deshabilita, cambia de rótulo (`pendingLabel`) y marca `aria-busy` mientras el `<form>` que lo contiene tiene un envío en curso; `type="submit"` por defecto porque el `<Button>` de `@base-ui/react` emite `type="button"`
- [~] 10.2 Devolver al servidor los componentes que hoy son de cliente solo para deshabilitar su botón — *ninguno lo es en el estado actual: todos los `"use client"` con `<form>` también pintan errores en línea con `<FormMessage state={state}>`, y dos casos tienen contrato de suite sobre esa respuesta (`verify-routine-assignment` lee «Rutina asignada. El paciente ya puede consultarla» de `state.success`; `verify-routine-sessions` lee el cierre). Devolverlos al servidor perdería esos mensajes o exigiría un `redirect()` prohibido por la regla 5 de `ejecucion.md`. En su lugar se adoptó `SubmitButton` en `SessionControls`, `AssignmentForm`, `ReadAlertForm` y `MembershipReviewButton`: se elimina la lógica de `disabled`/rótulo a mano y el destructurado de `pending`, conservando `useActionState` solo para el `FormMessage`. Reabrir si un change posterior mueve esos mensajes a acuses de URL.*
- [x] 10.3 Crear `components/ui/FlashToast.tsx`, que convierte el acuse de la URL en aviso efímero y limpia la URL, conservando el mensaje del servidor debajo — no envuelve ninguna server action (solo lee la URL tras la navegación); un solo aviso por montaje; `router.replace` sin `scroll`. Montado como primera prueba en `/exercises/[id]` (`?nuevo=1`); la sección 12.5 lo extiende a `/templates`, `/rules`, `/plans` y a los `?eliminada=1`
- [x] 10.4 Estado optimista al marcar una alerta como leída; **no generalizarlo** — `ReadAlertForm` muestra «Alerta marcada como leída para ti.» en cuanto se envía (mientras `pending` y sin error previo); al terminar bien `readAlert` revalida y el formulario desaparece, al fallar vuelve con el motivo. No se usa `useOptimistic`: exigiría envolver la acción en una función de cliente y dejaría el `<form>` sin `$ACTION_ID` (sin funcionar sin JavaScript, que es lo que la suite ejercita)
- [x] 10.5 Comprobar que ninguna server action queda envuelta en una función de cliente — auditados los 30 `<form action={…}>` de componentes `"use client"`: en todos `action` es el dispatch de `useActionState(serverAction, …)` (patrón sancionado, emite `$ACTION_ID`); `onSubmit={validation.onSubmit}` solo hace `preventDefault` en entrada inválida, no envuelve nada; `OfferControls` usa `onConfirm` del `ConfirmDialog` (ADR-0008). Cero envoltorios
- [x] 10.6 Las veinticinco suites en verde, más los cuatro de CI — CI: typecheck, lint (solo el aviso preexistente de `verify-auth-screens`), `test:design` 4/4, `build` en verde. 24/25 suites HTTP en verde contra un `next start` propio en el 3215 con Supabase local. `test:memberships:cron` falla 2/7 por **contaminación previa de la base compartida** (un perfil admin de sobra `amador-qa-…@demo.local` duplica el conteo de «una alerta por cada membresía»; mismo modo de fallo documentado en [[qa-backend-2026-09-06]] y [[reparto-codex-claude]]). El cambio es solo de UI y no toca el job de vencimientos; CI corre sobre base limpia

## 11. Confirmación de acciones destructivas — rama `ui/confirmaciones`

- [x] 11.1 Crear `components/ui/ConfirmSubmit.tsx`: botón de envío que intercepta su clic, abre el diálogo y confirma con `form.requestSubmit()`, dejando intacto el `<form action>` y su rótulo — lee la espera con `useFormStatus` como `SubmitButton` (el `<form>` no se hace de cliente); el `AlertDialog` va controlado y sin `Trigger`; `requestSubmit()` dispara el `submit` nativo que React intercepta; sin JavaScript no hay manejador y el botón envía directo. Bandera `confirmed` como red de seguridad del patrón de `docs/11` §5
- [x] 11.2 Aplicarlo a quitar un ejercicio de la rutina, conservando ese formulario como el primero del ítem y sin `name="sets"` — `RemoveRoutineItemButton` en `components/routines/RoutineItems.tsx`; `useActionState` se conserva solo para el `FormMessage`. `test:routines:items` 9/9
- [x] 11.3 Aplicarlo a quitar un ejercicio de una plantilla y a eliminar un día, conservando el rótulo `Eliminar día` — `ItemActions` (icono, `aria-label`) y `DayHeaderForms` en `components/catalog/TemplateDays.tsx`; la descripción del diálogo del día lleva el conteo de ejercicios. `test:templates` 19/19
- [x] 11.4 Aplicarlo a eliminar una plantilla, conservando el rótulo `Eliminar plantilla` — `DeleteTemplateForm` en `components/catalog/TemplateForm.tsx`
- [x] 11.5 Aplicarlo a eliminar una regla — `DeleteRuleForm` en `components/catalog/RuleForm.tsx`. `test:rules:panel` 12/12
- [x] 11.6 Aplicarlo a asignar una rutina cuando reemplaza a la activa, **sin añadir ningún campo obligatorio** al formulario — `AssignmentForm` recibe `replacesActive` (lo calcula la página con `routines.some(r => r.status === "active")`); con rutina activa el botón es `ConfirmSubmit` (`tone="default"`), sin ella sigue siendo `SubmitButton`. Ningún `<input>` nuevo. `test:routines` 12/12
- [x] 11.7 Comprobar las seis confirmaciones con JavaScript activado y desactivado — *pendiente: los dos navegadores conectados por la extensión son remotos (Windows) y no alcanzan el `next start` local. Verificado por HTTP que las seis pantallas conservan sus `<form action>` con sus marcadores en el HTML del servidor (las cuatro suites recorren esos formularios). Falta el recorrido visual con JS on/off.*
  - 2026-09-26: la mitad «JS desactivado» **no aplica**. En Chromium sin JavaScript las pantallas solo pintan el esqueleto de su `loading.tsx` (el contenido llega en un `<div hidden>` del *streaming*), y Jordy decidió que el uso sin JavaScript no es requisito: lo que se garantiza es el HTML del servidor, que las suites ya verifican. Ver `docs/15` C.3.
  - 2026-09-26, mitad «JS activado»: Chromium (Playwright) a 375 px contra `next dev` (con `next start` los pasos de rutina chocan con KAN-19), con datos desechables y la base limpia al final. Son siete, no seis: la asignación manual añadió «Descartar y elegir otra», y «Confirmar y asignar» pide confirmación cuando el borrador tiene avisos, no al reemplazar la activa. En las siete —quitar ejercicio de la rutina, quitar ejercicio de la plantilla, eliminar día, eliminar plantilla, eliminar regla, confirmar y asignar con avisos, descartar el borrador— el diálogo abre con su título, «Cancelar» no envía nada (comprobado en la base) y confirmar sí envía. Sin errores de página.
- [x] 11.8 `npm run test:templates`, `test:rules:panel`, `test:routines` y `test:routines:items` en verde, más los cuatro de CI — las cuatro suites en verde contra un `next start` propio en el 3220 con Supabase local por el túnel ssh del 54321; typecheck, lint (solo el aviso preexistente de `verify-auth-screens`), `test:design` 4/4 y `build` en verde. Sin migraciones

## 12. Construir una plantilla sin recargar — rama `ui/catalogo-embebido`

- [x] 12.1 Buscador único y permanente en `/templates/[id]`, con filtros, paginación y `pageSize` reducido, y un `<select name="dayId">` por resultado
  - `components/catalog/CatalogPicker.tsx` (server, compartido) = `FilterForm` + `Chip` + `Pagination`, `pageSize` 6 (`lib/catalog/embedded-catalog.ts`). Tres modos: navegación (`<select name="dayId">` por resultado, `AddItemDayPicker`), enfoque de día (`?dia=`, `AddItemButton` con el día oculto) y —en rutinas— enfoque de ítem (`?item=`). Los resultados solo aparecen si hay filtro o modo enfocado, así que en `/templates/[id]` sin `?dia=` no hay ningún uuid en el buscador. El enlace por día pasa a `?dia=<id>#catalogo-buscador`.
- [x] 12.2 Verificar que el formulario de añadir sigue conteniendo `value="<exerciseId>"` y que los de eliminar conservan sus rótulos
  - `test:templates` 19/19: en modo `?dia=` el resultado es `AddItemButton` (oculto `exerciseId` + `dayId`); «Eliminar día» y «Eliminar plantilla» intactos (siguen en `TemplateDays`/`TemplateForm`, el buscador no los toca).
- [x] 12.3 Mismo buscador en `/pro/routines/[patientId]`, **conservando el comportamiento de `?dia=` y `?item=`**, que la suite abre literalmente
  - `CatalogPicker` único tras el aviso de condiciones. `?dia=` → `AddRoutineItemButton`, `?item=` → `ReplaceRoutineItemButton`, sin parámetro → `AddRoutineItemDayPicker` con los días de todas las rutinas. El `dia`/`item` oculto del `FilterForm` GET es un uuid, pero ningún marcador de `verify-routine-items` es «un uuid cualquiera» (todos son compuestos o piden `$ACTION_`/`name="sets"`), igual que en el buscador anterior. `test:routines:items` 9/9.
- [x] 12.4 Comprobar que en esa pantalla el formulario de quitar sigue siendo el primero del ítem
  - `RemoveRoutineItemButton` sigue fuera del `<details>` y primero del ítem; `verify-routine-items` «Quitar…» (marcador `value="<itemId>"` + `$ACTION_`, sin `name="sets"`) pasa. El buscador va antes del listado de rutinas y no contiene ningún `value="<itemId>"`.
- [x] 12.5 Sustituir los acuses de la URL por `FlashToast` en `/templates`, `/rules`, `/exercises` y `/plans`
  - `FlashToast` añadido junto al `<p role="status">` en `/templates` (`?eliminada=1`), `/templates/[id]` (`?nueva=1`), `/rules` (`?eliminada=1`) y `/rules/[id]` (`?nueva=1`). `/exercises/[id]` ya lo tenía desde 10.3. **`/exercises` y `/plans` (listados) no emiten ningún acuse en la URL**, así que no hay nada que convertir ahí.
- [x] 12.6 `npm run test:templates`, `test:templates:seed` y `test:routines:items` en verde, más los cuatro de CI
  - Contra un `next start` propio en el 3222 con Supabase local por el túnel ssh del 54321: `test:templates` 19/19, `test:templates:seed` 4/4, `test:routines:items` 9/9, y de refuerzo `test:routines` 12/12, `test:catalog` 9/9, `test:catalog:custom` 12/12, `test:rules:panel` 12/12. CI: typecheck, lint (solo el aviso preexistente de `verify-auth-screens`), `test:design` 4/4 y `build` en verde. `openspec validate --strict` OK. Sin migraciones.

## 13. Cierre — rama `docs/cierre-frontend`

- [x] 13.1 Añadir a `docs/10-sistema-de-diseno.md` los componentes nuevos y cuándo usar `ConfirmDialog` frente a `ConfirmSubmit`
  - `docs/10` §2 documenta los 21 componentes de `components/ui/**` y `components/shell/**` que faltaban, una subsección «Listados», otra de componentes de dominio reutilizados (`CatalogPicker`, `PatientHeader`, `PatientTabs`) y una tabla «`ConfirmSubmit` o `ConfirmDialog`». `StaffWorkboard` ya no existe: KAN-5 lo sustituyó por `ProHome` (`components/progress/`), que no es compartido.
- [x] 13.2 Escribir `docs/adr/0011-estado-de-listado-en-la-url.md`: por qué el estado vive en la URL y por qué el autoenvío no es una excepción del ADR-0008
  - Numerado **0011**, no 0009 como decía el enunciado original: ADR-0009 es la asignación manual de rutinas. Acordado con Jordy el 2026-09-25. Registrado en `docs/adr/README.md`.
- [x] 13.3 Declarar `lib/shared/**` como territorio compartido en la sección 3 de `CLAUDE.md`
- [x] 13.4 Añadir a `scripts/verify-design-system.test.mjs` la comprobación de que todo segmento dinámico con `page.tsx` tiene su `loading.tsx`
  - Solo 2 de 11 lo tenían. Se añadieron los 9 que faltaban, cada uno con la forma de su pantalla (decidido con Jordy el 2026-09-25, en vez de una lista de excepciones). `test:design` 5/5, y falla nombrando el archivo si se quita uno.
- [ ] 13.5 Recorrer los caminos del paciente en un teléfono real y registrar el resultado
- [x] 13.6 Las veinticinco suites en verde sobre la rama fusionada, más los cuatro de CI
  - **2026-09-25, sobre `main` = `c7be7ea`** (PR #43 fusionado), tras `db:reset`, `seed:exercises`, `seed:templates` y `seed:progress-demo`, contra `next start` en el 3000: hoy son **31** suites, no veinticinco. **30 de 31 en verde** (324 subtests). Los cuatro de CI (`typecheck`, `lint`, `test:design` 5/5, `build`) en verde. Solo `test:smoke` queda en 7/11: fallan 6–8 por KAN-19 (el acuse «guardado» no aparece en la sesión del paciente con JavaScript), igual que en la 7.1 de `manual-routine-assignment`. Queda abierta hasta que se cierre KAN-19.
  - **Cerrada el 2026-09-26**: con KAN-19 resuelto (Next 16.3.6) y los arreglos de los subtests 7 y 10 de `test:smoke`, las **31 de 31** suites en verde contra `next start` —`test:smoke` 11/11 tres veces seguidas— y los cuatro de CI.

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
  - `EvidenceItem` extraído; la primera sesión se ve, el resto va en `<details>`. `test:routines:sessions` 18/18 contra la app viva: «Camino 5: sesión 3» (3ª sesión, plegada) y el formulario `value="<alertId>"` siguen en el HTML. Medido en Chrome en 14.9: 346 px (antes 658).
- [x] 14.7 Añadir `orden` a `exerciseList`, `templateList` y a los listados de seguimiento, con las claves que cada pantalla puede ordenar y sin tocar el `.order("priority")` de `/rules`
  - `orderParam(values, fallback)` en `lib/shared/list-params.ts`, mismo patrón que `vista`: siempre lleva un valor, así que va en `notFilters` de cada `createListParams`. Claves: ejercicios `nombre` (por defecto) · `recientes`; plantillas `tipo` (por defecto, `kind`+`name`) · `nombre` · `recientes`; asistencia `nombre` (por defecto) · `reciente` · `dias`; tamizaje `nombre` (por defecto) · `reciente`; membresías `vencimiento` (por defecto) · `nombre` —este último reordena **dentro** de «Próximas a vencer»/«Vencidas»/«Resto», que siguen siendo contrato de `test:memberships`, nunca entre secciones—. `ListFilters` ganó `required` en `Choice` para que el `<select>` de orden no ofrezca un «Todos» que no existe.
- [x] 14.8 Ordenación por defecto explícita en cada listado, documentada en un comentario junto a su `createListParams`
  - Comentario en cada `*-list.ts` (`schemas.ts` para ejercicios) junto al array de claves, antes de `createListParams`.
- [x] 14.9 Medir de nuevo `/exercises` y `/pro/alerts` en Chrome a 1440×900 y 606×667 y registrar las cifras en `docs/12-medicion-de-densidad.md`
  - Sección «1 quater» del documento. `/pro/alerts` baja un 41 % (8.387→4.921 px en escritorio, 8.623→5.081 en móvil); `/exercises` sube un poco (banda de pestañas + conmutador de vista + selector de orden encima de la rejilla), la tarjeta no cambió de tamaño.
- [x] 14.10 `npm run test:catalog`, `test:catalog:custom` y `test:routines:sessions` en verde, más los cuatro de CI
  - 9/9, 12/12 y 19/19 contra la app viva. Además, por tocar sus listados: `test:templates` 20/20, `test:attendance` 8/8, `test:screenings` 8/8, `test:memberships` 11/11.

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

- [x] 15.1 Crear `components/ui/DetailDialog.tsx`: diálogo de solo lectura con su disparador, cierre por `Esc` y por clic fuera, y foco devuelto al disparador
  - Dos piezas: `DetailPanel` —el panel, con la trampa de foco, el bloqueo del desplazamiento del cuerpo y el foco devuelto— y `DetailDialog`, el mismo con un botón que lo abre. **Sin portal**, como `SheetModal`, que se reescribió encima para no tener dos veces la misma mecánica (`test:people` 10/10).
  - `keepMounted` decide si el contenido se emite siempre (lo que necesita cualquier texto que lea una suite) o se monta al abrir (listados largos).
- [x] 15.2 Ficha del ejercicio desde `/exercises` en `DetailDialog` —nombre, imagen, indicaciones, músculos, equipo, entorno, nivel—, **conservando** el enlace a `/exercises/[id]` como ruta propia para compartir y para quien no tenga JavaScript
  - `ExerciseSummary` (la ficha) y `ExerciseQuickView` (el `<li>` que intercepta el clic del nombre). `description` entra en las columnas del listado: cuesta poco —41 de 868 ejercicios tienen indicaciones— y ahorra una consulta por ficha.
  - **El envoltorio recibe el ejercicio, no la fila ya pintada.** Pasar `children` desde el servidor llevó `/exercises` de 64 kB a 623; con el dato plano la pantalla acabó en 195 kB, **más ligera que antes** (doc 12).
  - `next/link` navega desde su propio `onClick` sin mirar si alguien llamó a `preventDefault`: el interceptor necesita además `stopPropagation`.
- [x] 15.3 Evidencia completa de una alerta en `DetailDialog`, encadenada con el plegado de 14.5
  - `components/routines/AlertEvidence.tsx`. La tarjeta enseña la última sesión; el resto se lee encima de la lista. El `<details>` de 14.5 empujaba las otras diecinueve alertas hacia abajo al abrirlo.
  - `keepMounted` activado: `verify-routine-sessions` lee del HTML del servidor la nota de la tercera sesión del camino 5.
- [x] 15.4 Detalle de una sesión desde `/pro/alerts` y desde `/pro/sessions` en `DetailDialog`, conservando `/pro/sessions/[sessionId]` como ruta
  - `sessionReports(ids)` trae los informes de la página **en una sola consulta con `in`**, nunca uno por fila. `SessionReport` se extrajo a su propio archivo porque ahora lo pintan tres pantallas y un diálogo.
  - Cuesta ~1 kB por sesión (`/pro/sessions` +10 %, `/pro/alerts` +19 %) y ahorra una navegación por cada sesión que se quiere mirar.
- [x] 15.5 Comprobar con `curl` que las tres pantallas no han perdido ningún `<form>` del HTML del servidor, y a mano que con JavaScript desactivado los enlaces siguen llevando a la ruta completa
  - `/exercises` 2 formularios (sesión + filtros), `/pro/alerts` 3 (sesión + filtros + marcar leída), `/pro/sessions` 2. Los `href` a `/exercises/[id]` y `/pro/sessions/[id]` siguen en el HTML del servidor: 61 en la vista de lista del catálogo, 11 en el historial.
- [x] 15.6 `npm run test:catalog`, `test:routines:sessions` y `test:overview` en verde, más los cuatro de CI
  - 9/9, 18/18 y 5/5.

## 16. Llegar al paciente sin recorrer una lista — rama `ui/acceso-directo`

Las pestañas de las secciones 5 y 6 resuelven moverse **dentro** de un paciente. Esto
resuelve llegar hasta él.

- [x] 16.1 Crear `lib/auth/patient-search.ts` con `searchPatients(term, limit = 8)`, acotado por RLS y sin `select("*")`
  - Server action de solo lectura (`"use server"`), invocada directamente desde el cliente —no ligada a un `<form>`—, con el término validado por Zod. Sin scope explícito en TypeScript: pide `role = patient` y dej a que RLS (`treats_patient`/`is_admin`) decida qué fila entra.
- [x] 16.2 Buscador de paciente en la cabecera de `AppShell` para `admin` y `professional`: `<form method="get">` que apunta a `/people`, con sugerencias tras dos caracteres y salto directo a la ficha
  - `components/auth/PatientSearch.tsx` (cliente): `<form method="get" action="/people">` con `name="q"` como mejora progresiva; con JavaScript, a los dos caracteres (debounce de 250 ms) aparece un listado de sugerencias (`role="listbox"`) que enlaza directo a `/people/[id]`. No se tocó `/people/page.tsx`: el `q` de la URL queda sin usar sin JS, que es el mismo nivel de degradación que ya tienen los filtros de la sección 3.3.
  - Oculto para `patient` (`role !== "patient"` en `AppShell`).
- [x] 16.3 **Antes de montarlo**, verificar que el formulario nuevo queda *después* del de cerrar sesión en el HTML del servidor: `auth-http.mjs` toma el primer `<form>` que contiene el marcador y `AppShell` documenta que solo puede haber uno
  - Varias suites llaman `submit(ruta, valores)` **sin marcador** (`marker` por defecto `""`), que hace *match* con el primer `<form>` del documento. `PatientSearch` se declara en una segunda fila del header, después del `<form action={signOut}>` en el JSX —no solo visualmente—, así que ese primer formulario sigue siendo el de cerrar sesión. Confirmado con `test:auth:screens` (10/10) y `test:people` (10/10) en verde.
- [x] 16.4 Crear `app/(people)/people/page.tsx` con el directorio completo —la consulta de `listPeople` de 3.1, con sus filtros y su paginación— y mover ahí la lista y el alta que hoy viven en `PeoplePanel`
  - Hecho tras la revisión de Yordy («no siento que sea la sección para crear un paciente»). `/people/page.tsx` = `PeoplePanel`, rol resuelto con `requireStaff`. `nav-items.ts` gana «Personas» (admin) y «Pacientes» (professional).
  - Segunda pasada, también por revisión de Yordy: `PeoplePanel` se resume en **cuatro tarjetas** que abren un modal —Registrar persona, Pacientes (con buscador), Equipo (con filtro entrenador/fisioterapeuta), Asignar acompañamiento—. El modal es `components/ui/SheetModal.tsx`: **sin portal**, así que las listas y los formularios de baja siguen en el HTML del servidor y `verify-people-onboarding` los encuentra (10/10). `components/auth/PeopleFilter.tsx` filtra en el cliente sobre `<li data-name data-specialty>` ya renderizados; sin JavaScript la lista se ve entera. Orden de tarjetas registrar → pacientes → equipo → asignar para que las bajas queden antes del `<option value="<uuid>">` de la asignación. «Dar de alta» pasó a «Registrar una persona / un paciente»; el botón, a «Registrar paciente/profesional». La paginación y los filtros por URL de 3.1 siguen pendientes.
- [x] 16.5 Convertir `/admin` en panel de trabajo: alertas sin leer, sesiones de hoy, membresías por vencer y tamizajes pendientes, reutilizando `getBusinessOverview` y la agregación de 5.1
  - `getStaffWorkboard` (nueva en `lib/progress/overview-queries.ts`), con la misma forma que `patientOverview` de 5.1: un solo `Promise.all` con cuatro conteos —`alerts` sin `read_at`, `sessions` con `performed_on` de hoy, `memberships` en `expiring_soon` (los tres con `head:true`) y pacientes activos sin ninguna fila embebida de `screenings`, como `listPatientsWithLastScreening`—. RLS acota: el admin ve el negocio entero, el profesional solo a los suyos.
  - `components/progress/StaffWorkboard.tsx` (nueva): cuatro tarjetas con la cifra, su frase y un enlace que cubre la tarjeta hacia `/pro/alerts`, `/pro/sessions`, `/memberships` y `/screenings`. `StaffHome` la monta tras `BusinessOverview` y solo cuando hay pacientes activos —sin ninguno, el panorama ya dice qué hacer—. Sin `<form>`, así que `docs/11` queda intacto.
  - Verificado: `test:overview` 5/5 y `test:people` 10/10 contra el build de producción (puerto 3210, Supabase local por túnel); `typecheck`, `lint` (solo el aviso preexistente de `verify-auth-screens`), `test:design` 4/4 y `build` en verde. Sin migraciones.
- [x] 16.6 Adaptar `scripts/verify-people.test.mjs` a la ruta nueva: es el único punto de todo el change donde un contrato de suite se cambia a propósito, y el PR tiene que decirlo en su descripción
  - El archivo real es `scripts/verify-people-onboarding.test.mjs`. Movidas a `/people` las seis operaciones de personas (alta admin, alta profesional, «Personas y equipo», el paciente listado, baja sin confirmar y baja); añadido `/people` a la lista de rutas que rebotan a un paciente sin onboarding. Las redirecciones de login siguen a `/admin` y `/pro`. `test:people` 10/10.
- [x] 16.7 Verificar que en `/people` el primer formulario con `value="<uuid de la persona>"` sigue siendo el de la baja y que el del alta conserva `name="fullName"`
  - `test:people` «Camino 1» lo recorre en `/people` y pasa: la baja se localiza por `value="<proId>"` y el alta por `name="fullName"`.
- [x] 16.8 Comprobar a mano que desde cualquier pantalla del personal se llega a un paciente escribiendo su nombre, sin pasar por ningún listado
  - Verificado en navegador contra `next start` (puerto 3000) con las cuatro semillas: como `admin` (Ana Jefa) y como `professional` (Beto Entrenador) el buscador vive en la cabecera de todo el chrome, así que está disponible desde `/admin` y `/pro` por igual. Escribir «Diego» sugiere «Diego Paciente» y el clic navega directo a `/people/[id]`; escribir «Elena» —paciente sin asignar a Beto— responde «Nadie coincide», RLS se ocupa sin que el componente lo repita.
- [x] 16.9 `npm run test:people` y `test:overview` en verde, más los cuatro de CI
  - `test:people` 10/10 y `test:overview` 5/5 contra el build de producción (puerto 3210); typecheck, lint, test:design 4/4 y build en verde.

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
- [x] 17.6 Marcar la pestaña activa de `PatientTabs` (5.2) con subrayado de 2 px del color de marca, no con fondo
- [x] 17.7 Llevar las acciones de cabecera a píldoras en `PageHeader` y añadir «Ver todas» junto al título de cada colección que tenga listado propio
  - La forma de píldora vive en `components/ui/button.tsx`: el contenedor de acciones —tanto el de `PageHeader` como el de la nueva `SectionHeader`— lleva `data-slot="header-actions"`, y `buttonVariants` responde con `rounded-full` y, en `ghost`, `border-border`. Ninguna pantalla tiene que pedir la forma.
  - `components/ui/SectionHeader.tsx` (nueva) es la cabecera de una colección dentro de una pantalla: título + `SeeAllLink` alineado a la derecha. Se aplicó a los dos buscadores de catálogo recortados —`/templates/[id]` y `/pro/routines/[patientId]`— con «Ver el catálogo» hacia `/exercises` cuando el resultado llega al tope. No es un `<form>`, así que no altera el orden de formularios de `docs/11`.
  - Falta correr `test:templates` y `test:routines:items` contra un build vivo (Supabase local estaba parado en esta sesión); los cuatro de CI —typecheck, lint, test:design, build— pasan.
- [x] 17.8 Medir de nuevo `/patient`, `/patient/profile` y `/exercises` en Chrome y registrar el antes y el después en `docs/12-medicion-de-densidad.md`
- [x] 17.9 `npm run test:people`, `test:auth:screens` y `test:catalog` en verde, más los cuatro de CI

## 18. Repaso sistemático de todas las vistas — `docs/14-auditoria-de-vistas.md`

Nace de la revisión de Yordy del 2026-09-07: «hay que repasar todas las vistas, modales,
tarjetas; no entiendo por qué seguimos en las mismas o peor». Se dejó de arreglar la pantalla
que el cliente señalaba y se auditaron **todas** de una vez, con una rúbrica fija (scroll,
formularios abiertos, sin filtro, sin paginación, densidad, sin acceso directo, redacción,
estados, resumen en modal).

- [x] 18.1 Escribir `docs/14-auditoria-de-vistas.md`: método de medición, la rúbrica de nueve defectos, la tabla con las ~38 rutas y sus defectos, y el orden de ejecución. Enlazado desde el README.
- [x] 18.2 Filtro por año en el historial de `/screenings/[patientId]` (`components/progress/ScreeningHistory.tsx`): arranca en el año más reciente, «Todos los años» en el `<select>`; sin JavaScript se ven todos. `test:screenings` 8/8 —los `<h3>` con la fecha y su orden no cambian—.
- [x] 18.3 Trabajar la tabla del doc 14 por orden de prioridad: primero los cimientos (sección 1), luego filtros y paginación en las listas del personal, luego los historiales de un paciente, luego los formularios largos que siguen abiertos. — *cerrados los puntos 1 a 5 y el 8 del orden de ejecución (2026-09-07), y el 6 (detalle en modal, sección 15) y el 7 entero —el registro de sesión (sección 8) y los días de `/routine` (9.1–9.3)— el 2026-09-08. En la tabla del doc 14 solo quedan en ⬜ `/attendance/me` (revisar su estado vacío) y el wizard de onboarding a 375 px.*
- [x] 18.5 Acotar por fecha los historiales de un paciente (punto 3): `components/ui/PeriodFilter.tsx` —el filtro de `ScreeningHistory` generalizado—, `AttendanceHistory` por mes en `/attendance/[patientId]` y `ScreeningHistory` reescrito encima. Arrancan en el periodo más reciente y sin JavaScript se ve el historial entero. `test:attendance` 8/8, `test:screenings` 8/8.
- [x] 18.6 Plegar los formularios largos que seguían abiertos (punto 4): las nueve medidas opcionales del tamizaje, las dos altas de `/plans`, el alta de `/memberships`, el nivel y las contraindicaciones de `/exercises/new` y la edad de `/rules/*`. **Se pliega lo opcional, nunca lo obligatorio**: un campo que Zod exige y el usuario no ve produce un error del que no se ve el origen. Lo obligatorio y largo —los tres etiquetados del ejercicio, los seis criterios de la regla— se compacta a dos columnas. `test:catalog:custom` 12/12, `test:rules:panel` 12/12, `test:plans` 7/7, `test:memberships` 11/11.
- [x] 18.7 Paginar `/plans` (punto 8): dos claves en la URL —`page` para los planes, `spage` para los servicios—, doce por lista, porque las dos colecciones comparten pantalla y crecen sin relación. `createListParams.range` acepta la clave de página, y `spage` va en `notFilters`: es navegación, no un filtro.
- [x] 18.8 Corregir la caída por página fuera de rango en los seis listados que paginan contra la base (`/plans`, `/rules`, `/templates`, `/pro/alerts`, `/pro/routines`, `/pro/sessions`). PostgREST devuelve `416 PGRST103` en vez de una lista vacía y la pantalla entera se caía. `readPage` (`lib/shared/read-pages.ts`) lo trata como página vacía y relee el rango `0-0` solo para saber el total. Verificado: cero errores en el registro del servidor donde antes había cinco. Toca consultas de tres slices —catálogo, rutinas y negocio— porque el fallo era el mismo en los seis.
- [ ] 18.4 Cada vez que se cierre una fila de la tabla, medir el antes/después en Chrome y anotarlo en `docs/12-medicion-de-densidad.md`. — *el punto «3 ter» recoge el recuento antes/después de las siete pantallas de los puntos 3, 4 y 5; el «3 quater» (2026-09-08) añade el peso del documento de seis pantallas y, **por fin, alturas en píxeles**: el formulario de registro baja de 968 px a 598 y el bloque de la rutina de 1.382 px a 482. El navegador integrado sí mide si se le fuerza un repintado antes de leer (basta una captura); sin eso devuelve ceros y una ventana de 0×0. Queda por medir en píxeles el resto de las pantallas del punto 3 ter.*
