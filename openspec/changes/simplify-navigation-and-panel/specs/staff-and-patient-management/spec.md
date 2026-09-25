## Purpose

Que el administrador pueda cambiar quién acompaña a un paciente sin perder el historial, y
que el equipo vea quién acompaña a cada paciente sin exponer más de lo que ya puede leer.

## ADDED Requirements

### Requirement: El acompañamiento se cierra sin borrarse

El administrador SHALL poder cerrar un acompañamiento vigente. Cerrarlo SHALL registrar la
fecha de cierre sin borrar la fila, y desde ese momento el profesional NO SHALL tener
acceso a ese paciente. Ningún otro rol SHALL poder cerrar un acompañamiento.

#### Scenario: Cerrar y reasignar

- **WHEN** el administrador cierra el acompañamiento de entrenamiento de un paciente y
  asigna otro entrenador
- **THEN** la respuesta dice «Acompañamiento cerrado. Ese profesional deja de ver al
  paciente, y el historial se conserva.», el nuevo entrenador ve al paciente y el anterior
  deja de verlo

#### Scenario: Asignar sin cerrar el anterior

- **WHEN** el administrador asigna un segundo profesional del mismo tipo sin cerrar el
  vigente
- **THEN** la asignación se rechaza con un mensaje que indica cerrar primero el
  acompañamiento en «Acompañamientos vigentes»

#### Scenario: Cerrar dos veces

- **WHEN** alguien intenta cerrar un acompañamiento ya cerrado, o sin ser administrador
- **THEN** la fecha del primer cierre no cambia y la respuesta dice que ya estaba cerrado
  o que no tiene permiso

### Requirement: Quién acompaña a cada paciente es visible

El listado de personas y la ficha del paciente SHALL mostrar quién lo acompaña, por
especialidad. El administrador SHALL ver el equipo completo con nombres; el profesional
SHALL ver solo los acompañamientos que puede leer, y NO SHALL ver el nombre de un
profesional cuyo perfil no puede leer.

#### Scenario: El administrador ve el equipo completo

- **WHEN** el administrador abre `/people` y el paciente tiene entrenador y fisioterapeuta
- **THEN** la tarjeta del paciente muestra las dos especialidades con el nombre de cada
  profesional

#### Scenario: Paciente sin profesional

- **WHEN** un paciente no tiene ningún acompañamiento vigente
- **THEN** su tarjeta dice «Sin profesional asignado»

### Requirement: El listado de personas declara a quién deja fuera

Si el listado de personas no puede cargar a todas, la pantalla SHALL decir cuántas cargó y
cuántas quedan sin mostrar, en lugar de truncar la lista en silencio.

#### Scenario: Más personas que el tope

- **WHEN** hay más personas que las que el listado puede cargar
- **THEN** la pantalla avisa de cuántas se cargaron y cuántas quedan sin mostrar
