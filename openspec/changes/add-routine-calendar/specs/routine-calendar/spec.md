## Purpose

Organizar las rutinas del paciente por fechas y permitir que paciente y equipo conozcan el cumplimiento de las sesiones programadas de cada semana.

## ADDED Requirements

### Requirement: Programación por el equipo
El sistema SHALL permitir al administrador y al profesional con vínculo vigente programar un día de rutina activa para hoy o una fecha futura, y cancelar programaciones sin ejecución y no pasadas. SHALL impedir duplicados y conservar las cancelaciones.

#### Scenario: Programar una sesión
- **WHEN** el profesional asignado selecciona un día de rutina de su paciente y una fecha válida
- **THEN** la programación aparece en ambos calendarios y persiste al recargar

#### Scenario: Asignar y programar al final del día
- **WHEN** el profesional asigna una rutina cuando el servidor ya tiene otra fecha pero en Bogotá aún es hoy
- **THEN** la rutina comienza en la fecha de Bogotá y puede programarse y ejecutarse hoy, sin esperar al siguiente día

#### Scenario: Escritura ajena o incoherente
- **WHEN** un paciente o profesional no asignado intenta programar, o se mezcla un paciente con el día de otra persona
- **THEN** la base rechaza la escritura incluso por API directa

#### Scenario: Programar desde un día vacío
- **WHEN** el profesional o administrador pulsa un día vacío entre hoy y un año para un paciente activo con días de rutina activa
- **THEN** se abre el formulario de programación con esa fecha seleccionada

#### Scenario: Crear la rutina antes de programar
- **WHEN** el profesional o administrador pulsa un día vacío válido de un paciente activo sin días de rutina activa
- **THEN** se abre el flujo existente de creación/asignación con la fecha elegida y un enlace de regreso para programarla

#### Scenario: Consulta de días vacíos por el paciente
- **WHEN** el paciente selecciona un día vacío
- **THEN** consulta esa fecha sin recibir opciones para crear, asignar o programar rutinas

### Requirement: Calendario accesible
El sistema SHALL mostrar mes y semana con inicio en lunes, selección de fecha, navegación y acceso al día actual según America/Bogota. SHALL mostrar carga, vacío explicativo y error recuperable, con controles táctiles de al menos 44 px a 375 px de ancho.

El calendario SHALL aparecer antes de la meta semanal. Las rutinas dentro de la cuadrícula SHALL abrir su descripción directamente, mientras el número del día permite seleccionar la fecha.

#### Scenario: Abrir una rutina desde la cuadrícula
- **WHEN** el paciente pulsa una rutina de cualquier fecha visible
- **THEN** llega a sus ejercicios e indicaciones y puede volver a esa fecha y vista del calendario

#### Scenario: Seleccionar una fecha
- **WHEN** el cliente selecciona una fecha o cambia de mes o semana
- **THEN** ve las rutinas de esa fecha y sus estados sin perder el contexto de navegación

#### Scenario: Editar ejercicios desde el calendario
- **WHEN** el profesional abre una rutina desde el calendario y busca ejercicios para añadir o sustituir
- **THEN** conserva la fecha y vista elegidas al buscar, cerrar el buscador y volver al calendario

### Requirement: Ejecución e historial reales
El sistema SHALL combinar las programaciones y las sesiones registradas por paciente, día de rutina y fecha. SHALL conservar visibles las sesiones no programadas y distinguir programada, pendiente, en curso, completada y abandonada. SHALL reutilizar la ejecución existente y no registrar sesiones en fechas futuras o pasadas desde el calendario.

#### Scenario: Sesión completada
- **WHEN** se completa una sesión desde el flujo de ejecución
- **THEN** al volver al calendario su fecha muestra completada y permite consultar el registro

### Requirement: Meta semanal calculada
El sistema SHALL calcular la meta de la semana seleccionada como el número de programaciones vigentes y el avance como las que tengan al menos una sesión completada en el mismo día de rutina y fecha. Repetir la ejecución SHALL contar una sola vez para esa programación; las sesiones no programadas SHALL aparecer en el historial sin inflar la meta.

#### Scenario: Una de tres
- **WHEN** existen tres programaciones en la semana y una tiene una sesión completada
- **THEN** el calendario muestra una de tres y un tercio de progreso

#### Scenario: Semana sin programación
- **WHEN** no hay programaciones vigentes en la semana
- **THEN** explica que el profesional debe programar sesiones, sin inventar una meta

### Requirement: Aislamiento y conservación
El sistema SHALL permitir al paciente leer solo su calendario, al profesional solo los de pacientes asignados y al administrador los de todos. Los usuarios inactivos SHALL perder acceso. Al finalizar una rutina SHALL cancelar sus programaciones de hoy en adelante sin ejecución y conservar su historial.

#### Scenario: Fin del vínculo
- **WHEN** termina la asignación del profesional
- **THEN** deja de poder leer o modificar el calendario de ese paciente

#### Scenario: Rutina reemplazada
- **WHEN** una rutina activa se cierra al asignar otra
- **THEN** sus fechas futuras sin ejecución dejan de contar como pendientes y sus sesiones realizadas permanecen visibles
