## Purpose

El entrenador o fisioterapeuta decide qué rutina recibe cada paciente: elige una plantilla
de su especialidad, revisa y ajusta una copia que el paciente todavía no ve, y confirma la
asignación (ADR-0009 y ADR-0010).

## ADDED Requirements

### Requirement: El profesional elige la plantilla

El sistema SHALL permitir que el profesional a cargo elija una plantilla activa para un
paciente, y NO SHALL elegir, ordenar por coincidencia de perfil ni proponer una plantilla por
su cuenta. La pantalla SHALL mostrar junto a las plantillas el objetivo, el nivel, el entorno
y las condiciones activas del paciente.

#### Scenario: Lista de plantillas para elegir

- **WHEN** un entrenador abre la rutina de un paciente que no tiene borrador de
  entrenamiento
- **THEN** ve las plantillas activas de entrenamiento con sus días por semana, objetivo,
  nivel y entorno, junto a los datos del paciente, sin ninguna marcada como recomendada

#### Scenario: Filtrar plantillas

- **WHEN** el profesional filtra las plantillas por días por semana, nivel o entorno
- **THEN** la lista se reduce a las que cumplen el filtro, y el filtro se puede quitar

#### Scenario: Sin plantillas disponibles

- **WHEN** no hay ninguna plantilla activa del tipo del profesional
- **THEN** la pantalla lo explica y dice que es el administrador quien activa plantillas

### Requirement: Elegir una plantilla crea un borrador invisible para el paciente

Elegir una plantilla SHALL crear una copia completa (snapshot) de sus días y ejercicios en
estado de borrador. El paciente NO SHALL poder leer un borrador, y crear un borrador NO SHALL
cerrar la rutina activa que el paciente tenga ni generar ninguna alerta.

#### Scenario: Borrador creado

- **WHEN** el profesional elige una plantilla de tres días
- **THEN** existe un borrador con esos tres días y sus ejercicios, y la plantilla no cambia

#### Scenario: El paciente no ve el borrador

- **WHEN** el paciente abre su rutina mientras su profesional prepara un borrador y no tiene
  otra rutina activa
- **THEN** ve «Tu profesional está preparando tu rutina» y ningún dato del borrador

#### Scenario: La rutina activa sigue mientras se prepara otra

- **WHEN** el profesional crea un borrador de entrenamiento para un paciente con rutina de
  entrenamiento activa
- **THEN** el paciente sigue viendo y ejecutando su rutina activa sin cambios

#### Scenario: Perfil sin terminar

- **WHEN** el profesional elige una plantilla para un paciente que no ha terminado su
  registro
- **THEN** la operación se rechaza con un mensaje que pide completar el perfil antes, porque
  sin sus condiciones no se pueden excluir los ejercicios contraindicados

#### Scenario: Sin alertas al crear el borrador

- **WHEN** se crea un borrador
- **THEN** no se genera ninguna alerta ni ningún registro de asignación

### Requirement: Un solo borrador por paciente y tipo

Un paciente NO SHALL tener más de un borrador del mismo tipo. Para elegir otra plantilla
cuando ya hay un borrador de ese tipo, el profesional SHALL descartarlo antes, y descartar
SHALL pedir confirmación.

#### Scenario: Doble envío

- **WHEN** el profesional envía dos veces la elección de una plantilla
- **THEN** el paciente sigue teniendo un único borrador de ese tipo y el segundo envío
  recibe un mensaje que explica que ya hay un borrador

#### Scenario: Cambiar de plantilla con borrador abierto

- **WHEN** el profesional con un borrador abierto pulsa «Descartar y elegir otra» y lo
  confirma
- **THEN** el borrador deja de mostrarse, vuelve el paso de elegir plantilla y la nueva
  elección crea un borrador nuevo

#### Scenario: Descartar el borrador

- **WHEN** el profesional descarta un borrador
- **THEN** el borrador deja de mostrarse, el paciente nunca lo ve y su rutina activa, si la
  tiene, no cambia

### Requirement: Los ejercicios contraindicados se excluyen al crear el borrador

Al crear el borrador, el sistema SHALL quitar los ejercicios de la plantilla que estén
contraindicados para alguna condición activa del paciente, y SHALL decir cuáles quitó.
Añadir a mano un ejercicio contraindicado SHALL estar permitido y SHALL mostrar un aviso con
la condición afectada.

#### Scenario: Ejercicio contraindicado en la plantilla

- **WHEN** un paciente con una condición activa de rodilla recibe un borrador de una
  plantilla que incluye un ejercicio contraindicado para rodilla
- **THEN** el borrador no incluye ese ejercicio y la pantalla dice que se quitó y por qué

#### Scenario: Ejercicio contraindicado añadido a mano

- **WHEN** el profesional añade al borrador un ejercicio contraindicado para una condición
  activa del paciente
- **THEN** el ejercicio se añade y la pantalla muestra «contraindicado para» con la
  condición y la invitación a sustituirlo

### Requirement: Confirmar publica la rutina

Confirmar un borrador SHALL convertirlo en la rutina activa del paciente para su tipo,
registrar quién la asignó y cerrar como `completed` la rutina activa anterior del mismo tipo,
conservando su historial de sesiones. Tras confirmar, el paciente SHALL poder verla y el
sistema SHALL registrar la asignación y avisar a los profesionales de ese tipo como hasta
ahora.

#### Scenario: Confirmación correcta

- **WHEN** el profesional confirma un borrador sin días vacíos
- **THEN** la respuesta muestra «Rutina asignada. El paciente ya puede consultarla.» y el
  paciente ve la rutina en su vista

#### Scenario: Reemplazo de la rutina activa

- **WHEN** el profesional confirma un borrador de entrenamiento para un paciente con otra
  rutina de entrenamiento activa
- **THEN** la pantalla pidió confirmación antes de enviar, la anterior queda `completed`
  con sus sesiones y la nueva queda activa

#### Scenario: Un día vacío bloquea la confirmación

- **WHEN** el profesional intenta confirmar un borrador con un día sin ejercicios
- **THEN** la confirmación se rechaza con un mensaje que nombra el día y dice que le añada
  al menos un ejercicio

#### Scenario: Días cortos piden confirmación

- **WHEN** el borrador tiene días con uno o dos ejercicios y ninguno vacío
- **THEN** la pantalla avisa de qué días son cortos antes de confirmar, y si el profesional
  confirma la rutina se asigna

#### Scenario: Un borrador no se activa sin confirmar

- **WHEN** alguien intenta pasar un borrador a activo sin usar la confirmación
- **THEN** la base de datos lo rechaza

### Requirement: La especialidad limita qué plantillas se asignan

Un profesional SHALL poder crear y confirmar borradores solo de plantillas cuyo tipo
coincida con su especialidad, y solo para pacientes con los que tenga una asignación de
cuidado vigente de ese tipo. El administrador SHALL poder hacerlo con las dos
especialidades. La edición de ejercicios de una rutina ya creada SHALL seguir abierta a
cualquier profesional que atienda al paciente.

#### Scenario: Entrenador con plantilla de rehabilitación

- **WHEN** un entrenador pide un borrador de una plantilla de rehabilitación, desde la
  pantalla o llamando directamente a la API
- **THEN** la base de datos lo rechaza y el paciente no recibe nada

#### Scenario: Profesional sin asignación vigente

- **WHEN** un profesional sin asignación de cuidado vigente sobre el paciente pide o
  confirma un borrador
- **THEN** la operación se rechaza

#### Scenario: El administrador elige el tipo

- **WHEN** el administrador abre la rutina de un paciente
- **THEN** puede elegir si prepara una rutina de entrenamiento o de rehabilitación, y ver y
  confirmar borradores de las dos

#### Scenario: Edición compartida

- **WHEN** el fisioterapeuta del paciente ajusta las series de un ejercicio de su rutina de
  entrenamiento
- **THEN** el ajuste se guarda, como antes de este change

#### Scenario: El paciente no puede asignarse nada

- **WHEN** un paciente o un usuario anónimo pide o confirma un borrador
- **THEN** la operación se rechaza

### Requirement: La pantalla de rutina del paciente va por pasos

`/pro/routines/[patientId]` SHALL mostrar un solo paso a la vez según el estado de la rutina
del tipo en curso: elegir plantilla si no hay borrador ni rutina activa, ajustar y confirmar
si hay borrador, o la rutina activa con la opción de cambiar de plantilla. El profesional
SHALL ver solo la rutina de su tipo; si existe una rutina activa del otro tipo, SHALL ver
solo un aviso de que existe. Las rutinas ya cerradas NO SHALL mostrarse como rutinas
editables.

#### Scenario: Paciente sin rutina

- **WHEN** el profesional abre la pantalla de un paciente sin borrador ni rutina activa de su
  tipo
- **THEN** ve el paso «Elegir plantilla» y ningún buscador del catálogo

#### Scenario: Paciente con borrador

- **WHEN** el profesional abre la pantalla de un paciente con un borrador de su tipo
- **THEN** ve el borrador marcado como no visible para el paciente, con las acciones de
  confirmar y descartar, y los ejercicios con sus controles de ajuste

#### Scenario: Paciente con rutina activa

- **WHEN** el profesional abre la pantalla de un paciente con rutina activa de su tipo y sin
  borrador
- **THEN** ve la rutina activa con sus controles de ajuste y un acceso para cambiar de
  plantilla

#### Scenario: Buscador enfocado

- **WHEN** el profesional pulsa «Añadir ejercicios a este día» o «Sustituir por otro
  ejercicio»
- **THEN** aparece el buscador del catálogo enfocado en ese día o ese ejercicio, y se cierra
  al salir; sin foco no se muestra

#### Scenario: Rutina de la otra especialidad

- **WHEN** un entrenador abre la pantalla de un paciente que además tiene rutina de
  rehabilitación activa
- **THEN** ve un aviso de que existe, sin sus ejercicios ni sus controles
