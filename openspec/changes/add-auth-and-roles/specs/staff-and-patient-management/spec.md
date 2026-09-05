## Purpose

Permite al negocio administrar quién trabaja en la plataforma y a quién atiende cada
profesional, sin borrar nunca el historial de una persona.

## ADDED Requirements

### Requirement: Alta de personal

Un `admin` SHALL poder crear perfiles de profesional indicando nombre, correo, teléfono y
especialidad. Solo un `admin` SHALL poder hacerlo.

#### Scenario: Admin crea un profesional

- **WHEN** un `admin` crea un profesional con especialidad `physio`
- **THEN** el profesional queda registrado como activo y puede iniciar sesión con sus
  credenciales

#### Scenario: Profesional intenta crear otro profesional

- **WHEN** un `professional` intenta crear un perfil con rol `professional`
- **THEN** la operación es rechazada

### Requirement: Alta de pacientes

Un `admin` o un `professional` SHALL poder crear pacientes. Al crearlo un profesional, el
sistema SHALL crear automáticamente la asignación de cuidado correspondiente a su
especialidad.

#### Scenario: Profesional crea un paciente

- **WHEN** un profesional con especialidad `training` crea un paciente
- **THEN** se crea el paciente y una asignación vigente en `care_assignments` con
  `kind = 'training'` entre ambos

#### Scenario: El paciente aparece solo para quien corresponde

- **WHEN** otro profesional sin asignación sobre ese paciente consulta su lista
- **THEN** ese paciente no aparece

### Requirement: Baja lógica

El sistema SHALL desactivar a las personas en lugar de eliminarlas, conservando todo su
historial.

#### Scenario: Baja de un paciente

- **WHEN** un `admin` da de baja a un paciente
- **THEN** el paciente queda inactivo, no puede iniciar sesión, y sus sesiones, tamizajes
  y observaciones siguen consultables por el profesional a cargo y por el `admin`

#### Scenario: Baja de un profesional con pacientes

- **WHEN** un `admin` da de baja a un profesional que tiene pacientes asignados
- **THEN** el sistema advierte cuántos pacientes quedarán sin ese profesional y cierra sus
  asignaciones vigentes marcando `ended_at`

### Requirement: Doble asignación de profesionales

Un paciente SHALL poder tener a la vez un profesional de `training` y uno de `physio`, y
NO SHALL poder tener dos profesionales vigentes del mismo tipo.

#### Scenario: Entrenador y fisioterapeuta simultáneos

- **WHEN** un paciente con entrenador asignado recibe además un fisioterapeuta
- **THEN** ambas asignaciones quedan vigentes y cada profesional ve al paciente en su lista

#### Scenario: Dos profesionales del mismo tipo

- **WHEN** se intenta asignar un segundo profesional de `training` a un paciente que ya
  tiene uno vigente
- **THEN** la operación es rechazada; para cambiar de profesional hay que cerrar antes la
  asignación anterior
