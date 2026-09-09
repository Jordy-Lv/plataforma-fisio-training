## 1. Datos y reglas

- [x] 1.1 Crear la migración de programación con RLS, validación y cancelación al cerrar rutina; verificar aislamiento y falsificación por API.
- [x] 1.2 Aplicar sobre la base local sin borrar datos, comprobar reset en un entorno aislado y regenerar tipos.
- [x] 1.3 Implementar fechas y cumplimiento semanal; verificar cambios de mes/año, años bisiestos y sesiones repetidas.

## 2. Experiencia de calendario

- [x] 2.1 Implementar consulta acotada, calendario de mes/semana, detalle y meta; verificar navegación y estados vacío/error.
- [x] 2.2 Implementar programación y cancelación por server actions; verificar persistencia, fechas inválidas y permisos.
- [x] 2.3 Integrar navegación y ejecución de rutinas; verificar el recorrido desde programación hasta sesión completada.
- [x] 2.4 Priorizar el calendario sobre la meta semanal y abrir la descripción al pulsar una rutina; verificar el enlace directo y los controles a 375 px.
- [x] 2.5 Abrir programación o creación/asignación desde días vacíos, solo para profesionales y administradores; conservar la fecha y verificar acceso del paciente y restricciones de fechas.

## 3. Verificación

- [x] 3.1 Ejecutar pruebas de calendario, typecheck, lint y build; documentar resultados y limitaciones.
- [x] 3.2 Revisar el calendario en navegador a 375 px y escritorio; comprobar objetivos de 44 px y ausencia de desbordes.
- [x] 3.4 Limpiar campos y lógica sobrantes, corregir los problemas encontrados en la revisión y verificar el cambio completo en un entorno aislado para la PR.
- [x] 3.5 Revisar la integración del calendario con la edición de rutinas, conservar fecha y vista al buscar/añadir/sustituir ejercicios y verificar regresiones.
- [x] 3.6 Verificar el recorrido desde un paciente sin rutina hasta su primera sesión completada; corregir la vigencia de la asignación para usar la fecha de Bogotá, incluso si el servidor está en otra zona.

- [x] 3.7 Integrar `main`, conservar el editor actual y su confirmación de reemplazo, repetir reset y verificación completa: 29 suites y 284 pruebas aprobadas.

La comprobación en teléfono físico se excluye del alcance de esta PR por indicación explícita del usuario; no se realizó ni se marca como aprobada.
