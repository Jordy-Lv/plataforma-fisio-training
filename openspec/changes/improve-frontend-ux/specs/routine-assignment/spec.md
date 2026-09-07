## Purpose

Asignar y ajustar la rutina de un paciente es la tarea más frecuente del profesional, y hoy
exige tres saltos de página y una acción irreversible sin confirmar.

## ADDED Requirements

### Requirement: Reemplazar una rutina activa pide confirmación

Cuando asignar una rutina vaya a reemplazar otra activa del mismo tipo, el sistema SHALL
advertirlo y pedir confirmación antes de hacerlo.

#### Scenario: El paciente ya tiene rutina activa

- **WHEN** el profesional asigna una rutina de entrenamiento a un paciente que ya tiene una
- **THEN** el sistema advierte que la actual se cerrará y pide confirmación

#### Scenario: El paciente no tiene ninguna

- **WHEN** el paciente no tiene rutina activa de ese tipo
- **THEN** la asignación se realiza sin pedir confirmación

### Requirement: Quitar un ejercicio de la rutina pide confirmación

Quitar un ejercicio de la rutina de un paciente SHALL pedir confirmación.

#### Scenario: Quitar por error

- **WHEN** el profesional pulsa quitar un ejercicio
- **THEN** el sistema pide confirmación antes de retirarlo

### Requirement: El listado de pacientes del profesional dice qué requiere atención

El listado de pacientes SHALL mostrar por paciente el estado de su rutina, de modo que se vea
sin entrar quién necesita algo.

#### Scenario: Paciente sin rutina asignada

- **WHEN** el profesional abre su listado de pacientes
- **THEN** distingue a los que no tienen rutina activa de los que sí
