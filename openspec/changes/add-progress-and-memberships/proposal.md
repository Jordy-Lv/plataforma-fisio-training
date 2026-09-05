## Why

Dos vacíos que el negocio nombró explícitamente: el seguimiento físico se lleva hoy en
hojas de cálculo donde graficar la evolución es tedioso, y no hay control de fechas de
ingreso ni de vencimiento, así que nadie avisa al cliente antes de que caiga en mora.

Además, cuando un cliente reclama por falta de resultados, no hay registro de asistencia con
el que sustentar que asistió la mitad de las sesiones.

## What Changes

- Tamizaje periódico: peso, talla, IMC calculado y medidas corporales, con historial por
  paciente.
- **Gráfica de evolución** a partir del segundo tamizaje, y gráfica de progresión de carga
  a partir de lo registrado en las sesiones.
- Registro de asistencia por paciente, con historial y resumen mensual.
- Vitrina de planes y de servicios adicionales (nutrición, fisioterapia, artes marciales,
  talleres).
- Control de mensualidades: fecha de ingreso, fecha de vencimiento, estado y monto, **sin
  procesar el pago**.
- Job diario en `pg_cron` que marca las membresías por vencer y vencidas y genera el aviso
  correspondiente, visible en la aplicación y enviado por correo.

## Capabilities

### New Capabilities

- `screenings`: el tamizaje periódico y las gráficas de evolución que sustituyen la hoja de
  cálculo.
- `attendance`: el registro de asistencia y su resumen.
- `plans-and-memberships`: la vitrina comercial y el control administrativo de
  mensualidades con sus avisos.

### Modified Capabilities

Ninguna.

## Impact

- **Esquema:** `screenings`, `attendance`, `plans`, `services`, `memberships`, y el job de
  `pg_cron`.
- **Código:** `app/(patient)/progress/**`, `app/(pro)/patients/[id]/screenings/**`,
  `app/(admin)/memberships/**`, `app/(admin)/plans/**`, `lib/progress/**`.
- **Depende de:** `profiles` y `care_assignments` del slice 1. Las gráficas de carga leen
  `session_logs` del slice 3, pero se implementan contra datos del seed sin esperarlo.
- **Infraestructura:** requiere la extensión `pg_cron` habilitada y un secreto compartido
  para la ruta interna de generación de avisos.
