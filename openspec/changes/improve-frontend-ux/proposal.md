## Why

El backend y la infraestructura están cerrados, y el rediseño visual dejó un sistema de
diseño sólido: tokens, shell por rol, componentes compartidos y una auditoría automatizada.
Lo que falta no es aspecto, es **manejo**. El frontend es lo único que el cliente ve, y hoy
hay tres carencias medibles:

- **Un solo listado de toda la aplicación tiene búsqueda, filtros y paginación**
  (`/exercises`). Personas, alertas, sesiones, membresías, asistencia, tamizajes, plantillas
  y reglas se traen enteros o se cortan con topes duros invisibles —200 alertas, 50
  sesiones— sin avisar de que hay más. No hay ninguna ordenación configurable.
- **No existe una vista consolidada del paciente.** Sus datos viven en seis rutas
  independientes, cada una con su propio listado de pacientes. Asignar una rutina cuesta tres
  saltos de página; ver la evolución, otros tres. `/evolution/[patientId]` no tiene ni
  entrada de menú: solo se llega desde dos fichas concretas.
- **La sesión del paciente pierde el acuse de guardado** por un remount de React, y
  «Sesión completada» no llega a verse nunca. Son dos defectos reproducibles, no
  percepciones.

El objetivo es que el paciente, el entrenador y el fisioterapeuta encuentren lo que buscan y
completen sus tareas frecuentes sin recorrer listas enteras ni saltar entre pantallas.

## What Changes

- **Filtros, búsqueda, ordenación y paginación en todos los listados del personal**, con el
  estado en la URL —compartible, con el botón de retroceso funcionando— sobre un
  `<form method="get">` que sigue funcionando sin JavaScript y que, con JavaScript, se
  autoenvía al cambiar un desplegable y tras un retardo al escribir.
- **Ficha consolidada del paciente**: una banda de pestañas común sobre las seis rutas que ya
  existen, más un resumen agregado en `/people/[id]`. Ir de rutinas a evolución pasa de tres
  saltos a un toque.
- **Vista móvil del paciente**: los dos defectos corregidos, avance visible durante la
  sesión, el formulario del ejercicio pendiente abierto, la sesión en curso arriba y la
  portada con datos en vez de un duplicado de la barra inferior.
- **Fricciones de edición del personal**: confirmación en las seis acciones destructivas que
  hoy no la piden, buscador del catálogo permanente al construir una plantilla, y acuses que
  dejan de quedarse pegados en la URL.
- **Piezas compartidas nuevas** en `components/ui/`: `FilterForm`, `Pagination`, `Chip`,
  `Skeleton`, `DataList`, `Progress`, `SubmitButton`, `ConfirmSubmit`, `FlashToast`; y un
  helper de parámetros de listado en `lib/shared/`.

**No cambia el esquema.** No se añade ninguna dependencia: `@base-ui/react` v1.8.0 ya está
instalado y aporta las primitivas que faltan.

## Capabilities

### New Capabilities

Ninguna. No se añade comportamiento de negocio: se cambia cómo se llega a él.

### Modified Capabilities

Ninguna cambia sus reglas. En todas cambia la forma de consultarlas —filtros, paginación y
navegación— y las funciones de lectura de `lib/**` ganan parámetros opcionales:

- `exercise-library`: el catálogo gana ordenación y su buscador embebido deja de duplicarse.
- `routine-templates`: la lista gana búsqueda, filtros y paginación, y construir una plantilla
  deja de exigir una navegación por cada ejercicio añadido.
- `assignment-rules`: la lista gana búsqueda y filtros; el orden por prioridad no se toca.
- `routine-assignment`: el profesional llega al paciente desde cualquier sección y confirma
  antes de reemplazar una rutina activa.
- `routine-execution`: el paciente ve su avance, conserva el acuse de lo que guardó y ve
  confirmado el cierre de la sesión.
- `clinical-alerts`: la bandeja gana filtros y paginación, y el conteo de alertas sin leer
  deja de calcularse sobre una lista recortada.
- `screenings`: la lista gana búsqueda y el filtro de pacientes sin tamizaje.
- `attendance`: la lista gana búsqueda, filtro de pacientes sin asistencias y selector de mes,
  que hoy es fijo.
- `plans-and-memberships`: la lista gana búsqueda y filtros conservando su agrupación por
  estado.
- `staff-and-patient-management`: la lista de personas gana búsqueda, filtros y paginación, y
  su consulta sale del componente a `lib/`.

## Impact

- **Esquema:** ninguno. Sin migraciones, sin `db:reset` obligatorio.
- **Código:** `components/ui/**` y `lib/shared/**` (compartidos, avisar al equipo),
  `components/patients/**` (nuevo), `app/(admin)/**`, `app/(pro)/**`, `app/(progress)/**`,
  `app/(people)/**`, `app/(patient)/**`, y las funciones de lectura de `lib/catalog/**`,
  `lib/routines/**`, `lib/progress/**`, `lib/auth/**`.
- **Riesgo principal:** dieciocho suites de `scripts/` localizan formularios por expresión
  regular sobre el HTML del servidor. Sus contratos están ahora en
  [`docs/11-contratos-de-las-suites-http.md`](../../../docs/11-contratos-de-las-suites-http.md),
  de lectura obligatoria antes de tocar cualquier pantalla de este change.
- **Depende de:** los cuatro slices anteriores, completos.
- **Añadido el 2026-09-07, tras medir las pantallas en el navegador**
  ([`docs/12-medicion-de-densidad.md`](../../../docs/12-medicion-de-densidad.md)): filtrar y
  paginar acota cuántas filas se traen, pero no cuánto ocupa cada una. Una alerta mide
  658 px —cabe una por pantalla— y una tarjeta de ejercicio dedica el 59 % de su alto a la
  imagen, mientras `/pro/routines` resuelve un paciente en 66 px. De ahí salen tres secciones
  nuevas: **densidad conmutable y evidencia plegada** (14), **detalle en diálogo de solo
  lectura**, que estrena el `Dialog` construido en la fase 3 del rediseño y hoy usado en una
  sola pantalla (15), y **buscador de paciente en la cabecera con el panel separado del
  directorio** (16). Ninguna mueve un formulario a un diálogo: el ADR-0008 sigue mandando.

- **Se entrega en seis fases con revisión entre fases**, una rama y un pull request por
  tanda. El protocolo está en [`ejecucion.md`](ejecucion.md).
