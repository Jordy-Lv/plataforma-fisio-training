## Context

Ver `proposal.md`. Las sesiones ya tienen `performed_on`; los días de rutina son ordinales, no días de la semana. Se conserva ese significado. El usuario pidió implementar tras revisar la propuesta visual y confirmó la rama original.

## Goals / Non-Goals

**Goals:** Programación persistente, lectura eficiente y aislamiento con el cliente autenticado. Reutilizar el diseño y la ejecución de la rama elegida.

**Non-Goals:** Metas clínicas por peso, recurrencias automáticas, citas por hora, notificaciones nuevas o cambios en otros slices.

## Decisions

- Tabla `routine_schedules`: id, patient_id, routine_day_id, scheduled_on, created_by, cancelled_at, created_at. RLS al crearla; escrituras del equipo con vínculo; un trigger comprueba la pertenencia real del día, fechas y campos inmutables. Solo `cancelled_at` puede actualizarse. No borrar datos.
- Programar fechas individuales evita inferir que «Día 1» significa lunes. Cancelar y programar otra fecha permite corregir una planificación sin reescribir el pasado.
- Meta derivada de programaciones de lunes a domingo, no constante de tres ni nueva tabla de objetivos. La unión con sesiones se hace por día y fecha y cuenta una programación como máximo una vez.
- Fechas de calendario como cadenas ISO y cálculos UTC para evitar desfases del navegador; «hoy» se obtiene en America/Bogota.
- La copia/asignación de plantillas ejecuta sus fechas de inicio y cierre en America/Bogota. Una migración nueva configura la zona únicamente durante esa función, conservando sus permisos e implementación; no reescribe fechas del historial.
- Páginas server bajo `/routine/calendar` y `/pro/routines/[patientId]/calendar`; navegación por parámetros `date` y `view`. Consulta acotada al intervalo visible, paginada si excede el límite de la API. Las escrituras revalidan ambas vistas.
- El detalle enlaza a un día de rutina con sus ejercicios y controles existentes; una sesión registrada enlaza al informe. No inventar duraciones, rachas ni datos de demostración en la interfaz.
- El calendario aparece primero y la meta semanal debajo. Cada rutina en la cuadrícula tiene un enlace directo a su descripción, separado del enlace del número del día; el paciente conserva la fecha y vista al volver, y el profesional llega al día correspondiente en sus rutinas.
- Para profesionales y administradores, pulsar un día vacío válido lleva al formulario de programación con esa fecha. Si el paciente no tiene días de rutina activa, abre la creación/asignación existente con contexto de fecha y regreso al calendario. Los pacientes solo consultan; no se amplían sus permisos.
- Un trigger de cierre de rutina cancela fechas no pasadas y sin sesiones, manteniendo el historial y los cierres en curso.
- Cuadrícula y contenido del calendario separados como componentes de servidor; estados visuales e intervalo de programación compartidos. El formulario conserva la fecha que el profesional edita al abrir la creación/asignación.
- La edición de ejercicios conserva el contexto del calendario en los enlaces y los campos ocultos de búsqueda. Los filtros del catálogo no alteran la fecha/vista de regreso.
- La comprobación de residuos valida ejercicios importados y usuarios/alertas de las semillas, sin fijar el tamaño del catálogo ni el número de alertas del cron. Su alcance es detectar residuos; las suites de semillas comprueban el contenido importado.

## Risks / Trade-offs

- [Cambiar el objetivo al cancelar] → Solo se cancelan fechas no pasadas y sin ejecución; se explica el conteo con sesiones programadas.
- [Sesiones repetidas el mismo día] → Avance deduplicado; todos los registros siguen accesibles.
- [Datos clínicos ajenos] → Comprobar RLS directamente con paciente ajeno, profesional sin vínculo e inactivos, incluyendo falsificación de campos.
- [Base local con la cuenta de prueba del usuario] → Validar reset en entorno aislado y aplicar únicamente la nueva migración a la base de trabajo.

## Migration Plan

Aplicar la migración aditiva, regenerar tipos y desplegar código. La tabla nace vacía, sin atribuir fechas a rutinas anteriores. Ante un problema, retirar el acceso de la interfaz conservando la tabla y su historial; no editar migraciones anteriores.
