## Why

El cliente puede consultar y ejecutar rutinas, pero no sabe qué día le corresponde cada una ni cuánto ha cumplido de su semana. El usuario autorizó implementar el calendario mostrado en la propuesta visual en `feature/create-calendar-to-training`.

## What Changes

- Calendario del cliente con vistas de mes y semana, navegación por fechas y detalle del día.
- Programación de días de rutina por el profesional asignado o el administrador, con cancelación lógica.
- Sesiones realizadas y estados reales sobre las fechas, con acceso a la ejecución existente.
- Meta semanal derivada de las sesiones programadas y su cumplimiento, sin cifras de ejemplo.
- Consulta del calendario individual desde el panel de rutinas del profesional.

## Capabilities

### New Capabilities

- `routine-calendar`: programación, consulta por fechas y cumplimiento semanal de las rutinas del paciente.

### Modified Capabilities

Ninguna. Se reutiliza el registro de sesiones existente.

## Impact

- Slice de rutinas: `lib/routines`, `components/routines`, `app/(patient)/routine` y `app/(pro)/pro/routines`.
- Un enlace en `components/shell/nav-items.ts`, sin modificar componentes UI compartidos ni clientes Supabase.
- Nueva tabla `routine_schedules` con RLS, migración nueva y tipos regenerados.
- Migración correctiva de la zona horaria de `copy_routine_template` para que una asignación nueva pueda programarse hoy después de las 19:00 en Colombia.
- Pruebas de fechas, cumplimiento, acceso por API y recorrido HTTP. Sin nuevas dependencias de la aplicación.
- Limpieza solicitada antes de la PR: quitar campos y código repetido del calendario, conservar la fecha editada al abrir la asignación y corregir el detector de residuos de pruebas que dependía de cantidades de semilla desactualizadas.

## Scope Clarification

Por indicación explícita del usuario, la comprobación en teléfono físico queda fuera del alcance de esta PR. Se conservan las pruebas de navegador a 375 px y escritorio.
