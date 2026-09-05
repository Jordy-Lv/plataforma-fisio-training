## Purpose

Mantiene el catálogo de ejercicios con el etiquetado que el motor de asignación necesita
para filtrar por equipamiento, entorno y contraindicaciones clínicas.

## ADDED Requirements

### Requirement: Catálogo con contenido visual

Cada ejercicio SHALL tener nombre, descripción de ejecución y una imagen o GIF accesible
desde la aplicación.

#### Scenario: Paciente consulta un ejercicio

- **WHEN** un paciente abre un ejercicio de su rutina desde el teléfono
- **THEN** ve la imagen o GIF del movimiento y la descripción de cómo ejecutarlo

#### Scenario: Ejercicio sin contenido visual

- **WHEN** se intenta guardar un ejercicio sin `media_url`
- **THEN** el sistema lo rechaza indicando que el contenido visual es obligatorio

### Requirement: Etiquetado para la asignación automática

Cada ejercicio SHALL declarar equipamiento necesario, entornos donde puede realizarse,
dificultad y las partes del cuerpo con las que está contraindicado, usando el vocabulario
cerrado compartido con las condiciones del paciente.

#### Scenario: Contraindicación registrada

- **WHEN** el equipo marca una sentadilla como contraindicada para `knee`
- **THEN** ese ejercicio queda excluido de las asignaciones automáticas a pacientes con
  una condición activa de rodilla

#### Scenario: Etiqueta fuera del vocabulario

- **WHEN** se intenta guardar una contraindicación que no pertenece al vocabulario definido
- **THEN** el sistema la rechaza indicando el valor inválido

### Requirement: Siembra desde fuente externa

El sistema SHALL poder poblar el catálogo desde free-exercise-db, alojando las imágenes en
su propio almacenamiento, y SHALL poder reejecutarse sin duplicar ejercicios.

#### Scenario: Primera siembra

- **WHEN** se ejecuta el script de siembra sobre un catálogo vacío
- **THEN** el catálogo queda poblado con los ejercicios importados, marcados con
  `is_custom = false`, y sus imágenes servidas desde el almacenamiento propio

#### Scenario: Siembra repetida

- **WHEN** se vuelve a ejecutar el script sobre un catálogo ya poblado
- **THEN** los ejercicios existentes se actualizan por su identificador de origen y no se
  crean duplicados

#### Scenario: Independencia de la fuente

- **WHEN** la fuente externa deja de estar disponible
- **THEN** el catálogo y las imágenes siguen funcionando, porque ya no dependen de ella

### Requirement: Ejercicios propios del negocio

El equipo SHALL poder crear y editar ejercicios propios, distinguibles de los importados.

#### Scenario: Ejercicio propio

- **WHEN** un `admin` o un `professional` crea un ejercicio con contenido propio
- **THEN** queda registrado con `is_custom = true` y puede usarse en plantillas igual que
  cualquier otro

#### Scenario: El paciente no modifica el catálogo

- **WHEN** un paciente intenta crear o modificar un ejercicio
- **THEN** la operación es rechazada
