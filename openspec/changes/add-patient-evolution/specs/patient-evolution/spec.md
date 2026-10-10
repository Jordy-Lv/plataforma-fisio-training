## Purpose

Que el paciente vea cómo avanza —constancia, dolor, medidas y cargas— sin depender de que su
equipo se lo cuente.

## ADDED Requirements

### Requirement: Mi evolución dentro de Mi rutina

La entrada «Mi rutina» del paciente SHALL tener dos pestañas, «Mi rutina» (`/routine`) y «Mi
evolución» (`/routine/evolution`). «Mi evolución» SHALL mostrar solo datos del propio paciente
y MUST NOT contener formularios.

#### Scenario: Abrir mi evolución

- **WHEN** un paciente pulsa la pestaña «Mi evolución»
- **THEN** llega a `/routine/evolution` y ve sus cifras y gráficas

### Requirement: Constancia, dolor y esfuerzo

«Mi evolución» SHALL mostrar las sesiones terminadas por semana en las últimas 12 semanas, el
porcentaje de sesiones programadas que terminó en las últimas 4 y su dolor medio de los últimos
30 días comparado con los 30 anteriores. SHALL dibujar la media de dolor y de esfuerzo de cada
una de sus últimas 12 sesiones con registros.

#### Scenario: Sin registros de dolor

- **WHEN** el paciente no ha registrado dolor ni esfuerzo
- **THEN** ve qué tiene que hacer para que aparezca la gráfica, no una gráfica vacía

### Requirement: Medidas, cargas y marcas

«Mi evolución» SHALL mostrar la evolución de sus tamizajes y de la carga por ejercicio, con el
mismo selector de métrica que ve el equipo, y una lista de sus mejores marcas por ejercicio.

#### Scenario: Un solo tamizaje

- **WHEN** el paciente tiene un único tamizaje
- **THEN** ve ese valor y que la línea aparecerá con el siguiente

### Requirement: Legible en el teléfono

A 375 px de ancho, «Mi evolución» SHALL ocupar una sola columna sin desplazamiento horizontal.

#### Scenario: Teléfono

- **WHEN** el paciente abre `/routine/evolution` a 375 px
- **THEN** el ancho del documento es 375 px
