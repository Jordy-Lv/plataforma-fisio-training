## Purpose

Traduce el criterio del equipo profesional en reglas configurables que deciden qué rutina
base recibe cada paciente, de forma determinista y explicable, sin inteligencia artificial.

## ADDED Requirements

### Requirement: Evaluación por prioridad

El sistema SHALL evaluar las reglas activas en orden ascendente de prioridad y SHALL
detenerse en la primera cuyas condiciones coincidan con el perfil del paciente.

#### Scenario: Varias reglas coinciden

- **WHEN** el perfil de un paciente coincide con dos reglas de prioridad 20 y 40
- **THEN** se aplica la de prioridad 20 y la otra se ignora

#### Scenario: Ninguna regla coincide

- **WHEN** ninguna regla activa coincide con el perfil del paciente
- **THEN** el paciente NO recibe rutina automática, se genera una alerta para el
  profesional a cargo, y su vista indica que su profesional está preparando su rutina

#### Scenario: Regla desactivada

- **WHEN** una regla está marcada como inactiva
- **THEN** no participa en la evaluación, aunque su prioridad sea la más alta

### Requirement: Criterios de coincidencia

Una regla SHALL poder condicionar por objetivo, nivel, entorno, equipamiento (alguno o
todos), rango de edad y ausencia de condiciones determinadas. Los criterios presentes se
combinan con Y lógico; los valores dentro de un criterio, con O lógico. Un criterio ausente
NO SHALL restringir.

#### Scenario: Coincidencia por varios criterios

- **WHEN** una regla exige nivel `beginner` y entorno `home`, y el paciente es `beginner`
  en `home`
- **THEN** la regla coincide

#### Scenario: Un criterio no se cumple

- **WHEN** esa misma regla se evalúa contra un paciente `beginner` en `gym`
- **THEN** la regla no coincide

#### Scenario: Exclusión por condición

- **WHEN** una regla declara `excludes_conditions: ["knee"]` y el paciente tiene una
  condición activa de rodilla
- **THEN** la regla no coincide, aunque el resto de criterios sí

### Requirement: Filtro de contraindicaciones

Después de aplicar la regla ganadora, el sistema SHALL eliminar de la rutina resultante
todo ejercicio contraindicado para alguna condición activa del paciente.

#### Scenario: Ejercicio contraindicado

- **WHEN** la plantilla ganadora incluye un ejercicio contraindicado para `knee` y el
  paciente tiene esa condición activa
- **THEN** ese ejercicio no aparece en la rutina asignada, y queda registrado qué se
  eliminó y por qué

#### Scenario: Día que queda demasiado corto

- **WHEN** tras el filtro un día de la rutina queda con menos de tres ejercicios
- **THEN** la rutina se marca para revisión del profesional y se genera una alerta; el
  sistema NUNCA entrega un día vacío

### Requirement: Parametrización sin desplegar código

El equipo profesional SHALL poder crear, editar, reordenar y desactivar reglas desde el
panel de administración, y los cambios SHALL aplicarse a las asignaciones siguientes sin
intervención técnica.

#### Scenario: Cambio de plantilla en una regla

- **WHEN** un `admin` cambia la plantilla asociada a una regla
- **THEN** el siguiente paciente cuyo perfil coincida con esa regla recibe la nueva
  plantilla

#### Scenario: Reordenamiento

- **WHEN** un `admin` sube una regla por encima de otra
- **THEN** el orden de evaluación cambia en consecuencia

#### Scenario: Un profesional no edita reglas

- **WHEN** un `professional` intenta modificar una regla
- **THEN** la operación es rechazada; puede consultarlas, no cambiarlas

### Requirement: Simulador de asignación

El panel SHALL permitir introducir un perfil de paciente ficticio y mostrar qué regla
ganaría, qué plantilla se asignaría y qué ejercicios quedarían excluidos, sin crear ningún
dato.

#### Scenario: Simulación

- **WHEN** un `admin` simula un perfil `beginner`, `home`, con bandas y condición de rodilla
- **THEN** el sistema muestra la regla ganadora, la plantilla resultante y los ejercicios
  excluidos por contraindicación

#### Scenario: La simulación no persiste nada

- **WHEN** se ejecuta una simulación
- **THEN** no se crea ningún paciente, rutina ni registro en el sistema
