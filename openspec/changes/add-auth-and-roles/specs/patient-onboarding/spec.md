## Purpose

Captura el perfil con el que el paciente entra al sistema —objetivo, entorno, equipamiento
y limitaciones— porque es la entrada exacta que necesita el motor de asignación de rutinas.

## ADDED Requirements

### Requirement: Registro del perfil de entrenamiento

Al entrar por primera vez, el paciente SHALL completar objetivo, nivel, entorno de
entrenamiento y equipamiento disponible antes de acceder al resto de la aplicación.

#### Scenario: Onboarding completo

- **WHEN** un paciente nuevo inicia sesión por primera vez
- **THEN** el sistema le presenta el formulario de perfil y no le permite avanzar hasta
  completarlo

#### Scenario: Entorno y equipamiento

- **WHEN** el paciente indica entorno `home`
- **THEN** puede seleccionar equipamiento entre las opciones sin equipo, bandas o
  mancuernas, y esa selección queda registrada para el motor de reglas

#### Scenario: Perfil ya completo

- **WHEN** un paciente que ya completó su perfil vuelve a entrar
- **THEN** accede directamente a su rutina, sin repetir el onboarding

### Requirement: Registro de condiciones y limitaciones

El paciente SHALL poder registrar condiciones o limitaciones indicando parte del cuerpo,
severidad y notas. Las partes del cuerpo SHALL pertenecer a un vocabulario cerrado
compartido con el catálogo de ejercicios.

#### Scenario: Condición registrada

- **WHEN** el paciente registra dolor de rodilla con severidad `moderate`
- **THEN** queda una condición activa con `body_part = 'knee'` asociada a su perfil

#### Scenario: Parte del cuerpo fuera del vocabulario

- **WHEN** se envía una parte del cuerpo que no pertenece al vocabulario definido
- **THEN** la operación es rechazada con un mensaje en español que indica el valor inválido

#### Scenario: Condición superada

- **WHEN** un profesional marca una condición como no activa
- **THEN** deja de excluir ejercicios en asignaciones posteriores, y se conserva en el
  historial del paciente

### Requirement: Edición del perfil

El paciente SHALL poder actualizar su propio perfil y sus condiciones. El profesional a
cargo SHALL poder editarlos también; un profesional sin asignación NO SHALL poder hacerlo.

#### Scenario: Paciente actualiza su equipamiento

- **WHEN** el paciente añade mancuernas a su equipamiento
- **THEN** el cambio queda registrado y se aplica en la siguiente asignación automática

#### Scenario: Profesional no asignado intenta editar

- **WHEN** un profesional sin asignación vigente intenta editar el perfil de ese paciente
- **THEN** la operación es rechazada por la base de datos
