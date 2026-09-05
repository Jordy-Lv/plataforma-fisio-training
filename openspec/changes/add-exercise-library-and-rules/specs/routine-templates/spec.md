## Purpose

Permite al equipo profesional definir una sola vez las rutinas base por objetivo y por
condición, para que la plataforma las proponga sin intervención y el profesional solo
ajuste lo específico.

## ADDED Requirements

### Requirement: Definición de plantillas

El equipo SHALL poder crear plantillas de rutina indicando tipo (`training` o `physio`),
objetivo, nivel, entorno y días por semana, con sus días y sus ejercicios ordenados.

#### Scenario: Plantilla completa

- **WHEN** un `admin` crea una plantilla de 3 días con ejercicios, series, repeticiones y
  descanso en cada día
- **THEN** la plantilla queda disponible para ser referenciada por una regla de asignación

#### Scenario: Plantilla sin días

- **WHEN** se intenta activar una plantilla que no tiene ningún día con ejercicios
- **THEN** el sistema lo impide indicando que la plantilla está incompleta

### Requirement: Orden de los ejercicios

Los ejercicios de un día SHALL tener un orden explícito, y ese orden SHALL conservarse al
asignarse a un paciente.

#### Scenario: Reordenar ejercicios

- **WHEN** el equipo cambia el orden de los ejercicios de un día
- **THEN** el nuevo orden se refleja en las asignaciones posteriores

### Requirement: Las plantillas no cambian al asignarse

Una plantilla NO SHALL modificarse como consecuencia de asignarla a un paciente ni de los
ajustes que un profesional haga sobre la rutina de ese paciente.

#### Scenario: Ajuste sobre un paciente

- **WHEN** un profesional modifica series, elimina o añade ejercicios en la rutina de un
  paciente
- **THEN** la plantilla de origen permanece idéntica

#### Scenario: Siguiente paciente

- **WHEN** otro paciente recibe la misma plantilla después de ese ajuste
- **THEN** recibe la plantilla original, sin los cambios hechos para el primer paciente

### Requirement: Desactivación de plantillas

El equipo SHALL poder desactivar una plantilla para que deje de asignarse, sin afectar a
las rutinas ya asignadas.

#### Scenario: Plantilla desactivada

- **WHEN** se desactiva una plantilla usada por una regla
- **THEN** deja de asignarse a pacientes nuevos, las rutinas existentes siguen funcionando,
  y el sistema advierte qué reglas quedaron sin plantilla activa
