## Purpose

El listado de tamizajes no permite buscar ni distinguir a quién falta medir.

## ADDED Requirements

### Requirement: El listado de tamizajes se busca y se filtra

El listado SHALL ofrecer búsqueda por nombre y un filtro para los pacientes sin ningún
tamizaje registrado.

#### Scenario: Encontrar a quién falta medir

- **WHEN** el profesional filtra por pacientes sin tamizaje
- **THEN** ve a quiénes hay que tomar la primera medición

#### Scenario: Localizar a un paciente concreto

- **WHEN** escribe parte de un nombre
- **THEN** ve solo a quienes coinciden, con su último tamizaje
