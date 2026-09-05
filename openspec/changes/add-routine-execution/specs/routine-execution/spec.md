## Purpose

Es la pantalla que el paciente usa mientras entrena: marca lo que completa, registra lo que
realmente hizo y reporta dolor u observaciones cuando algo no salió como debía.

## ADDED Requirements

### Requirement: Rutina del día en modo checklist

El paciente SHALL ver su rutina como una lista de ejercicios marcables, con la imagen o GIF
y la descripción de cada uno accesibles sin salir de la lista.

#### Scenario: Abrir la rutina del día

- **WHEN** el paciente abre la aplicación desde el teléfono
- **THEN** ve los ejercicios del día con sus series y repeticiones prescritas, y cuáles ya
  marcó

#### Scenario: Consultar cómo se ejecuta un ejercicio

- **WHEN** el paciente abre un ejercicio de la lista
- **THEN** ve su imagen o GIF y la descripción de ejecución, y puede volver a la lista sin
  perder lo ya marcado

#### Scenario: Sin rutina asignada

- **WHEN** el paciente no tiene ninguna rutina activa
- **THEN** la vista explica que su profesional está preparando su rutina, en lugar de
  mostrar una lista vacía

### Requirement: Registro de lo ejecutado

Por cada ejercicio, el paciente SHALL poder indicar si lo hizo, lo saltó o lo hizo
modificado, y registrar series, repeticiones y peso reales.

#### Scenario: Ejercicio completado

- **WHEN** el paciente marca un ejercicio como hecho e indica 3 series de 12 con 8 kg
- **THEN** queda registrado con esos valores reales, distinguibles de los prescritos

#### Scenario: Ejercicio saltado

- **WHEN** el paciente marca un ejercicio como no realizado
- **THEN** el sistema le pide un motivo antes de continuar y lo registra

#### Scenario: Ejercicio sustituido

- **WHEN** el ejercicio se sustituyó por otro durante un entrenamiento presencial
- **THEN** queda registrado como modificado, indicando por cuál se sustituyó

### Requirement: Reporte de dolor y esfuerzo

El paciente SHALL poder registrar, por ejercicio, un nivel de dolor de 0 a 10, la parte del
cuerpo afectada y una observación libre, además del esfuerzo percibido.

#### Scenario: Dolor reportado

- **WHEN** el paciente salta un ejercicio indicando dolor de rodilla de nivel 8 y la
  observación "me generó dolor al bajar"
- **THEN** quedan registrados el nivel, la ubicación y el texto completo, asociados a ese
  ejercicio y a esa sesión

#### Scenario: Nivel de dolor fuera de rango

- **WHEN** se intenta registrar un nivel de dolor fuera del rango 0–10
- **THEN** la base de datos rechaza la operación

#### Scenario: Ubicación fuera del vocabulario

- **WHEN** se envía una ubicación de dolor que no pertenece al vocabulario compartido
- **THEN** la operación es rechazada indicando el valor inválido

### Requirement: Sesión reanudable

Una sesión iniciada SHALL conservar lo ya marcado si el paciente cierra la aplicación, y
SHALL poder reanudarse el mismo día.

#### Scenario: Reanudar una sesión

- **WHEN** el paciente marca tres ejercicios, cierra la aplicación y vuelve a abrirla
- **THEN** los tres siguen marcados y puede continuar desde donde iba

#### Scenario: Cerrar la sesión

- **WHEN** el paciente termina y cierra la sesión
- **THEN** la sesión queda completada con su fecha, y el profesional a cargo puede
  consultarla

### Requirement: Uso en teléfono

Las vistas de ejecución SHALL ser usables en una pantalla de 375 px de ancho, con objetivos
táctiles de al menos 44 px y sin desbordamiento horizontal.

#### Scenario: Uso con una mano

- **WHEN** el paciente usa la aplicación en un teléfono, entre series
- **THEN** puede marcar ejercicios y registrar valores con el pulgar, sin ampliar la página
