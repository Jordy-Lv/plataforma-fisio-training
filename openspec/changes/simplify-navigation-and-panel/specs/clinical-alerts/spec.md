## Purpose

Que un paciente con entrenador y fisioterapeuta a la vez genere cada alerta para quien
tiene que atenderla, sin que ninguna alerta se quede sin destinatario.

## ADDED Requirements

### Requirement: Las alertas se reparten por especialidad

Cada tipo de alerta SHALL llegar al profesional de la especialidad que le corresponde: el
dolor al fisioterapeuta; los ejercicios saltados y la baja asistencia al entrenador; la
asignación de rutina a quien atiende ese tipo de rutina. El vencimiento de una membresía
SHALL llegar solo al administrador. El administrador SHALL recibir todas. Si ningún
profesional de la especialidad que corresponde acompaña al paciente, la alerta SHALL
llegar a todos los profesionales que sí lo acompañan. El reparto NO SHALL dar acceso a un
paciente que el profesional no acompaña.

#### Scenario: Dolor con entrenador y fisioterapeuta

- **WHEN** un paciente con entrenador y fisioterapeuta reporta dolor persistente
- **THEN** la alerta llega al fisioterapeuta y al administrador, y no al entrenador

#### Scenario: Dolor sin fisioterapeuta

- **WHEN** un paciente que solo tiene entrenador reporta dolor persistente
- **THEN** la alerta llega al entrenador

#### Scenario: Membresía por vencer

- **WHEN** se genera una alerta de membresía por vencer
- **THEN** solo la recibe el administrador
