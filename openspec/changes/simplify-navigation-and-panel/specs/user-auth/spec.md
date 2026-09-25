## Purpose

Que cada rol encuentre lo que puede hacer sin recorrer un menú pensado para otro, y que su
panel responda a la pregunta que ese rol se hace al entrar.

## ADDED Requirements

### Requirement: El menú de cada rol solo ofrece lo que ese rol puede abrir

El menú SHALL ser plano, de ocho entradas por rol del equipo, y SHALL listar solo rutas
que ese rol puede abrir sin ser redirigido. Las secciones con varias pantallas SHALL
mostrarse como una sola entrada, con sus pantallas hermanas como pestañas dentro.

#### Scenario: El administrador ve ocho entradas

- **WHEN** un `admin` abre cualquier pantalla del equipo
- **THEN** el menú muestra ocho entradas: Panel, Personas, Catálogo, Rutinas, Sesiones,
  Alertas, Seguimiento y Negocio

#### Scenario: El profesional no ve lo que no puede abrir

- **WHEN** un `professional` abre cualquier pantalla del equipo
- **THEN** el menú muestra ocho entradas y no ofrece «Planes» ni «Asignación»

#### Scenario: Las pantallas hermanas son pestañas

- **WHEN** alguien del equipo abre `/templates`
- **THEN** el menú marca «Catálogo» como activa y la pantalla muestra las pestañas de esa
  sección

### Requirement: El panel del administrador y el del profesional responden a preguntas distintas

`/admin` SHALL mostrar el estado del negocio y `/pro` SHALL mostrar el trabajo del día del
profesional, en tres cifras: alertas sin leer, sesiones de hoy y tamizajes pendientes. Las
cifras de `/pro` SHALL contar solo sobre los pacientes que ese profesional acompaña. El
porcentaje de cumplimiento del panel del administrador SHALL calcularse sobre todos los
registros del periodo, sin que un tope en el número de filas lo altere.

#### Scenario: El profesional ve su día

- **WHEN** un `professional` que acompaña a pacientes abre `/pro`
- **THEN** ve «Mis alertas», «Sesiones de hoy» y «Tamizajes pendientes», cada una con un
  enlace a la pantalla donde se resuelve, y ninguna cifra del negocio

#### Scenario: El profesional sin pacientes

- **WHEN** un `professional` sin acompañamientos vigentes abre `/pro`
- **THEN** ve «Todavía no acompañas a nadie» y un enlace a sus pacientes, en lugar de
  cifras a cero

#### Scenario: Cumplimiento con más registros que el tope de filas

- **WHEN** el mes tiene más sesiones registradas que el máximo de filas que devuelve una
  consulta
- **THEN** el cumplimiento del panel del administrador cuenta todas, no un subconjunto
