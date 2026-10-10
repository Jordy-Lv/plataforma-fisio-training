# Spec Delta

## Purpose

La barra de filtros de un listado permite buscar y acotar sin desplazar los resultados fuera
de la primera pantalla del teléfono, con el mismo aspecto en todas las listas que la usan.

## ADDED Requirements

### Requirement: La barra de filtros es compacta en el teléfono

La barra de filtros de un listado SHALL mostrar el buscador en una sola fila y SHALL
colocar los desplegables uno junto a otro, en tantas filas como hagan falta según el ancho,
en lugar de apilar cada uno bajo su rótulo. A 375 px de ancho, una barra con buscador y
hasta tres desplegables MUST ocupar como máximo tres filas de controles.

#### Scenario: Membresías con buscador y tres desplegables

- **WHEN** el administrador abre `/memberships` a 375 px sin filtros aplicados
- **THEN** el buscador ocupa una fila y los desplegables de estado, plan y orden se reparten
  en las filas siguientes, sin un rótulo apilado encima de cada uno

#### Scenario: La misma barra en otra lista

- **WHEN** cualquier usuario abre otra pantalla con barra de filtros, como `/plans` o
  `/pro/alerts`
- **THEN** ve la misma disposición compacta

### Requirement: Cada filtro conserva su nombre y su objetivo táctil

Cada desplegable SHALL mostrar su nombre visible junto al valor elegido (por ejemplo,
«Estado» y «Todos») y SHALL quedar asociado a él como rótulo accesible. Cada control de la
barra MUST medir al menos 44 px de alto.

#### Scenario: Leer el filtro sin abrirlo

- **WHEN** el usuario mira un desplegable con un valor elegido
- **THEN** sabe a qué filtro pertenece sin abrirlo

#### Scenario: Lector de pantalla

- **WHEN** un lector de pantalla enfoca un desplegable de la barra
- **THEN** anuncia el nombre del filtro

#### Scenario: Tocar entre series

- **WHEN** el usuario toca un control de la barra en el teléfono
- **THEN** el control mide al menos 44 px de alto

### Requirement: La barra compacta no cambia cómo se filtra

La barra SHALL seguir siendo un formulario GET que funciona sin JavaScript, SHALL conservar
los nombres de los parámetros de la URL, la opción «Todos» de cada filtro no obligatorio,
el autoenvío al cambiar un desplegable y las píldoras que quitan cada filtro activo.

#### Scenario: Sin JavaScript

- **WHEN** el usuario cambia un desplegable con JavaScript desactivado y pulsa «Aplicar
  filtros»
- **THEN** la lista se filtra y la URL lleva el mismo parámetro que antes del cambio

#### Scenario: Quitar un filtro

- **WHEN** hay un filtro activo
- **THEN** su píldora sigue apareciendo fuera del formulario y al tocarla se quita
