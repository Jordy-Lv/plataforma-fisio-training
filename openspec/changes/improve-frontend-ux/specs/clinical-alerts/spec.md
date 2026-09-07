## Purpose

La bandeja muestra hoy las doscientas últimas alertas en una sola página, sin distinguir las
que faltan por atender.

## ADDED Requirements

### Requirement: La bandeja se filtra y se pagina

La bandeja de alertas SHALL ofrecer filtros por estado de lectura, tipo, severidad y paciente,
con paginación, y SHALL mostrar por omisión todas las alertas ordenadas de la más reciente a
la más antigua.

#### Scenario: Ver solo lo que falta por atender

- **WHEN** el profesional filtra por alertas sin leer
- **THEN** ve únicamente las suyas pendientes

#### Scenario: Una alerta recién generada

- **WHEN** se genera una alerta para el profesional
- **THEN** la ve en la primera página al abrir la bandeja, sin aplicar ningún filtro

### Requirement: El conteo de alertas sin leer es exacto

El número de alertas sin leer SHALL calcularse sobre todas las alertas del destinatario, no
sobre las que caben en la pantalla.

#### Scenario: Más alertas de las que se muestran

- **WHEN** el profesional tiene más alertas de las que caben en una página
- **THEN** el conteo de pendientes refleja el total, no el de la página

### Requirement: Marcar una alerta como leída se refleja de inmediato

Al marcar una alerta como leída, la bandeja SHALL reflejar el cambio sin esperar a que la
pantalla se recargue.

#### Scenario: Marcar como leída

- **WHEN** el profesional marca una alerta como leída
- **THEN** la alerta pasa a verse como leída sin esperar a recargar la pantalla
