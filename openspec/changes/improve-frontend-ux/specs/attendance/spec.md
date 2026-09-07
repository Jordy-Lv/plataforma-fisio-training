## Purpose

El resumen de asistencia solo muestra el mes en curso, fijado en la consulta, y no permite
buscar a nadie.

## ADDED Requirements

### Requirement: El mes del resumen se elige

El resumen de asistencia SHALL permitir consultar meses anteriores, mostrando el mes en curso
por omisión.

#### Scenario: Revisar el mes pasado

- **WHEN** el profesional retrocede un mes
- **THEN** ve las asistencias de ese mes con el mismo detalle

#### Scenario: Abrir el resumen sin elegir nada

- **WHEN** abre la pantalla
- **THEN** ve el mes en curso

### Requirement: El resumen se busca y se filtra

El resumen SHALL ofrecer búsqueda por nombre y un filtro para los pacientes sin asistencias en
el periodo consultado.

#### Scenario: Encontrar a quien ha dejado de venir

- **WHEN** filtra por pacientes sin asistencias este mes
- **THEN** ve a quiénes conviene contactar
