## Purpose

Las plantillas son la pieza que más trabajo cuesta construir. Este change las hace
localizables y reduce el número de recargas necesarias para armarlas.

## ADDED Requirements

### Requirement: Las plantillas se buscan y se filtran

El listado de plantillas SHALL ofrecer búsqueda por nombre y filtros por tipo, objetivo,
nivel, entorno y estado, además de paginación.

#### Scenario: Localizar una plantilla por nombre

- **WHEN** el personal escribe parte del nombre de una plantilla
- **THEN** el listado muestra solo las que coinciden, indicando cuántas encontró

#### Scenario: Encontrar las plantillas a medio construir

- **WHEN** filtra por plantillas incompletas
- **THEN** ve las que tienen menos días de los declarados por semana

#### Scenario: Sin filtro, se ven todas

- **WHEN** abre el listado sin elegir ningún filtro
- **THEN** ve todas las plantillas, activas y en borrador

### Requirement: Añadir un ejercicio a un día no obliga a recargar la página tres veces

Al editar una plantilla, el buscador del catálogo SHALL estar disponible de forma permanente y
permitir elegir el día de destino en el mismo paso.

#### Scenario: Añadir dos ejercicios a días distintos

- **WHEN** busca un ejercicio, lo añade al día 1, y añade otro al día 2
- **THEN** lo consigue sin abrir y cerrar el buscador entre uno y otro

### Requirement: Las acciones que destruyen trabajo piden confirmación

Eliminar una plantilla, eliminar un día o quitar un ejercicio de un día SHALL pedir
confirmación antes de ejecutarse.

#### Scenario: Eliminar un día por error

- **WHEN** pulsa eliminar un día con cuatro ejercicios
- **THEN** el sistema pide confirmación explicando que se pierden también sus ejercicios

#### Scenario: Cancelar la confirmación

- **WHEN** pide eliminar y luego cancela
- **THEN** no se elimina nada
