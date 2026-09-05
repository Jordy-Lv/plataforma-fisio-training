## Purpose

Sustituye la hoja de cálculo con la que se llevaba el seguimiento físico, registrando cada
tamizaje y mostrando la evolución del paciente sin trabajo manual de graficado.

## ADDED Requirements

### Requirement: Registro de tamizaje

Un `admin` o el profesional con asignación vigente SHALL poder registrar un tamizaje con
fecha, peso, talla y medidas corporales. El paciente SHALL poder consultarlos pero NO SHALL
poder registrarlos ni modificarlos.

#### Scenario: Tamizaje registrado

- **WHEN** el profesional registra peso y talla de su paciente
- **THEN** queda guardado con su fecha, el IMC calculado y el autor del registro

#### Scenario: El paciente no registra su tamizaje

- **WHEN** un paciente intenta crear o modificar un tamizaje
- **THEN** la operación es rechazada

#### Scenario: Profesional no asignado

- **WHEN** un profesional sin asignación vigente intenta registrar un tamizaje de ese
  paciente
- **THEN** la operación es rechazada

### Requirement: Gráfica de evolución

El sistema SHALL mostrar la evolución de las métricas del paciente a lo largo del tiempo a
partir del segundo tamizaje registrado.

#### Scenario: Dos o más tamizajes

- **WHEN** un paciente tiene dos tamizajes con fechas distintas
- **THEN** se muestra una gráfica con la evolución de peso y medidas, indicando si aumentó,
  se mantuvo o disminuyó

#### Scenario: Un solo tamizaje

- **WHEN** un paciente tiene un único tamizaje
- **THEN** se muestran sus valores y un mensaje explicando que hace falta un segundo
  tamizaje para ver la evolución, sin una gráfica vacía ni un error

#### Scenario: Sin tamizajes

- **WHEN** un paciente no tiene ningún tamizaje
- **THEN** la vista lo indica y explica que su profesional los registrará en las
  evaluaciones periódicas

#### Scenario: Gráfica en teléfono

- **WHEN** el paciente consulta su evolución desde el teléfono
- **THEN** la gráfica se ve completa sin desbordar horizontalmente la pantalla

### Requirement: Progresión de carga

El sistema SHALL mostrar la evolución del peso levantado por ejercicio a partir de lo
registrado en las sesiones.

#### Scenario: Carga progresiva visible

- **WHEN** un paciente ha registrado peso en el mismo ejercicio en varias sesiones
- **THEN** puede ver la evolución de ese peso a lo largo del tiempo

#### Scenario: Sin datos suficientes

- **WHEN** solo hay un registro de ese ejercicio
- **THEN** se muestra el valor y se indica que hacen falta más sesiones para ver la
  progresión
