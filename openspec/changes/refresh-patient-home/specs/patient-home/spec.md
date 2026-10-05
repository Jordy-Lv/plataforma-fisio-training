## Purpose

Que el paciente vea al entrar lo que le importa —qué le toca hoy, su semana y su membresía— y
que su barra le diga con qué plan entrena.

## ADDED Requirements

### Requirement: La portada dice qué le toca hoy

La portada del paciente SHALL mostrar en primer lugar una sola de estas situaciones, por orden
de prioridad: una sesión a medias con el acceso para continuarla; una sesión programada para
hoy con su número de ejercicios y el acceso al día de rutina; que hoy ya entrenó; que aún no
tiene rutina; o que hoy descansa, con su próxima sesión programada si la hay. La portada MUST
NOT contener formularios propios.

#### Scenario: Sesión programada hoy

- **WHEN** un paciente con un día de rutina programado para hoy abre `/patient`
- **THEN** ve «Hoy te toca», el nombre del día y su número de ejercicios, y «Empezar sesión»
  lleva a ese día de rutina

#### Scenario: Sin rutina

- **WHEN** un paciente sin rutina activa abre `/patient`
- **THEN** ve que aún no tiene rutina y que su profesional la asignará

### Requirement: La semana muestra lo hecho y lo programado

La portada SHALL mostrar los siete días de la semana distinguiendo los días con sesión
terminada, los días con sesión programada pendiente y el día de hoy, la meta semanal cuando
hay sesiones programadas y un acceso al calendario.

#### Scenario: Ver calendario

- **WHEN** el paciente pulsa «Ver calendario»
- **THEN** llega a `/routine/calendar`

### Requirement: El menú lateral muestra el plan vigente

En escritorio, el pie del menú lateral del paciente SHALL mostrar el nombre del plan de su
membresía activa o por vencer y los días que le quedan, con una barra de lo que resta, y SHALL
llevar a `/memberships/me`. Si no tiene ninguna vigente, SHALL mostrar «Básico» y «Sin
membresía activa». La barra superior MUST NOT repetir el plan.

#### Scenario: Con membresía vigente

- **WHEN** un paciente con una membresía activa del plan «Plan Semestral» abre una pantalla
- **THEN** el pie del menú dice «Tu plan · Semestral» y cuántos días le quedan

#### Scenario: Sin membresía vigente

- **WHEN** un paciente sin membresía, o con la última vencida o cancelada, abre una pantalla
- **THEN** el pie del menú dice «Básico» y «Sin membresía activa»

### Requirement: Aviso de membresía por vencer

Cuando la membresía del paciente esté por vencer, la portada SHALL mostrar un aviso con los
días que faltan, la fecha y un acceso a `/memberships/me`. El aviso SHALL poder cerrarse.

#### Scenario: Por vencer

- **WHEN** un paciente con una membresía en estado `expiring_soon` abre `/patient`
- **THEN** ve el aviso «Tu plan vence en N días» y «Saber más» lleva a `/memberships/me`

### Requirement: El menú del paciente se pliega

En escritorio, el menú lateral del paciente SHALL poder plegarse a un riel de iconos y
desplegarse, y SHALL conservar el estado entre pantallas.

#### Scenario: Plegar el menú

- **WHEN** el paciente pulsa «Plegar menú» y luego abre otra pantalla
- **THEN** el menú sigue plegado, con solo los iconos y su nombre accesible

### Requirement: La portada sigue el mismo orden en el teléfono y en escritorio

La portada del paciente SHALL empezar por su semana, sin tarjeta: la racha de semanas y los
días con lo entrenado, lo programado y hoy marcados (7 en el teléfono y 14 en escritorio,
con la semana siguiente), la meta semanal y el acceso al calendario. Debajo SHALL mostrar qué
le toca hoy, con sus ejercicios y el botón para hacerlo, y SHALL ofrecer accesos a «Mi
evolución» (`/routine/evolution`) y «Mi equipo» (`/patient/profile#equipo`). En escritorio
SHALL añadir sus próximas sesiones junto a la tarjeta de hoy. A 1280 × 720 MUST NOT
necesitar desplazamiento. El nombre del profesional MUST salir solo si la RLS deja leerlo.

#### Scenario: Escritorio con sesión a medias

- **WHEN** un paciente con una sesión a medias abre `/patient` a 1536 × 730
- **THEN** ve su racha, catorce días, «Te quedaste aquí» con sus ejercicios y el siguiente
  resaltado, sus próximas sesiones y los accesos a su evolución y su equipo, sin desplazar

#### Scenario: Teléfono

- **WHEN** el mismo paciente abre `/patient` a 390 px
- **THEN** ve su racha y siete días, su entrenamiento y los dos accesos
