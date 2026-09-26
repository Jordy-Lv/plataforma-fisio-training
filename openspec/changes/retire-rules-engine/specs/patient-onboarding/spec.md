## MODIFIED Requirements

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
  mancuernas, y esa selección queda registrada para que su profesional la consulte al
  elegir su rutina

#### Scenario: Perfil ya completo

- **WHEN** un paciente que ya completó su perfil vuelve a entrar
- **THEN** accede directamente a su rutina, sin repetir el onboarding

### Requirement: Edición del perfil

El paciente SHALL poder actualizar su propio perfil y sus condiciones. El profesional a
cargo SHALL poder editarlos también; un profesional sin asignación NO SHALL poder hacerlo.

#### Scenario: Paciente actualiza su equipamiento

- **WHEN** el paciente añade mancuernas a su equipamiento
- **THEN** el cambio queda registrado y su profesional lo ve en la ficha del paciente la
  próxima vez que prepare o ajuste su rutina; ninguna rutina cambia sola

#### Scenario: Profesional no asignado intenta editar

- **WHEN** un profesional sin asignación vigente intenta editar el perfil de ese paciente
- **THEN** la operación es rechazada por la base de datos

### Requirement: Terminar el registro no asigna rutina

Terminar el registro SHALL guardar el perfil y las condiciones del paciente y marcar el
registro como completo, y NO SHALL crear ninguna rutina, borrador ni registro de asignación.

#### Scenario: Registro terminado

- **WHEN** un paciente termina su registro
- **THEN** su perfil queda completo, no tiene ninguna rutina y ve «Tu profesional está
  preparando tu rutina»

#### Scenario: El texto del perfil no promete una asignación automática

- **WHEN** el paciente consulta o edita su perfil
- **THEN** la pantalla no dice que su objetivo o sus condiciones decidan qué rutina recibe,
  sino que su profesional los usa para elegirla
