## Purpose

El paciente usa esta pantalla con el teléfono en una mano, entre series. Hoy pierde el acuse
de lo que acaba de guardar y no ve confirmado el cierre de la sesión.

## ADDED Requirements

### Requirement: Lo que el paciente guarda queda confirmado a la vista

Tras registrar un ejercicio, la confirmación SHALL permanecer visible y el bloque de registro
SHALL seguir abierto con lo que se guardó.

#### Scenario: Registrar un ejercicio

- **WHEN** el paciente confirma el registro de un ejercicio
- **THEN** ve el acuse de guardado sin que el bloque se cierre ni se vacíe

#### Scenario: Volver a la sesión más tarde

- **WHEN** vuelve a abrir la sesión desde otro dispositivo
- **THEN** ve marcados los ejercicios que ya registró

### Requirement: El cierre de la sesión se confirma

Al terminar una sesión, el paciente SHALL ver confirmado que quedó completada.

#### Scenario: Terminar la sesión

- **WHEN** el paciente termina la sesión
- **THEN** ve que quedó completada y deja de tener a la vista los controles de escritura

### Requirement: El avance de la sesión es visible mientras se entrena

Durante la sesión, el paciente SHALL ver cuántos ejercicios lleva registrados y cuántos le
faltan, sin depender de recorrer la lista.

#### Scenario: A mitad de la sesión

- **WHEN** ha registrado tres de seis ejercicios
- **THEN** ve su avance y puede saltar al siguiente pendiente

#### Scenario: Terminar dejando ejercicios sin registrar

- **WHEN** decide terminar con ejercicios sin registrar
- **THEN** el sistema le avisa de cuántos quedan y le deja terminar igualmente

### Requirement: Registrar el primer ejercicio pendiente no exige un paso previo

Al abrir una sesión, el bloque de registro del primer ejercicio sin registrar SHALL estar ya
abierto.

#### Scenario: Abrir la sesión del día

- **WHEN** el paciente abre una sesión recién iniciada
- **THEN** puede escribir en el primer ejercicio sin desplegar nada

### Requirement: La zona del dolor se ofrece acotada al ejercicio

Al reportar dolor, las zonas propuestas SHALL empezar por las que corresponden al ejercicio,
con acceso a la lista completa.

#### Scenario: Reportar dolor en un ejercicio de pierna

- **WHEN** el paciente reporta dolor en una sentadilla
- **THEN** ve primero las zonas del tren inferior, y puede elegir cualquier otra
