## MODIFIED Requirements

### Requirement: El menú de cada rol solo ofrece lo que ese rol puede abrir

El menú SHALL ser plano, de ocho entradas por rol del equipo, y SHALL listar solo rutas
que ese rol puede abrir sin ser redirigido. Las secciones con varias pantallas SHALL
mostrarse como una sola entrada, con sus pantallas hermanas como pestañas dentro. Ningún rol
SHALL ver una entrada, una pestaña ni un acceso rápido al antiguo panel de reglas de
asignación.

#### Scenario: El administrador ve ocho entradas

- **WHEN** un `admin` abre cualquier pantalla del equipo
- **THEN** el menú muestra ocho entradas: Panel, Personas, Catálogo, Rutinas, Sesiones,
  Alertas, Seguimiento y Negocio

#### Scenario: El profesional no ve lo que no puede abrir

- **WHEN** un `professional` abre cualquier pantalla del equipo
- **THEN** el menú muestra ocho entradas y no ofrece «Planes»

#### Scenario: Las pantallas hermanas son pestañas

- **WHEN** alguien del equipo abre `/templates`
- **THEN** el menú marca «Catálogo» como activa y la pantalla muestra las pestañas de esa
  sección

#### Scenario: El catálogo ya no tiene «Asignación»

- **WHEN** el administrador abre «Catálogo» o su panel
- **THEN** las pestañas del catálogo son «Ejercicios» y «Plantillas», y ni el menú ni los
  accesos rápidos del panel ofrecen «Asignación»
