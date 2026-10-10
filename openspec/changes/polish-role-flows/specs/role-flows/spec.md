# Spec Delta

## Purpose

Cada perfil ve lo que necesita para seguir sin atascarse, y lo principal de cada pantalla
cabe en la primera vista del teléfono.

## ADDED Requirements

### Requirement: El profesional sabe si la rutina activa está programada

En el paso «Rutina activa» de `/pro/routines/[patientId]`, la pantalla SHALL indicar la
próxima sesión programada desde hoy o, si no hay ninguna, MUST avisar de que el paciente no
puede entrenar y ofrecer el acceso al calendario.

#### Scenario: Rutina sin programar

- **WHEN** el entrenador abre la rutina activa de un paciente sin días programados
- **THEN** ve «Falta programar sus días» y el botón «Programar en el calendario»

#### Scenario: Rutina programada

- **WHEN** el paciente tiene una sesión programada para hoy
- **THEN** ve «Próxima sesión: hoy · <día>»

### Requirement: La acción principal cabe en la primera pantalla del teléfono

A 375 px, el botón para empezar la sesión del día en `/routine` SHALL verse sin desplazarse,
y la banda fija de la sesión en curso MUST mostrar el aviso de pendientes en una sola frase.

#### Scenario: Día con cuatro ejercicios

- **WHEN** el paciente abre `/routine` con un día de cuatro ejercicios programado hoy
- **THEN** «Empezar sesión» aparece antes de la lista de ejercicios

### Requirement: Los listados filtran sin ocupar la pantalla

`/exercises` SHALL usar la barra compacta de filtros de los demás listados, con los filtros
activos como píldoras que se quitan una a una.

#### Scenario: Catálogo en el teléfono

- **WHEN** el profesional abre `/exercises` a 375 px
- **THEN** ve el buscador, los cuatro desplegables en dos filas y el recuento de resultados
  sin desplazarse
