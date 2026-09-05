## Purpose

Convierte lo que el paciente reporta en avisos que llegan a quien debe actuar, para que un
dolor que se repite se evalúe a tiempo en lugar de descubrirse un mes después.

## ADDED Requirements

### Requirement: Alerta por dolor persistente

El sistema SHALL generar una alerta cuando un paciente reporte dolor por encima del umbral
configurado, en el mismo ejercicio o la misma zona, en tres sesiones dentro de una ventana
de catorce días.

#### Scenario: Dolor repetido

- **WHEN** un paciente reporta dolor de nivel 8 en la rodilla al hacer el mismo ejercicio,
  en tres sesiones distintas de la misma quincena
- **THEN** se genera una alerta de dolor dirigida al profesional a cargo, con el ejercicio,
  las sesiones implicadas y los niveles reportados

#### Scenario: Dolor aislado

- **WHEN** un paciente reporta dolor alto una sola vez
- **THEN** queda registrado pero no se genera alerta

#### Scenario: Paciente con dos profesionales

- **WHEN** el paciente tiene entrenador y fisioterapeuta asignados y se genera una alerta de
  dolor
- **THEN** ambos la reciben, y el administrador también

### Requirement: Alerta por ejercicios saltados

El sistema SHALL generar una alerta cuando el mismo ejercicio se marque como no realizado
el número de veces consecutivas configurado.

#### Scenario: Ejercicio saltado repetidamente

- **WHEN** el paciente salta el mismo ejercicio en tres sesiones seguidas
- **THEN** se genera una alerta para el profesional a cargo con las observaciones que el
  paciente escribió en cada ocasión

### Requirement: Umbrales configurables

Los umbrales que disparan las alertas SHALL ser configurables sin desplegar código.

#### Scenario: Cambio de umbral

- **WHEN** un `admin` cambia a dos el número de sesiones con dolor que dispara la alerta
- **THEN** las evaluaciones siguientes usan el nuevo umbral

### Requirement: Bandeja de alertas

Cada profesional SHALL ver únicamente las alertas dirigidas a él; el administrador SHALL
ver todas; el paciente NO SHALL ver ninguna.

#### Scenario: Alerta en la bandeja del profesional

- **WHEN** un profesional abre su panel y tiene alertas sin leer
- **THEN** las ve con su nivel de severidad y el contexto que explica por qué se generaron

#### Scenario: Profesional sin relación con el paciente

- **WHEN** un profesional sin asignación vigente sobre ese paciente consulta sus alertas
- **THEN** esa alerta no aparece

#### Scenario: El paciente no ve alertas

- **WHEN** un paciente consulta las alertas por API
- **THEN** la respuesta es vacía

#### Scenario: Marcar como leída

- **WHEN** el profesional marca una alerta como leída
- **THEN** deja de contarse como pendiente para él, sin afectar a los demás destinatarios
