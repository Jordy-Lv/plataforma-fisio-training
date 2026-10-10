# Spec Delta

## Purpose

La vitrina de planes y servicios se puede comparar en el teléfono sin recorrer varias
pantallas por cada plan, conservando todo lo que la oferta publica.

## ADDED Requirements

### Requirement: Los planes de la vitrina se comparan sin desplazarse varias pantallas

En `/offer`, a 375 px de ancho, los planes de suscripción activos SHALL mostrarse en una
fila con desplazamiento horizontal en la que se asoma el plan siguiente; desde el punto de
corte `sm` SHALL mostrarse en rejilla. Cada plan MUST seguir mostrando su nombre, su precio
con el periodo de cobro, su descripción y todas sus características.

#### Scenario: Paciente abre la vitrina en el teléfono

- **WHEN** un paciente abre `/offer` a 375 px con tres planes activos
- **THEN** ve el primer plan completo y el borde del siguiente en la misma altura, y puede
  deslizar horizontalmente para ver los demás

#### Scenario: Escritorio

- **WHEN** abre `/offer` en una pantalla ancha
- **THEN** los planes aparecen en rejilla, sin desplazamiento horizontal

#### Scenario: Teclado y lector de pantalla

- **WHEN** un usuario recorre la fila de planes con el teclado o con un lector de pantalla
- **THEN** puede enfocar la fila, desplazarla con las flechas y cada plan se anuncia como un
  elemento de la lista «Planes de suscripción»

### Requirement: Los servicios se leen como una lista por categoría

Los servicios adicionales SHALL agruparse en un único bloque por categoría, con cada
servicio como una fila que muestra nombre y precio en la misma línea y la descripción
debajo, si existe.

#### Scenario: Categoría con varios servicios

- **WHEN** la categoría «Fisioterapia» tiene tres servicios activos
- **THEN** aparecen como tres filas dentro de un mismo bloque titulado «Fisioterapia»

### Requirement: La vitrina compacta conserva lo que leen las suites

La vitrina SHALL seguir mostrando solo lo activo, SHALL mostrar los importes con separador
de miles y SHALL conservar los encabezados «Planes de suscripción» y «Servicios
adicionales», los estados vacíos y la barra de filtros tal como la emite el componente
compartido.

#### Scenario: Suite de planes

- **WHEN** `test:plans` pide `/offer` como paciente
- **THEN** encuentra los planes y servicios activos con su precio («90.000», «47.000») y no
  encuentra los inactivos
