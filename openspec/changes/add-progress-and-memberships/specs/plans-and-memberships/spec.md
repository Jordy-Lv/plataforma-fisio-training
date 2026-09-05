## Purpose

Muestra la oferta comercial del negocio y lleva el control de fechas de ingreso y
vencimiento de cada cliente, avisando antes de que la mensualidad caiga, sin procesar
pagos.

## ADDED Requirements

### Requirement: Vitrina de planes y servicios

El sistema SHALL mostrar los planes de suscripción y los servicios adicionales del negocio,
con su descripción y su precio. Solo un `admin` SHALL poder definirlos.

#### Scenario: Paciente consulta la oferta

- **WHEN** un paciente abre la sección de planes
- **THEN** ve los planes activos con su descripción, precio y qué incluye, y los servicios
  adicionales ofrecidos

#### Scenario: Plan desactivado

- **WHEN** un `admin` desactiva un plan
- **THEN** deja de mostrarse en la vitrina, y las membresías existentes que lo referencian
  siguen funcionando

#### Scenario: Un profesional no define planes

- **WHEN** un `professional` intenta crear o modificar un plan
- **THEN** la operación es rechazada

### Requirement: Control de mensualidades

Un `admin` SHALL poder registrar la membresía de un paciente con plan, fecha de ingreso,
fecha de vencimiento, monto y estado. El sistema NO procesa el pago: es un registro
administrativo.

#### Scenario: Membresía registrada

- **WHEN** un `admin` registra una membresía con ingreso el 30 y vencimiento el 30 del mes
  siguiente
- **THEN** queda activa, y el paciente puede consultar su fecha de vencimiento

#### Scenario: El paciente no modifica su membresía

- **WHEN** un paciente intenta crear o modificar su membresía
- **THEN** la operación es rechazada; solo puede consultarla

#### Scenario: Profesional consulta la membresía de su paciente

- **WHEN** el profesional a cargo consulta a su paciente
- **THEN** ve el estado de su membresía; un profesional sin asignación no la ve

### Requirement: Aviso de vencimiento próximo

El sistema SHALL revisar diariamente las membresías y SHALL marcar como próximas a vencer
las que venzan dentro del plazo configurado, generando el aviso correspondiente.

#### Scenario: Membresía por vencer

- **WHEN** se ejecuta la revisión diaria y una membresía vence en tres días
- **THEN** su estado pasa a próxima a vencer, se genera una alerta para el administrador y
  el paciente ve el aviso en su vista

#### Scenario: Aviso por correo

- **WHEN** se genera un aviso de vencimiento próximo y el envío de correo está configurado
- **THEN** el paciente recibe un correo en español indicando la fecha de vencimiento

#### Scenario: Membresía vencida

- **WHEN** se ejecuta la revisión y una membresía ya pasó su fecha de vencimiento
- **THEN** su estado pasa a vencida y se genera el aviso correspondiente

#### Scenario: Sin avisos duplicados

- **WHEN** la revisión diaria se ejecuta dos veces sobre la misma membresía por vencer
- **THEN** no se genera un segundo aviso para el mismo vencimiento

#### Scenario: Plazo configurable

- **WHEN** un `admin` cambia el plazo de aviso de cuatro a siete días
- **THEN** las revisiones siguientes usan el nuevo plazo

### Requirement: Ejecución protegida de la revisión

La ruta que ejecuta la revisión diaria SHALL rechazar toda invocación que no presente el
secreto compartido.

#### Scenario: Invocación sin autorización

- **WHEN** se invoca la ruta de revisión sin el secreto correcto
- **THEN** la petición es rechazada y no se modifica ninguna membresía
