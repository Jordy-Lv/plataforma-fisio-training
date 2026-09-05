## Purpose

Registra cada vez que un cliente asiste, para poder cruzar adherencia con resultados y
sustentar con datos una conversación que hoy se resuelve de memoria.

## ADDED Requirements

### Requirement: Registro de asistencia

Un `admin` o el profesional con asignación vigente SHALL poder registrar la asistencia de
un paciente en una fecha. NO SHALL poder registrarse dos veces la misma fecha para el mismo
paciente.

#### Scenario: Asistencia registrada

- **WHEN** el profesional registra que su paciente asistió hoy
- **THEN** queda el registro con la fecha y la hora, y quién lo registró

#### Scenario: Asistencia duplicada

- **WHEN** se intenta registrar dos veces la asistencia del mismo paciente el mismo día
- **THEN** el sistema lo impide indicando que ya está registrada

#### Scenario: El paciente no registra su asistencia

- **WHEN** un paciente intenta registrar su propia asistencia
- **THEN** la operación es rechazada; puede consultarla

### Requirement: Historial y resumen

El sistema SHALL mostrar el historial de asistencia de un paciente y su resumen del mes en
curso.

#### Scenario: Resumen mensual

- **WHEN** el profesional consulta a un paciente
- **THEN** ve cuántas veces asistió en el mes en curso y su historial

#### Scenario: El paciente consulta su asistencia

- **WHEN** el paciente abre su sección de progreso
- **THEN** ve sus propias asistencias del mes, y solo las suyas
