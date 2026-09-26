## MODIFIED Requirements

### Requirement: Definición de plantillas

El equipo SHALL poder crear plantillas de rutina indicando tipo (`training` o `physio`),
objetivo, nivel, entorno y días por semana, con sus días y sus ejercicios ordenados.

#### Scenario: Plantilla completa

- **WHEN** un `admin` crea una plantilla de 3 días con ejercicios, series, repeticiones y
  descanso en cada día
- **THEN** la plantilla, mientras esté activa, aparece entre las que un profesional de su
  tipo puede elegir al asignar una rutina, y la pantalla no menciona reglas de asignación

#### Scenario: Plantilla sin días

- **WHEN** se intenta activar una plantilla que no tiene ningún día con ejercicios
- **THEN** el sistema lo impide indicando que la plantilla está incompleta

### Requirement: Desactivación de plantillas

El equipo SHALL poder desactivar una plantilla para que deje de ofrecerse al asignar
rutinas, sin afectar a las rutinas ya asignadas.

#### Scenario: Plantilla desactivada

- **WHEN** se desactiva una plantilla
- **THEN** deja de aparecer entre las plantillas que el profesional puede elegir, las
  rutinas ya asignadas siguen funcionando, y la confirmación lo dice sin mencionar reglas
