## Why

Es el corazón del producto: el momento en que el paciente ejecuta su rutina desde el
teléfono y dice qué hizo, qué no hizo y por qué. Hoy esa información se pierde en un chat
de WhatsApp, y con ella se pierde la posibilidad de detectar a tiempo que un dolor persiste
tres sesiones seguidas.

Este change convierte esa conversación dispersa en datos, y los datos en alertas
accionables para el profesional a cargo.

## What Changes

- Asignación de rutina como **snapshot**: los ejercicios se copian de la plantilla a las
  tablas del paciente, y la plantilla no se toca nunca más.
- Ajuste de la rutina por el profesional a cargo: cambiar series y repeticiones, eliminar,
  añadir o sustituir ejercicios, marcando lo que se personalizó.
- Vista móvil del paciente: su rutina del día en modo **checklist**, con la imagen y la
  descripción de cada ejercicio.
- Registro por ejercicio: hecho, saltado o modificado; series, repeticiones y peso reales;
  esfuerzo percibido; **nivel de dolor 0–10**; ubicación del dolor; observaciones libres.
- Generación automática de alertas: dolor persistente y ejercicios saltados repetidamente.
- Bandeja de alertas del profesional y del administrador, con el contexto de por qué se
  generó cada una.

## Capabilities

### New Capabilities

- `routine-assignment`: cómo una plantilla se convierte en la rutina de un paciente y cómo
  el profesional la ajusta.
- `routine-execution`: cómo el paciente ejecuta su rutina y registra lo que ocurrió.
- `clinical-alerts`: cómo lo registrado se convierte en algo que alguien debe atender.

### Modified Capabilities

Ninguna.

## Impact

- **Esquema:** `routines`, `routine_days`, `routine_items`, `sessions`, `session_logs`,
  `alerts`, más la tabla de umbrales configurables de alertas.
- **Código:** `app/(pro)/**`, `app/(patient)/routine/**`, `lib/routines/**`.
- **Depende de:** `template_*` y `evaluateRules()` del slice 2, `care_assignments` del
  slice 1.
- **Es el slice más grande y el que concentra el valor demostrable.** Si hay holgura en el
  equipo, refuerza aquí.
