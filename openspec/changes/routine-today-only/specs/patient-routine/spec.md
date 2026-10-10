## Purpose

Que el paciente haga cada sesión el día que su profesional la programa.

## ADDED Requirements

### Requirement: Mi rutina muestra solo lo de hoy

`/routine` SHALL mostrar solo los días de rutina programados para hoy, con sus ejercicios, su
volumen y las indicaciones de su profesional, y un botón para hacer cada uno. MUST NOT ofrecer
iniciar días que no estén programados para hoy.

#### Scenario: Día programado hoy

- **WHEN** un paciente con un día programado para hoy abre `/routine`
- **THEN** ve ese día con sus ejercicios e indicaciones y el botón «Empezar sesión»

#### Scenario: Nada programado hoy

- **WHEN** un paciente sin nada programado para hoy abre `/routine`
- **THEN** ve «No tienes sesión programada», su próxima sesión y el nombre de su rutina, sin
  ningún botón para iniciar

### Requirement: Historial aparte

El historial de sesiones SHALL estar en `/routine/history` y `/routine` SHALL enlazarlo con
«Ver historial de sesiones».

#### Scenario: Ver historial

- **WHEN** el paciente pulsa «Ver historial de sesiones»
- **THEN** llega a `/routine/history` con sus sesiones recientes

### Requirement: Las sesiones a medias de días anteriores se cierran

Una sesión `in_progress` empezada un día anterior SHALL mostrarse cerrada: la portada MUST NOT
ofrecer continuarla y su pantalla MUST NOT mostrar los formularios de registro.

#### Scenario: Sesión de ayer

- **WHEN** el paciente abre una sesión que empezó ayer y no terminó
- **THEN** ve «Esta sesión quedó sin terminar» y ningún formulario para registrar
