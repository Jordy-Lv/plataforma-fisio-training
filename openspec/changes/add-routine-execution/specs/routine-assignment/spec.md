## Purpose

Convierte una plantilla base en la rutina concreta de un paciente y permite que el
profesional la ajuste a ese caso sin que la plantilla original se vea afectada.

## ADDED Requirements

### Requirement: Asignación como copia

Al asignarse una plantilla a un paciente, el sistema SHALL copiar sus días y sus ejercicios
a las tablas de la rutina del paciente. La rutina resultante SHALL ser independiente de la
plantilla desde ese momento.

#### Scenario: Rutina asignada

- **WHEN** una plantilla de 3 días se asigna a un paciente
- **THEN** el paciente tiene una rutina activa con los mismos 3 días y los mismos
  ejercicios, series y repeticiones, en el mismo orden

#### Scenario: Trazabilidad del origen

- **WHEN** se consulta una rutina asignada
- **THEN** se puede saber de qué plantilla salió, sin que esa referencia se use para leer
  su contenido

#### Scenario: La plantilla no se modifica

- **WHEN** se asigna la misma plantilla a diez pacientes distintos
- **THEN** la plantilla permanece idéntica y cada paciente tiene su propia copia

### Requirement: Ajuste por el profesional

El profesional con asignación vigente sobre el paciente SHALL poder modificar series,
repeticiones, peso objetivo y descanso, eliminar ejercicios, añadir otros del catálogo y
sustituir uno por otro. Un profesional sin asignación NO SHALL poder hacerlo.

#### Scenario: Ajuste aplicado

- **WHEN** el profesional a cargo cambia las series de un ejercicio de la rutina de su
  paciente
- **THEN** el cambio se refleja en la rutina del paciente y el ejercicio queda marcado como
  modificado respecto de la plantilla

#### Scenario: La plantilla sigue intacta tras el ajuste

- **WHEN** el profesional elimina un ejercicio de la rutina de un paciente
- **THEN** la plantilla de origen conserva ese ejercicio, y el siguiente paciente que la
  reciba lo tendrá

#### Scenario: Profesional sin asignación

- **WHEN** un profesional sin asignación vigente intenta modificar la rutina de ese paciente
- **THEN** la operación es rechazada por la base de datos

#### Scenario: El paciente no edita su rutina

- **WHEN** un paciente intenta modificar un ejercicio de su rutina
- **THEN** la operación es rechazada; el paciente ejecuta la rutina, no la define

### Requirement: Una rutina activa por tipo

Un paciente SHALL poder tener a la vez una rutina activa de entrenamiento y una de
rehabilitación, y NO SHALL tener dos activas del mismo tipo.

#### Scenario: Rutina de entrenamiento y de rehabilitación

- **WHEN** un paciente con rutina de entrenamiento activa recibe además una de
  rehabilitación
- **THEN** ambas quedan activas y el paciente ve las dos en su vista

#### Scenario: Nueva rutina del mismo tipo

- **WHEN** se asigna una nueva rutina de entrenamiento a un paciente que ya tiene una activa
- **THEN** la anterior pasa a estado `completed` conservando todo su historial de sesiones
