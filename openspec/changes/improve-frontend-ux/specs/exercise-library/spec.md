## Purpose

El catálogo es el listado más usado del personal y el único que hoy se puede filtrar. Este
change convierte su patrón en la forma de consultar cualquier listado de la aplicación.

## ADDED Requirements

### Requirement: El estado de un listado vive en la dirección

Todo listado con búsqueda, filtros o paginación SHALL guardar ese estado en la dirección de la
página, de modo que se pueda compartir, marcar y recorrer con el botón de retroceso.

#### Scenario: Compartir un listado filtrado

- **WHEN** alguien del personal filtra el catálogo por grupo muscular y copia la dirección
- **THEN** quien la abre ve exactamente el mismo listado filtrado

#### Scenario: Volver atrás tras filtrar

- **WHEN** cambia un filtro y pulsa el botón de retroceso del navegador
- **THEN** vuelve al listado anterior con sus filtros previos

#### Scenario: Una dirección con un filtro que ya no existe

- **WHEN** abre un enlace antiguo cuyo filtro fue retirado del vocabulario
- **THEN** el listado se muestra ignorando ese filtro, sin error

### Requirement: Los filtros responden sin exigir un envío explícito

Un listado SHALL aplicar el filtro al cambiar un desplegable y tras una breve pausa al
escribir, y SHALL seguir siendo utilizable sin JavaScript.

#### Scenario: Elegir un filtro

- **WHEN** elige un valor en un desplegable de filtro
- **THEN** el listado se actualiza sin pulsar ningún botón

#### Scenario: Escribir en la búsqueda

- **WHEN** escribe en el campo de búsqueda
- **THEN** el listado se actualiza al dejar de escribir, sin que el cursor salga del campo

#### Scenario: Sin JavaScript

- **WHEN** el navegador no ejecuta JavaScript
- **THEN** el formulario de filtros conserva su botón de aplicar y el listado responde igual

### Requirement: Los filtros activos son visibles y se retiran de uno en uno

Un listado filtrado SHALL mostrar qué filtros están aplicados y permitir quitar cada uno por
separado, además de quitarlos todos.

#### Scenario: Retirar un filtro concreto

- **WHEN** hay tres filtros aplicados y retira uno
- **THEN** el listado conserva los otros dos y vuelve a la primera página
