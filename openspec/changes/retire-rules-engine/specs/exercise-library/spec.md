## RENAMED Requirements

- FROM: `### Requirement: Etiquetado para la asignación automática`
- TO: `### Requirement: Etiquetado clínico de los ejercicios`

## MODIFIED Requirements

### Requirement: Etiquetado clínico de los ejercicios

Cada ejercicio SHALL declarar equipamiento necesario, entornos donde puede realizarse,
dificultad y las partes del cuerpo con las que está contraindicado, usando el vocabulario
cerrado compartido con las condiciones del paciente.

#### Scenario: Contraindicación registrada

- **WHEN** el equipo marca una sentadilla como contraindicada para `knee`
- **THEN** ese ejercicio se quita de los borradores de rutina que se creen para pacientes
  con una condición activa de rodilla, y la confirmación del etiquetado no menciona un motor
  de reglas

#### Scenario: Etiqueta fuera del vocabulario

- **WHEN** se intenta guardar una contraindicación que no pertenece al vocabulario definido
- **THEN** el sistema la rechaza indicando el valor inválido
