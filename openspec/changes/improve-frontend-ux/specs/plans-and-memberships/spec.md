## Purpose

Las membresías se agrupan por estado, lo que funciona bien, pero no hay forma de buscar a un
paciente ni de acotar por plan.

## ADDED Requirements

### Requirement: Las membresías se buscan y se filtran conservando su agrupación

El listado SHALL ofrecer búsqueda por paciente y filtros por estado y por plan, y SHALL
conservar la agrupación por estado cuando no hay ningún filtro de estado aplicado.

#### Scenario: Buscar la membresía de un paciente

- **WHEN** el administrador escribe el nombre de un paciente
- **THEN** ve su membresía sin recorrer la lista completa

#### Scenario: Sin filtros

- **WHEN** abre el listado sin filtrar
- **THEN** sigue viendo las secciones de próximas a vencer, vencidas y el resto

#### Scenario: Filtrar por un estado

- **WHEN** filtra por membresías vencidas
- **THEN** ve solo esa sección

### Requirement: Los planes y servicios se buscan

El listado de planes y servicios SHALL ofrecer búsqueda por nombre y filtro por estado.

#### Scenario: Localizar un servicio

- **WHEN** el administrador escribe parte del nombre de un servicio
- **THEN** ve solo los que coinciden
