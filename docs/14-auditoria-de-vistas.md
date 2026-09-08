# Auditoría de vistas: repaso pantalla por pantalla

Este documento nace de una frustración concreta (2026-09-07): las mejoras del frontend se
estaban haciendo **reactivas** —arreglar la pantalla que el cliente señalaba, una por una—, y
eso avanza despacio y deja el resto igual. Aquí se repasan **todas** las vistas, modales y
tarjetas de una vez, con una rúbrica fija, para no volver a descubrir el mismo problema
pantalla por pantalla.

**Cómo se usa:** cada fila de la tabla del punto 3 es una tarea. Se atacan por orden de
prioridad (punto 4). Al cerrar una, se marca su casilla y se anota el antes/después medido en
[`docs/12-medicion-de-densidad.md`](12-medicion-de-densidad.md). Este documento es el que manda
sobre el orden de `tasks.md` cuando choquen.

---

## 1. Cómo se midió

Contra el `next dev` del worktree (puerto 3017), con Supabase local y los datos de demo, con
sesión de `admin@demo.local` y de `laura.perez.demo@demo.local`. Por cada ruta se contó, sobre
el HTML del servidor sin los `<script>`:

- `form` — número de `<form>`
- `num` — campos numéricos y de texto visibles
- `txa` — `<textarea>`
- `sel` — `<select>`
- `li` — elementos de lista
- `det` — `<details>` (contenido plegado)
- `filtro` — ¿hay un `<form method="get">` o un `<input type="search">`?
- `pag` — ¿hay paginación?
- `modal` — ¿hay tarjetas que abren un modal (`SheetModal`)?

El recuento no es la altura en píxeles —eso se mide en Chrome, pantalla por pantalla, en el
doc 12— pero sirve para ver el patrón de un vistazo.

---

## 2. La rúbrica: nueve defectos que se repiten

| Sigla | Defecto | Señal en la tabla |
|---|---|---|
| **A** | **Scroll**: la pantalla pasa de ~2 pantallas y no hay forma de acortarla | `kB` alto, `li` alto, `det` = 0 |
| **B** | **Formularios siempre abiertos**: la edición se despliega por defecto en vez de esperar tras un `<details>` | `num`+`txa` alto con `det` bajo |
| **C** | **Sin filtro ni buscador**: una lista de más de ~10 elementos sin forma de acotarla | `li` > 10 y `filtro` = no |
| **D** | **Sin paginación**: la lista crece sin tope | `filtro` = sí pero `pag` = no |
| **E** | **Densidad**: la fila o la tarjeta mide más de lo necesario | medición en Chrome |
| **F** | **Sin acceso directo**: para llegar a un dato hay que recorrer una lista | navegación |
| **G** | **Redacción**: rótulos técnicos o raros («dar de alta», «Sin datos») | lectura |
| **H** | **Estados**: falta el vacío/carga/error, o el vacío no explica qué hacer | lectura |
| **I** | **Resumen**: contenido que debería estar detrás de una tarjeta+modal y no lo está | `li` alto en una pantalla que es «de paso» |

---

## 3. La tabla: todas las vistas

Estado: ⬜ pendiente · 🟡 parcial · ✅ hecho. Los números son del 2026-09-07.

### Panel y personas

| Ruta | kB | li | det | filtro | pag | Defectos | Qué hacer | Estado |
|---|---|---|---|---|---|---|---|---|
| `/admin`, `/pro` | 29 | 13 | 0 | — | — | — | Panorama + tarjeta a `/people`. Falta 16.5: alertas sin leer, sesiones de hoy, vencimientos, tamizajes pendientes | 🟡 |
| `/people` | 62 | 20 | 7 | sí | no | D | Cuatro tarjetas con modal, buscador y filtro. **Falta paginación** en el modal de pacientes cuando pasen de ~30 | 🟡 |
| `/people/[id]` (ficha) | 36 | 13 | 2 | no | — | F | Cabecera con «Volver / asistencia / evolución». Falta la **banda de pestañas** (5.2) para moverse entre las seis vistas del paciente sin volver atrás | ⬜ |

### Catálogo

| Ruta | kB | li | det | filtro | pag | Defectos | Qué hacer | Estado |
|---|---|---|---|---|---|---|---|---|
| `/exercises` | 64 | 37 | 0 | sí | sí | E | Ya tiene vista lista/tarjetas, filtros y paginación. Falta el **detalle en modal** (15.2) y ordenar (14.7) | 🟡 |
| `/exercises/new`, `/exercises/[id]` | 41–47 | 13 | 0 | — | — | B | Formulario de alta/edición largo; agrupar y plegar el etiquetado clínico | ⬜ |
| `/templates` | 35 | 17 | 0 | sí | **sí** | — | Filtros y paginación montados. Queda ordenar (14.7) | ✅ |
| `/templates/[id]` | 180 | 31 | 15 | no | no | A, B, C | Prescripción y cabecera de día ya plegadas. **Falta el buscador embebido con paginación** (12.1) y medir la altura resultante | 🟡 |
| `/rules` | 55 | 19 | 0 | sí | **sí** | — | Filtros, paginación y ocultación de los controles de mover cuando hay filtro (2.6) | ✅ |
| `/rules/[id]`, `/rules/new`, `/rules/simulador` | 36–46 | 13 | 0 | — | — | B | Formularios de regla; revisar agrupación | ⬜ |

### Atención

| Ruta | kB | li | det | filtro | pag | Defectos | Qué hacer | Estado |
|---|---|---|---|---|---|---|---|---|
| `/pro/routines` | 24 | 18 | 0 | **sí** | **sí** | — | Buscador, estado del paciente y de la rutina, paginación, insignia de rutina y «Ver ficha» en cada tarjeta (3.5) | ✅ |
| `/pro/routines/[id]` | 91 | 21 | 9 | no | — | A, B | Prescripción de cada ejercicio ya plegada. Falta la **banda de avance** y plegar los días | 🟡 |
| `/pro/sessions` | 24 | 13 | 0 | **sí** | **sí** | — | Filtro de estado y rango de fechas, paginación; el `.limit(50)` fijo se retiró (3.6) | ✅ |
| `/pro/sessions/[id]` | 28 | 13 | 0 | — | — | — | Informe de una sesión; revisar densidad | ⬜ |
| `/pro/alerts` | 22 | 13 | sí | **sí** | **sí** | — | Evidencia plegada (14.5), filtros de lectura/prioridad/motivo/paciente, páginas de 20 y el conteo sin leer resuelto en la base (3.7, 3.8) | ✅ |

### Seguimiento

| Ruta | kB | li | det | filtro | pag | Defectos | Qué hacer | Estado |
|---|---|---|---|---|---|---|---|---|
| `/screenings` | 25 | 18 | 0 | **sí** | **sí** | — | Buscador, filtro «con tamizaje»/«sin tamizaje» y paginación (4.3) | ✅ |
| `/screenings/[id]` | 36 | 17 | **0** | **no** | **no** | A, B, C | **El historial de tamizajes es una pila de tarjetas sin filtro ni rango de fechas.** El formulario de registro está entero abierto (11 campos, casi todos opcionales). → **selector de año/rango en el historial**; plegar las medidas corporales opcionales del formulario tras un `<details>` | ⬜ |
| `/attendance` | 25 | 18 | 0 | **sí** | **sí** | — | Selector de mes con «Mes anterior»/«Mes siguiente», buscador, filtro «sin asistencias» y paginación (4.1, 4.2) | ✅ |
| `/attendance/[id]` | 30 | 21 | **0** | **no** | **no** | A, C | Historial de asistencia de un paciente sin acotar por fecha. Selector de mes | ⬜ |
| `/evolution/[id]` | 26 | 13 | 0 | — | — | — | Gráfica; revisar que el selector de métrica y el vacío estén bien | ⬜ |

### Negocio

| Ruta | kB | li | det | filtro | pag | Defectos | Qué hacer | Estado |
|---|---|---|---|---|---|---|---|---|
| `/plans` | 106 | 37 | 10 | sí | no | A, B | 24 formularios y 18 campos numéricos: cada plan y cada servicio con su formulario. **Plegar la edición** de cada plan/servicio tras un `<details>` o llevarla a un modal; paginar | ⬜ |
| `/memberships` | 58 | 17 | 4 | **sí** | **sí** | B | Buscador y filtros de estado y plan, con las tres secciones intactas (4.5). Falta plegar el formulario de alta del final | 🟡 |
| `/offer` (vitrina) | 27 | 34 | 0 | **sí** | no | E | Buscador y filtro por categoría, con la agrupación intacta. No pagina a propósito: la vitrina se lee entera | 🟡 |

### Paciente (móvil, 375 px)

| Ruta | kB | li | det | filtro | pag | Defectos | Qué hacer | Estado |
|---|---|---|---|---|---|---|---|---|
| `/patient` (portada) | 19 | 12 | 0 | — | — | — | Semana + racha + sesión en curso (17.5). OK | ✅ |
| `/routine` | 29 | 23 | **0** | — | — | A, B | 23 elementos, los dos días abiertos. **Plegar los días** con el botón de iniciar en la cabecera (9.2); subir la sesión en curso arriba (9.1) | ⬜ |
| `/patient/profile` | 29 | 5 | 2 | — | — | — | Resumen de lectura + edición plegada (17.3). OK | ✅ |
| `/attendance/me` | 18 | 13 | 0 | — | — | H | Revisar que el vacío explique qué hacer | ⬜ |
| `/memberships/me` | 16 | 5 | 0 | — | — | — | OK | ✅ |
| `/routine/sessions/[id]` | — | — | `<details>` | — | — | E | Registro de sesión: el formulario de cada ejercicio mide ~968 px (doc 12). Acotar (8.x) | ⬜ |

### Sin sesión

| Ruta | Defectos | Qué hacer | Estado |
|---|---|---|---|
| `/`, `/login`, `/recuperar`, `/actualizar-contrasena`, `/patient/onboarding` | — | Rediseño visual ya aplicado (fase 6). Revisar el wizard de onboarding a 375 px | ⬜ |

---

## 4. Orden de ejecución

El patrón que sale de la tabla: **casi ninguna lista tiene filtro y solo `/exercises` tiene
paginación**. Eso es lo que hay que cerrar primero, y es exactamente lo que la sección 1 del
change dejó preparado y nunca se ejecutó.

1. ~~**Cimientos** (sección 1 de `tasks.md`)~~ — **hecho.** `lib/shared/list-params.ts`,
   `FilterForm`, `Pagination`, `Chip`, `Skeleton`, `DataList`, y `ListFilters` (la barra de
   filtros completa) movida a `components/ui/` porque ya la consumen tres slices.
2. ~~**Filtros y paginación en las listas del personal**~~ — **hecho** (2026-09-07):
   `/pro/alerts`, `/pro/routines`, `/pro/sessions`, `/screenings`, `/attendance`,
   `/memberships`, `/offer`, `/templates` y `/rules`. Las nueve tienen filtro; ocho paginan
   —`/offer` no, a propósito—.
3. **Historiales de un paciente** (`/screenings/[id]`, `/attendance/[id]`): selector de
   año/mes y plegado de lo antiguo.
4. **Formularios largos que siguen abiertos**: `/plans`, `/memberships`, `/exercises/new`,
   `/rules/*`, el registro de tamizaje.
5. **Banda de pestañas del paciente** (5.2) para `/people/[id]` y las cinco vistas de al lado
   (desbloquea 17.6).
6. **Detalle en modal** (15.x) donde una lectura no necesita cambiar de pantalla.
7. **Vistas del paciente**: plegar los días de `/routine`, acotar el registro de sesión.

## 5. Regla para las sesiones futuras

Antes de dar por buena una pantalla, pasarla por la rúbrica del punto 2. Si tiene una lista,
**tiene que** poder filtrarse y, si crece, paginarse. Si tiene un formulario de edición que no
es lo primero que el usuario viene a hacer, **va plegado**. No se cierra una fila de la tabla
sin medir el antes/después en Chrome y anotarlo en el doc 12.
