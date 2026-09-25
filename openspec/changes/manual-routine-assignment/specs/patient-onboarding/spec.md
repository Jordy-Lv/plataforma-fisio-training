## Purpose

El registro del paciente recoge su perfil y sus condiciones para que su profesional elija la
rutina; terminarlo no asigna ninguna rutina por sí solo (ADR-0009).

## ADDED Requirements

### Requirement: Terminar el registro no asigna rutina

Terminar el registro SHALL guardar el perfil y las condiciones del paciente y marcar el
registro como completo, y NO SHALL crear ninguna rutina, borrador ni registro de asignación.

#### Scenario: Registro terminado

- **WHEN** un paciente termina su registro
- **THEN** su perfil queda completo, no tiene ninguna rutina y ve «Tu profesional está
  preparando tu rutina»

#### Scenario: Un perfil que antes coincidía con una regla

- **WHEN** un paciente cuyo perfil coincide con una regla activa de `assignment_rules`
  termina su registro
- **THEN** tampoco recibe rutina; las reglas no intervienen

#### Scenario: El texto del perfil no promete una asignación automática

- **WHEN** el paciente consulta o edita su perfil
- **THEN** la pantalla no dice que su objetivo o sus condiciones decidan qué rutina recibe,
  sino que su profesional los usa para elegirla
