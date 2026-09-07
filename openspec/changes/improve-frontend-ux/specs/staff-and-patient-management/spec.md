## Purpose

El panel de personas es la puerta de entrada del administrador y del profesional. Hoy es una
lista sin buscador que crece sin cota y que solo lleva al perfil.

## ADDED Requirements

### Requirement: Las personas se buscan, se filtran y se paginan

El listado de personas SHALL ofrecer búsqueda por nombre y filtros por rol, estado de alta y
vinculación con un profesional, con paginación.

#### Scenario: Localizar a una persona por nombre

- **WHEN** el administrador escribe parte de un nombre
- **THEN** ve solo las personas que coinciden

#### Scenario: Separar profesionales de pacientes

- **WHEN** el administrador filtra por rol
- **THEN** deja de ver mezcladas las dos listas

#### Scenario: Encontrar pacientes sin profesional asignado

- **WHEN** filtra por pacientes sin vinculación vigente
- **THEN** ve a quiénes falta asignar

#### Scenario: Sin filtro, se ven todas

- **WHEN** abre el panel sin elegir filtros
- **THEN** ve a todas las personas que su rol le permite ver, activas y de baja

### Requirement: Cada paciente tiene una ficha que reúne su seguimiento

Existe una vista de paciente que SHALL resumir su membresía, sus condiciones activas, su
último tamizaje, su asistencia del mes, su rutina activa y sus alertas sin leer.

#### Scenario: Abrir la ficha desde el panel

- **WHEN** el profesional abre un paciente desde el listado
- **THEN** ve su situación resumida sin visitar otras pantallas

#### Scenario: Un paciente recién dado de alta

- **WHEN** el paciente aún no tiene rutina ni tamizajes
- **THEN** el resumen explica qué falta, en lugar de mostrar huecos vacíos

### Requirement: Desde cualquier sección de un paciente se llega a las demás

Las vistas de un mismo paciente SHALL compartir una navegación que permita pasar de una a otra
sin volver a buscarlo.

#### Scenario: De la rutina a la evolución

- **WHEN** el profesional está viendo la rutina de un paciente y quiere ver su evolución
- **THEN** llega en un solo paso, sin regresar a ningún listado

#### Scenario: La sección actual se distingue

- **WHEN** está en una de las secciones del paciente
- **THEN** la navegación indica en cuál está
