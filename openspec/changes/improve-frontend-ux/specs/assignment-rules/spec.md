## Purpose

Las reglas se evalúan en el orden en que aparecen. Este change las hace localizables sin
poner en riesgo ese orden.

## ADDED Requirements

### Requirement: Las reglas se buscan y se filtran sin alterar su orden

El listado de reglas SHALL ofrecer búsqueda por nombre y filtros por estado, plantilla de
destino y reglas con condiciones inválidas, conservando siempre la ordenación por prioridad
que usa el motor.

#### Scenario: Encontrar las reglas que el motor ignora

- **WHEN** filtra por reglas con condiciones inválidas
- **THEN** ve solo las que el motor no puede evaluar

#### Scenario: El orden no cambia

- **WHEN** aplica cualquier filtro
- **THEN** las reglas siguen mostrándose por prioridad, como las evalúa el motor

### Requirement: Reordenar solo se ofrece cuando el orden mostrado es el real

Los controles para mover una regla SHALL ocultarse cuando el listado está filtrado o
paginado, explicando por qué.

#### Scenario: Intentar reordenar con un filtro puesto

- **WHEN** hay un filtro activo
- **THEN** los controles de mover no se muestran y un aviso indica que hay que quitar los
  filtros para reordenar

### Requirement: Un fallo al reordenar se ve

Si mover una regla falla, el motivo SHALL mostrarse como texto visible junto a los controles.

#### Scenario: Mover la primera regla hacia arriba

- **WHEN** la acción de mover no puede completarse
- **THEN** el motivo aparece escrito junto a los botones, no solo al posar el puntero
