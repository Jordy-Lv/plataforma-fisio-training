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
| `/people/[id]` (ficha) | 38 | 19 | 2 | no | — | — | **Banda de pestañas** montada (5.2): las seis vistas del paciente a un toque. Falta la cabecera con membresía y condiciones (5.3), que necesita la agregación de 5.1 | 🟡 |

### Catálogo

| Ruta | kB | li | det | filtro | pag | Defectos | Qué hacer | Estado |
|---|---|---|---|---|---|---|---|---|
| `/exercises` | 64 | 37 | 0 | sí | sí | E | Ya tiene vista lista/tarjetas, filtros y paginación. Falta el **detalle en modal** (15.2) y ordenar (14.7) | 🟡 |
| `/exercises/new`, `/exercises/[id]` | 41–47 | 13 | **1** | — | — | — | Los tres etiquetados obligatorios a dos columnas; el nivel y las contraindicaciones plegados. No se pliega lo obligatorio: un campo que Zod exige y no se ve produce un error sin origen visible | ✅ |
| `/templates` | 35 | 17 | 0 | sí | **sí** | — | Filtros y paginación montados. Queda ordenar (14.7) | ✅ |
| `/templates/[id]` | 180 | 31 | 15 | no | no | A, B, C | Prescripción y cabecera de día ya plegadas. **Falta el buscador embebido con paginación** (12.1) y medir la altura resultante | 🟡 |
| `/rules` | 55 | 19 | 0 | sí | **sí** | — | Filtros, paginación y ocultación de los controles de mover cuando hay filtro (2.6) | ✅ |
| `/rules/[id]`, `/rules/new`, `/rules/simulador` | 36–46 | 13 | **1** | — | — | — | Los seis criterios a dos columnas, el equipamiento junto a su modo, y la edad —el criterio que menos se usa— plegada | ✅ |

### Atención

| Ruta | kB | li | det | filtro | pag | Defectos | Qué hacer | Estado |
|---|---|---|---|---|---|---|---|---|
| `/pro/routines` | 24 | 18 | 0 | **sí** | **sí** | — | Buscador, estado del paciente y de la rutina, paginación, insignia de rutina y «Ver ficha» en cada tarjeta (3.5) | ✅ |
| `/pro/routines/[id]` | 91 | 27 | 9 | no | — | A | Prescripción de cada ejercicio plegada y banda de pestañas montada. Falta la **banda de avance** y plegar los días | 🟡 |
| `/pro/sessions` | 24 | 13 | 0 | **sí** | **sí** | — | Filtro de estado y rango de fechas, paginación; el `.limit(50)` fijo se retiró (3.6). Con paciente elegido monta su banda de pestañas | ✅ |
| `/pro/sessions/[id]` | 28 | 13 | 0 | — | — | — | Informe de una sesión; revisar densidad | ⬜ |
| `/pro/alerts` | 22 | 13 | sí | **sí** | **sí** | — | Evidencia plegada (14.5), filtros de lectura/prioridad/motivo/paciente, páginas de 20 y el conteo sin leer resuelto en la base (3.7, 3.8) | ✅ |

### Seguimiento

| Ruta | kB | li | det | filtro | pag | Defectos | Qué hacer | Estado |
|---|---|---|---|---|---|---|---|---|
| `/screenings` | 25 | 18 | 0 | **sí** | **sí** | — | Buscador, filtro «con tamizaje»/«sin tamizaje» y paginación (4.3) | ✅ |
| `/screenings/[id]` | 37 | 23 | **1** | **sí** | — | — | Filtro por año en el historial (18.2) y las nueve medidas opcionales plegadas: el registro abre con cuatro campos en vez de once. Banda de pestañas montada | ✅ |
| `/attendance` | 25 | 18 | 0 | **sí** | **sí** | — | Selector de mes con «Mes anterior»/«Mes siguiente», buscador, filtro «sin asistencias» y paginación (4.1, 4.2) | ✅ |
| `/attendance/[id]` | 31 | 27 | 0 | **sí** | — | — | Selector de mes en el historial, arrancando en el más reciente; sin JavaScript se ve entero. Banda de pestañas montada | ✅ |
| `/evolution/[id]` | 26 | 19 | 0 | — | — | — | Gráfica, con la banda de pestañas montada. Queda revisar el selector de métrica y el vacío | 🟡 |

### Negocio

| Ruta | kB | li | det | filtro | pag | Defectos | Qué hacer | Estado |
|---|---|---|---|---|---|---|---|---|
| `/plans` | 106 | 37 | **12** | sí | **sí** | — | Edición y altas plegadas, y **dos paginaciones independientes** de doce: `page` para los planes y `spage` para los servicios, porque las dos colecciones comparten pantalla y crecen sin relación | ✅ |
| `/memberships` | 61 | 17 | **5** | **sí** | **sí** | — | Buscador y filtros de estado y plan, las tres secciones intactas (4.5) y el alta del final plegada | ✅ |
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
3. ~~**Historiales de un paciente**~~ — **hecho** (2026-09-07): `/attendance/[id]` acota por
   mes y `/screenings/[id]` por año, los dos con `components/ui/PeriodFilter.tsx`. No es un
   `<form>` a propósito: uno `GET` en una pantalla cuyo marcador es un uuid secuestraría el
   formulario de la server action.
4. ~~**Formularios largos que siguen abiertos**~~ — **hecho** (2026-09-07): el registro de
   tamizaje, `/plans`, `/memberships`, `/exercises/new` y `/rules/*`. La regla que salió de
   aquí: **se pliega lo opcional, nunca lo obligatorio** —un campo que Zod exige y el usuario
   no ve produce un error del que no se ve el origen—; lo obligatorio y largo se compacta a
   dos columnas.
5. ~~**Banda de pestañas del paciente**~~ — **hecho** (2026-09-07):
   `components/patients/PatientTabs.tsx` en las seis vistas, con el subrayado de 2 px de la
   tarea 17.6. Falta la cabecera de 5.3 (membresía y condiciones), que necesita la agregación
   de 5.1.
6. **Detalle en modal** (15.x) donde una lectura no necesita cambiar de pantalla.
7. **Vistas del paciente**: plegar los días de `/routine`, acotar el registro de sesión.
8. ~~**Paginar `/plans`**~~ — **hecho** (2026-09-07). Al hacerlo salió un fallo que afectaba a
   **seis listados**: cuando la página pedida empieza más allá de la última fila, PostgREST
   devuelve un `416 PGRST103` y la pantalla entera se caía —`?page=99` a mano, o quedarse en
   la página 4 y quitar un filtro—. Corregido en un solo sitio, `readPage` de
   `lib/shared/read-pages.ts`: una página vacía es una página vacía, no un error.

## 5. Regla para las sesiones futuras

Antes de dar por buena una pantalla, pasarla por la rúbrica del punto 2. Si tiene una lista,
**tiene que** poder filtrarse y, si crece, paginarse. Si tiene un formulario de edición que no
es lo primero que el usuario viene a hacer, **va plegado**. No se cierra una fila de la tabla
sin medir el antes/después en Chrome y anotarlo en el doc 12.
