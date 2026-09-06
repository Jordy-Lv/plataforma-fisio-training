# Verificación de la copia de rutinas — 2026-09-05

## Alcance implementado

Tareas 1.2, 1.4, 1.6 y 2.5: copia transaccional, independencia de las plantillas,
reemplazo de la rutina del mismo tipo conservando sesiones y rechazo de la edición
por el paciente en la API.

`copy_routine_template(patient_id uuid, template_id uuid)` devuelve el UUID de la
rutina nueva. Se invoca con la sesión del administrador o profesional a cargo;
mantiene RLS mediante `security invoker`. El autor se obtiene de `auth.uid()`.
Una sola lectura captura la cabecera, los días y las prescripciones de la plantilla.

El bloqueo por paciente serializa asignaciones simultáneas. El índice parcial
también impide crear dos rutinas activas del mismo tipo mediante inserción directa.
Si ya existen duplicados, la migración falla: no elimina ni elige datos por su cuenta.

## Prueba reproducible

Con las migraciones aplicadas en Supabase local:

```sh
node --test scripts/verify-routine-snapshot.test.mjs
```

Resultado: 9 pruebas aprobadas, sin omisiones. Incluyen un fallo en el tercer día
después de comenzar la copia, tres pacientes con copias independientes, dos
asignaciones simultáneas, historial de sesión, accesos por rol y vínculo finalizado.
Los usuarios y las plantillas de esta prueba son temporales y se eliminan al terminar.

Comprobaciones adicionales:

- `npm run test:rls`: 10/10 aprobadas.
- `npm run test:rules`: 35/35 aprobadas.
- `npm run test:auth`: 7/7 aprobadas tras restablecer el servicio.
- `npm run lint`: sin errores; una advertencia ajena a este cambio por `appUrl`
  sin usar en `scripts/verify-auth-screens.test.mjs`.
- `openspec validate --all --strict`: cuatro cambios válidos.
- `typecheck` y `build`: fallan en `lib/progress/screening-queries.ts`, archivo
  incorporado durante el trabajo paralelo. La consulta `screenings(...)` desde
  `profiles` es ambigua porque hay dos relaciones; sus errores derivados aparecen
  en las líneas 66 y 95. No se modificó ese módulo ni se omite la comprobación.

## Pendiente

La tarea 1.3 debe integrar el motor y el filtro de contraindicaciones antes de
conectar la asignación automática al onboarding. Esta función copia la plantilla
completa; todavía no constituye el flujo automático ni la interfaz del paciente.
`assigned_by` identifica al usuario que ejecuta esta copia manual; la asignación
automática deberá conservar el contrato de autor nulo definido en el modelo.

Los caminos 3, 4 y 5 completos y la validación en teléfono real siguen pendientes.

## Incidencia del entorno local

Al intentar validar el reinicio de una base temporal con `supabase db reset
--db-url`, la CLI recreó el servicio local compartido. No se conservó una copia de
los datos anteriores, por lo que no se afirma su recuperación. Se restableció
Supabase desde las migraciones y la semilla del repositorio. Este reinicio no se
ejecutó contra Supabase cloud.

Se volvieron a sembrar 868 ejercicios con sus imágenes, cuatro plantillas y seis
reglas mediante los scripts existentes, apuntando expresamente al entorno local.
Esto reconstruye los datos de demostración; no recupera las modificaciones manuales
que pudiera haber en la base anterior.
