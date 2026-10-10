# Spec Delta

## Purpose

Las membresías se controlan desde una pantalla que abre directamente en lo que vence, sin
que los controles de la revisión automática ocupen la primera pantalla del teléfono.

## ADDED Requirements

### Requirement: La revisión de vencimientos ocupa una barra compacta

En `/memberships`, el administrador SHALL ver la revisión de vencimientos como una barra
breve con el plazo de aviso vigente y el botón para lanzarla a mano. El ajuste del plazo y
la explicación del proceso automático SHALL quedar plegados y cerrados por defecto.

#### Scenario: Abrir membresías desde el panel

- **WHEN** el administrador abre `/memberships` en un teléfono de 375 px
- **THEN** ve el plazo vigente, el botón «Revisar vencimientos ahora» y la barra de filtros
  sin que el párrafo explicativo ni el campo del plazo estén desplegados

#### Scenario: Cambiar el plazo

- **WHEN** el administrador abre «Cambiar plazo», escribe siete días y guarda
- **THEN** el plazo se guarda como hasta ahora y la barra muestra el nuevo valor

#### Scenario: Lanzar la revisión a mano

- **WHEN** el administrador pulsa «Revisar vencimientos ahora»
- **THEN** la revisión se ejecuta y el resumen o el error aparece junto a la barra, como
  hasta ahora

### Requirement: La compactación no altera lo que leen las suites

La pantalla SHALL conservar las secciones «Próximas a vencer» y «Vencidas», el plazo
restante de cada tarjeta, el recuento de membresías encontradas y el orden de sus
formularios.

#### Scenario: Suite de membresías

- **WHEN** `test:memberships` pide `/memberships` como administrador
- **THEN** encuentra «Próximas a vencer», «Vencidas» y «vence en 3 días»

#### Scenario: Vista del profesional

- **WHEN** un profesional abre `/memberships`
- **THEN** no ve la barra de revisión de vencimientos y sí la barra de filtros compacta
