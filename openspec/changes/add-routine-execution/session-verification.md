# Sesiones, checklist y alertas — 2026-09-05

## Alcance y reparto

Codex implementa las secciones 3, 4 y 5. Durante el trabajo apareció otra
implementación de la sección 2 (`RoutineItems`, `item-actions`, `item-queries` y
la página `/pro/routines/[patientId]`); se conserva sin reescribirla.

Rutas de esta entrega:

- `/routine`: iniciar o reanudar cada día y consultar sesiones recientes.
- `/routine/sessions/[sessionId]`: checklist, detalle, registros y cierre.
- `/pro/sessions`: consulta del equipo por paciente, limitada por RLS.
- `/pro/sessions/[sessionId]`: valores prescritos, reales y sustitución registrada.
- `/pro/alerts`: bandeja propia del profesional; el administrador ve todas las
  alertas. Cada destinatario marca solamente su propia copia como leída.

Los accesos a sesiones y alertas se enlazan desde `/pro/routines`. Los enlaces de
los paneles generales deben integrarse con su responsable; no se modifican las
pantallas de identidad y personas de otro slice.

## Contrato de datos

Migración nueva: `20260905210000_routines_session_execution.sql`.

- Sesión, día, ejercicio y paciente deben corresponder entre sí. Las comprobaciones
  se aplican también a escrituras directas por API, con sesión del paciente activo.
- Un inicio simultáneo reanuda una única sesión abierta del mismo día en Colombia.
- Cada marca es un `upsert` único por sesión e ítem; una sesión cerrada no permite
  reescrituras. Para completar deben estar marcados todos los ejercicios del día.
- El cierre y las alertas son una sola transacción. Repetir el cierre no duplica avisos.
- `exercise_id`, `prescribed_sets`, `prescribed_reps` y `prescribed_weight` conservan
  el ejercicio y la prescripción al primer registro. La base deriva estos campos;
  el paciente no puede falsificarlos. Los registros anteriores se completan con
  la prescripción que existe al aplicar la migración, sin afirmar que se recupera
  una versión histórica que nunca se almacenó.
- Dolor entre 0 y 10, zonas del vocabulario compartido, esfuerzo entre 1 y 10 y
  valores reales no negativos. Saltar requiere nivel, zona y observación en el
  mismo paso. Zod y las restricciones de PostgreSQL validan los datos.
- El dolor se cuenta por sesiones distintas, por ejercicio realizado o por zona,
  dentro de catorce fechas inclusivas por defecto. Un nivel igual al umbral cuenta,
  siguiendo la descripción de `alert_settings`. Si coinciden ejercicio y zona se
  generan dos avisos con sus respectivos criterios y evidencias.
- Saltados: últimas N sesiones en que se registró ese ejercicio; hacerlo o
  modificarlo interrumpe la racha. Repetir un registro en una sesión no incrementa N.
- Se usan los umbrales existentes. Cambiarlos en `alert_settings` afecta a la
  siguiente evaluación; no requiere despliegue. Los destinatarios se resuelven
  al cierre: administradores activos y todos los profesionales con vínculo vigente.
- Finalizar el vínculo retira el acceso del profesional a esas alertas. La lectura
  de una copia no cambia las de otros destinatarios. El paciente no puede crear
  avisos arbitrarios ni acceder a su contenido.

## Integraciones que requieren al responsable del otro trabajo

1. **Retirada de ejercicios con historia:** la FK de `session_logs.routine_item_id`
   pasa de borrado en cascada a `NO ACTION`. Quitar un ítem que ya tiene registros
   se rechaza conservando el historial. El ajuste debe acordar retirada lógica o
   una nueva versión de rutina para permitir esa operación sin pérdida de datos.
   No se modifica la implementación concurrente de `deleteRoutineItem`.
2. **Gráfica del slice 4:** `lib/progress/progression-queries.ts` sigue agrupando por
   `routine_items.exercise_id`. Su responsable debe consumir el ejercicio histórico
   del registro (o su sustitución) para evitar atribuir cargas antiguas a un ejercicio
   que el profesional cambió después. El informe de sesión ya usa el histórico.

## Evidencia local

`npm run test:routines:sessions`: 18/18 pruebas aprobadas, incluida la sesión
principal que agrupa 17 casos. Usa usuarios y rutinas temporales, con limpieza al
terminar. Comprueba también los límites temporales, cambio de ejercicio, cambio de
umbral, reasignación de rutina y rechazo del borrado que destruiría historial.

El camino 5 se recorre por formularios HTTP reales de Next: iniciar, registrar dolor
y saltado, cerrar tres sesiones, entrar como administrador y leer el aviso con las
observaciones. Las pruebas adicionales usan la API de Supabase directamente para
que la interfaz no pueda ocultar una fuga de permisos.

En el navegador integrado, viewport de 375 × 812: inicio/reanudación, registro de
saltado con dolor 8 en rodilla, actualización, recarga, apertura del detalle con
imagen y cierre. Se conservan estado, valores y observación. Ancho de documento:
375 px; controles visibles del flujo de 44 px o más. Esto es verificación en
navegador, **no en teléfono físico**.

La migración se aplicó en transacción en Supabase local y se regeneraron los tipos.
Todas las migraciones se aplicaron desde tablas de aplicación vacías en un
contenedor PostgreSQL temporal, sin red, reutilizando solo el esquema técnico de
Auth/Storage. No se reinició la base compartida. Esta comprobación no se presenta
como ejecución de `npm run db:reset`; ese comando formal queda pendiente antes de
un PR y debe coordinarse con quien está usando la base local.

No hay despliegue ni comprobación de Railway en esta entrega. La tarea 6.1 de
verificación en teléfono real continúa pendiente.
