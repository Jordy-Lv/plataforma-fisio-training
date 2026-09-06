# Revisión de calidad y control de acceso del backend

**Fecha:** 2026-09-06 (America/Bogota)  
**Base auditada:** `main@3f2eeb591a8e3ded85bfdbb9c19fb21e31092126`  
**Modalidad:** entorno local aislado, sin corregir código, sin commits, sin push, sin despliegue y sin acceso a servicios remotos  
**Run ID:** `20260906t154046`  
**Resultado:** 12 hallazgos confirmados y 2 sospechas documentadas; ninguna severidad crítica, 6 altas, 5 medias y 3 bajas.

## Resumen ejecutivo

Los controles positivos más delicados sí funcionaron: aislamiento entre pacientes, separación entre profesional asignado/no asignado, protección contra autoasignación de roles mediante metadata, invitaciones ligadas al correo, cierre de asignaciones al desactivar profesionales, permisos de alertas, unicidad y cierre de sesiones bajo concurrencia, snapshot histórico de rutinas, límites clínicos y autenticación del cron.

Los riesgos principales están en rutas que evitan la capa de interfaz:

1. Un JWT emitido antes de desactivar una cuenta conserva acceso directo a PostgREST y Storage.
2. Las RPC de asignación permiten confirmar una regla distinta de la ganadora, declarar falsamente que no hubo coincidencia o copiar directamente una plantilla sin filtrar contraindicaciones.
3. Storage no distingue propiedad: un profesional puede sobrescribir archivos de otro y escribir fuera del prefijo previsto.
4. El cron puede afirmar que envió y registró un aviso aunque falle la marca `notified_at`; ese aviso tampoco se reintenta.
5. El esquema acepta membresías semánticamente inválidas y no contiene el precio exigido para servicios.

No se encontraron bypasses entre pacientes activos, apropiación directa de pacientes, elevación de rol por metadata, reapertura de sesiones cerradas, edición de logs históricos ni fuga de alertas a pacientes o profesionales no asignados.

## Entorno y línea base

| Elemento | Evidencia |
|---|---|
| Copia | `/Users/yordypardopajaro/Freelance/fisio-qa-backend-20260906T145640`, HEAD separado |
| Commit | `3f2eeb591a8e3ded85bfdbb9c19fb21e31092126` |
| Supabase aislado | proyecto `fisio-qa-backend-20260906t145640`; API `55431`; DB `55432`; Mailpit `55434` |
| Next aislado | `127.0.0.1:3107` |
| Versiones | Node 26.6.0; PostgreSQL 17.6; Supabase CLI 2.116.0; Next 15.5.25; React 19.1.0; TypeScript 5.9.3; Zod 4.5.4; supabase-js 2.115.0 |
| Migraciones | 7/7 aplicadas |
| Datos iniciales | 0 perfiles, asignaciones, rutinas, sesiones, alertas, membresías y avisos |
| Checkout compartido observado | rama `fix/qa-hallazgos`, HEAD `1249f6e`; no se modificó código ni datos compartidos |

Puertas ejecutadas: typecheck aprobado; lint aprobado con una advertencia preexistente; OpenSpec estricto 4/4; build aprobado; tipos generados idénticos a `lib/db/types.ts`; reglas 35/35; resiliencia de onboarding 16/16; diseño 4/4.

## Hallazgos

### BACK-001 — La desactivación no revoca el acceso de un JWT ya emitido

- **Área / prioridad / estado:** Auth + RLS + Storage / ALTA / CONFIRMADO, 2 pasadas.
- **Evidencia:** un paciente desactivado conservó lectura de `profiles` y `patient_details` y actualizó `profiles.full_name`; un profesional desactivado creó un ejercicio y subió un objeto. Todas las escrituras persistieron y se verificaron con la clave de servicio. En contraste, el middleware HTTP respondió `307 /login?error=inactive`, borró cookies y usó `private, no-store`.
- **Pasos mínimos:** iniciar sesión; conservar el access token; poner `profiles.is_active=false`; consultar/actualizar por PostgREST o subir a Storage con el token anterior.
- **Esperado / observado:** la cuenta inactiva no debe leer ni escribir / RLS sigue aceptando `auth.uid()` y `current_role()` sigue devolviendo el rol.
- **Impacto:** una baja administrativa no corta el acceso desde clientes que llamen directamente a Supabase; incluye datos de salud y contenido público del catálogo.
- **Hipótesis:** las políticas propias de `profiles` y `patient_details` comprueban identidad pero no actividad (`20260905030000...sql:555-603`); `current_role()` tampoco filtra `is_active` (`:382-390`); Storage confía en esa función.
- **Recomendación:** centralizar un predicado de actor activo y aplicarlo a toda política/RPC de usuario, incluyendo Storage; decidir además si se revocan sesiones al desactivar.
- **Validación posterior:** repetir las cinco variantes con token anterior y comprobar 0 filas/403; mantener como control que el middleware borra la sesión.
- **Limpieza:** usuarios, ejercicio y objetos eliminados exactamente; conteos finales 0.

### BACK-002 — `commit_routine_assignment` confía en la regla elegida por el cliente

- **Área / prioridad / estado:** RPC de reglas y rutinas / ALTA / CONFIRMADO, 2 pasadas y 2 variantes.
- **Evidencia:** con contexto de paciente estable, la RPC aceptó una regla activa cuyos criterios no coincidían y asignó su plantilla. También aceptó `selected_rule=null` aunque existía una regla ganadora, dejando evento `no_match`.
- **Pasos mínimos:** evaluar el contexto; enviar a la RPC ese contexto sin cambios, pero sustituir el ID ganador por otra regla activa o por `null`.
- **Esperado / observado:** el servidor recalcula y exige el ganador determinista / solo valida que la regla y plantilla estén activas y que las exclusiones coincidan.
- **Impacto:** un profesional asignado puede saltarse las reglas clínicas/operativas manteniendo una auditoría engañosa.
- **Hipótesis:** `20260905190000_routines_rule_assignment.sql:111-140` compara el contexto y las exclusiones, pero nunca demuestra que `selected_rule` sea la primera regla compatible.
- **Recomendación:** calcular el ganador dentro de la misma transacción y no aceptar el resultado decisorio del cliente; como mínimo comparar ID y resultado `no_match` contra una evaluación server-side.
- **Validación posterior:** ambos payloads alterados deben fallar sin rutina ni evento; el ganador auténtico debe seguir asignando.
- **Limpieza:** reglas, plantillas, rutinas, eventos y usuarios eliminados; conteos 0.

### BACK-003 — La RPC pública de copia evita reglas y contraindicaciones

- **Área / prioridad / estado:** RPC de rutinas / ALTA / CONFIRMADO, 2 pasadas.
- **Evidencia:** un profesional asignado llamó directamente `copy_routine_template` y obtuvo una rutina activa que contenía un ejercicio contraindicado para la rodilla del paciente.
- **Pasos mínimos:** crear plantilla activa con ejercicio contraindicado; crear condición activa del paciente; llamar la RPC como profesional asignado.
- **Esperado / observado:** toda asignación pasa por evaluación, filtro y evento / la copia directa está concedida a `authenticated` y crea la rutina completa.
- **Impacto:** bypass clínico y ausencia de trazabilidad del motor de reglas.
- **Hipótesis:** la función valida actor/paciente/plantilla, pero no filtra condiciones (`20260905180000_routines_copy_template.sql:16-90`) y tiene `GRANT EXECUTE` a autenticados (`:97-98`).
- **Recomendación:** convertirla en detalle privado invocable solo desde la RPC de commit, o incorporar reglas/filtro/evento al único punto público.
- **Validación posterior:** la llamada directa debe quedar denegada; el flujo oficial debe filtrar y registrar el resultado.
- **Limpieza:** fixtures eliminadas exactamente.

### BACK-004 — Se puede falsificar quién tomó un tamizaje o registró asistencia

- **Área / prioridad / estado:** Progreso + integridad de auditoría / MEDIA / CONFIRMADO, 2 variantes.
- **Evidencia:** un profesional asignado insertó `screenings.taken_by` y `attendance.registered_by` con el UUID de un tercero; también fijó un `check_in_at` arbitrario. Los valores persistieron.
- **Pasos mínimos:** usar JWT de profesional asignado; insertar una fila válida para su paciente cambiando los campos de atribución.
- **Esperado / observado:** la identidad se deriva de `auth.uid()` / las políticas solo comprueban `patient_id` (`20260905030000...sql:823-847`).
- **Impacto:** historial clínico y operativo atribuible a personas que no realizaron la acción.
- **Hipótesis:** las acciones de servidor rellenan el actor, pero no existe trigger ni privilegio de columna que impida el bypass directo.
- **Recomendación:** derivar la autoría en trigger/RPC y restringir escrituras directas de esas columnas.
- **Validación posterior:** payload falsificado debe persistir con el actor real o fallar; admin debe conservar el flujo explícitamente requerido.
- **Limpieza:** filas y usuarios eliminados; conteos 0.

### BACK-005 — Membresías aceptan relaciones y valores semánticamente inválidos

- **Área / prioridad / estado:** Membresías + SQL / ALTA / CONFIRMADO, 2 variantes.
- **Evidencia:** un admin creó una membresía para un perfil profesional, con inicio posterior al vencimiento y monto `-1`. También creó otra contra un plan inactivo. Ambas persistieron.
- **Pasos mínimos:** insertar directamente por PostgREST como admin evitando el formulario.
- **Esperado / observado:** paciente activo, plan activo, fechas ordenadas y monto no negativo / el esquema solo tiene FKs y tipos (`20260905030000...sql:320-329`).
- **Impacto:** reportes, vencimientos y correos pueden operar sobre datos imposibles o sobre personal.
- **Hipótesis:** las restricciones solo viven en Zod/acciones y no en la frontera persistente.
- **Recomendación:** constraints para fechas/monto y trigger transaccional para rol/actividad de paciente y plan.
- **Validación posterior:** cada variante debe fallar a nivel DB; membresía válida debe seguir funcionando.
- **Limpieza:** membresías, planes y perfiles eliminados; conteos 0.

### BACK-006 — El profesional no puede editar el ejercicio propio que creó

- **Área / prioridad / estado:** Catálogo + RLS / MEDIA / CONFIRMADO, 2 pasadas; existe contradicción con una prueba heredada.
- **Evidencia:** el profesional creó un ejercicio `is_custom=true`; el UPDATE posterior devolvió 0 filas y el nombre quedó intacto.
- **Esperado / observado:** OpenSpec exige crear y editar ejercicios propios (`exercise-library/spec.md:64`) / solo admin actualiza (`20260905030000...sql:679-682`) y el modelo no guarda propietario.
- **Impacto:** el flujo funcional comprometido no puede implementarse con control de propiedad.
- **Hipótesis:** falta `created_by/owner_id`; la suite heredada codifica el comportamiento actual, no el contrato.
- **Recomendación:** resolver primero la contradicción; si prevalece OpenSpec, modelar propietario y limitar UPDATE a dueño activo o admin.
- **Validación posterior:** dueño edita, otro profesional no, admin sí, paciente no.
- **Limpieza:** ejercicio y usuarios eliminados.

### BACK-007 — Cualquier profesional puede sobrescribir objetos ajenos y salir del prefijo previsto

- **Área / prioridad / estado:** Storage / ALTA / CONFIRMADO, 2 pasadas y 2 variantes.
- **Evidencia:** profesional B hizo upsert sobre la ruta creada por profesional A y cambió los bytes; también escribió bajo `imported/...` en vez de `custom/...`.
- **Esperado / observado:** cada profesional administra solo objetos propios en el namespace autorizado / las políticas aceptan cualquier nombre del bucket para cualquier profesional (`20260905040000...sql:34-50`).
- **Impacto:** alteración de imágenes usadas por rutinas y colisión con contenido importado.
- **Hipótesis:** Storage no registra propietario ni valida `storage.foldername(name)`.
- **Recomendación:** namespace inmutable por `auth.uid()` o tabla de propiedad enlazada al ejercicio; reservar `imported/` al admin/importador.
- **Validación posterior:** overwrite cruzado y ruta externa deben fallar; dueño y admin deben conservar operaciones previstas.
- **Limpieza:** objetos eliminados; `storage.objects=0`.

### BACK-008 — El bucket acepta archivos vacíos o contenido no imagen con MIME declarado

- **Área / prioridad / estado:** Storage + validación / BAJA / CONFIRMADO, 2 pasadas.
- **Evidencia:** se aceptó un archivo de 0 bytes y bytes arbitrarios declarados `image/png`; 5 MiB exactos se aceptaron y 5 MiB + 1 se rechazó correctamente.
- **Esperado / observado:** contenido visual válido / se valida tamaño máximo y metadata MIME, no firma ni tamaño mínimo.
- **Impacto:** imágenes rotas o contenido engañoso servido públicamente; no se demostró ejecución activa.
- **Hipótesis:** `allowed_mime_types` confía en el encabezado cliente (`20260905040000...sql:13-24`).
- **Recomendación:** validar firma/tipo real y rechazar vacío en el flujo de carga; considerar procesamiento server-side.
- **Validación posterior:** corpus vacío/spoof debe fallar; JPEG/PNG/GIF/WebP válidos dentro del límite deben pasar.
- **Limpieza:** objetos eliminados.

### BACK-009 — El cron pierde el reintento cuando falla `notified_at`

- **Área / prioridad / estado:** Membresías + correo + observabilidad / ALTA / CONFIRMADO, 2 pasadas y fallo inyectado local.
- **Evidencia:** se inyectó un trigger transitorio que rechazó solo el UPDATE de `membership_notices.notified_at`. La ruta respondió 200, `emailed=1`, `emailErrors=0`; Mailpit recibió el correo, pero `notified_at` quedó nulo. Una segunda revisión produjo `emailed=0` y ningún nuevo envío.
- **Esperado / observado:** fallo de marcado visible y reintentable / el resultado del UPDATE no se inspecciona y la unicidad del aviso impide que vuelva a `new_notices`.
- **Impacto:** falso éxito operativo; si el envío y marcado divergen no existe recuperación coherente.
- **Hipótesis:** `lib/progress/membership-review.ts:113-120` espera la promesa, pero ignora `{ error }`; `review_membership_expiry` solo devuelve avisos recién insertados (`20260905200000...sql:146-201`).
- **Recomendación:** comprobar el error del UPDATE y diseñar estado/outbox reintentable con idempotencia de entrega.
- **Validación posterior:** repetir fallo inyectado; debe reportarse error y quedar pendiente para reintento controlado.
- **Limpieza:** trigger transitorio eliminado (`QA triggers=0`), correos borrados (`Mailpit=0`), datos eliminados.

### BACK-010 — El cron devuelve 500 para números inválidos y acepta 0 fuera del contrato del panel

- **Área / prioridad / estado:** API cron + validación / BAJA / CONFIRMADO, 2 pasadas.
- **Evidencia:** secreto ausente/incorrecto dio 401 y no tocó datos; cuerpo vacío, JSON inválido, null o string usó configuración. `noticeDays=-1`, decimal y entero máximo dieron 500; `0` dio 200 aunque el panel exige 1..90.
- **Esperado / observado:** una única validación de entrada y 4xx para solicitud inválida / la ruta solo comprueba `typeof number` y delega al cast/SQL (`app/api/cron/memberships/route.ts:37-57`).
- **Impacto:** ruido de 500 y contratos distintos entre panel y endpoint; solo explotable con el secreto correcto.
- **Recomendación:** compartir esquema entero 1..90 y devolver 400; documentar si 0 es intencional.
- **Validación posterior:** matriz de tipos, límites y cuerpos debe producir 400/200 consistente.
- **Limpieza:** no se crearon membresías en esta batería.

### BACK-011 — Los servicios no tienen el precio exigido por OpenSpec

- **Área / prioridad / estado:** Modelo de negocio + contrato / MEDIA / CONFIRMADO por API.
- **Evidencia:** como admin, insertar un servicio con `price=45000` falló `PGRST204` y no persistió; el mismo servicio sin `price` se aceptó. OpenSpec exige descripción y precio (`plans-and-memberships/spec.md:11-17`); la tabla no tiene la columna (`20260905030000...sql:311-318`).
- **Impacto:** la vitrina no puede mostrar ni el administrador definir el precio prometido.
- **Recomendación:** aclarar si el precio pertenece al alcance; si sí, migración nueva, validación, tipos, acciones y presentación.
- **Validación posterior:** CRUD admin con precio y lectura de vitrina; no admin solo lectura.
- **Limpieza:** servicio y admin de prueba eliminados.

### BACK-012 — No existe ruta de generación para `low_attendance`

- **Área / prioridad / estado:** Alertas + asistencia / MEDIA / CONFIRMADO por trazado completo de implementación; no existe un evento runtime invocable.
- **Evidencia:** el enum, umbral y etiqueta UI existen, y el contrato define menos del 50 % del mes; la búsqueda completa en app/lib/migraciones solo encuentra esas declaraciones. No hay función, trigger, cron ni modelo de asistencia esperada que pueda calcular el denominador.
- **Esperado / observado:** generación y destinatarios según contrato / tipo configurado pero inerte.
- **Impacto:** una alerta funcional comprometida nunca puede aparecer.
- **Recomendación:** definir asistencia esperada y momento de evaluación, crear generador idempotente y probar zona horaria/destinatarios.
- **Validación posterior:** casos <50 %, =50 %, >50 %, mes parcial, asignación finalizada y doble ejecución.
- **Limpieza:** no creó datos.

### BACK-013 — Reordenamientos de plantillas y reglas no son transaccionales

- **Área / prioridad / estado:** Atomicidad / MEDIA / SOSPECHA (revisión estática; no se forzó intercalado concurrente).
- **Evidencia:** `moveTemplateItem` hace tres UPDATE separados y compensación manual (`lib/catalog/template-actions.ts:352-426`); `moveRule` renumera en un bucle de UPDATE independientes (`lib/catalog/rule-actions.ts:145-191`).
- **Riesgo esperado:** caída, revocación o carrera entre pasos puede dejar `position=-1`, orden parcial o prioridades renumeradas a medias.
- **Recomendación:** RPC transaccional con bloqueos y precondición de versión; constraint diferible cuando corresponda.
- **Validación posterior:** barreras concurrentes y fallos inyectados en cada paso; comprobar rollback total.
- **Limpieza:** no se inyectó fallo ni se crearon fixtures.

### BACK-014 — Varias FK de rutas de borrado/join carecen de índice inicial

- **Área / prioridad / estado:** SQL + rendimiento / BAJA / SOSPECHA (catálogo estático; no representa carga productiva).
- **Evidencia:** introspección marcó, entre otras, `alerts.patient_id`, `assignment_rules.template_id`, `memberships.plan_id`, `routine_assignment_events.patient_id/routine_id`, `routine_items.exercise_id`, `sessions.routine_id/routine_day_id`, `template_items.exercise_id` y columnas de autoría. Las consultas principales sí tienen índices útiles por paciente/estado/fecha.
- **Impacto posible:** validación/borrado de padres y joins administrativos degradan al crecer los datos.
- **Recomendación:** medir con volumen representativo y `EXPLAIN (ANALYZE, BUFFERS)` antes de añadir índices; priorizar FK presentes en borrados y paneles.
- **Validación posterior:** comparar planes y latencia p95 con datos sintéticos representativos.
- **Limpieza:** introspección de solo lectura.

## Matriz de cobertura

Leyenda: **P** permitido y verificado; **D** denegado y verificado; **F** fallo confirmado; **S** revisión estática/sospecha; `—` no aplica.

| Recurso/flujo | Anónimo | Admin | Pro asignado | Pro no asignado | Paciente propio | Otro paciente | Inactivo con JWT | Service/cron |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Perfil/datos de salud | D | P | P | D | P | D | **F** | P fixture |
| Altas/invitaciones/bajas | D | P | P paciente | D profesional | — | — | D en RPC sensible | — |
| Asignaciones de cuidado | D | P | D apropiación | D | lectura propia | D | cierre automático pro | — |
| Catálogo de ejercicios | D | P | P alta / **F** edición | P alta | D escritura | D | **F** alta | P fixture |
| Plantillas/reglas | D | P | lectura | lectura | D | D | no aislado en lectura | — |
| Commit/copia rutina | D | P | **F** bypass | D | D escritura | D | denegado por RPC | — |
| Sesiones/logs | D | lectura | lectura | D | P | D | no probado directo | evaluación interna P |
| Tamizaje/asistencia | D | P | P / **F** autoría | D | lectura | D | no probado | — |
| Alertas | D | P | P asignado | D | D | D | no probado | P generador |
| Planes/membresías | D | P / **F** semántica | lectura asignada | D sensible | lectura propia | D | no probado | P revisión |
| Storage | lectura pública | P | P / **F** propiedad | P / **F** propiedad | D escritura | — | **F** escritura | — |
| Cron HTTP | 401 | vía secreto | 401 sin secreto | 401 | 401 | 401 | 401 | P / **F** validación y correo |

## Cobertura de sesiones, alertas y concurrencia sin hallazgo nuevo

- Dos inicios simultáneos devolvieron la misma sesión; el índice parcial impidió duplicados.
- La fecha se derivó correctamente como `2026-09-06` en America/Bogota.
- Pain/effort/set/reps/peso/zona/skip/reemplazo fuera de rango fueron rechazados por DB.
- El trigger sustituyó ejercicio y prescripción falsificados por el snapshot real.
- Dos upserts concurrentes conservaron una sola fila; carrera log final/cierre mantuvo la invariantes: en una pasada cerró con 3 logs y en otra quedó `in_progress` con error de cierre, nunca cerró incompleta.
- Sesión cerrada/abandonada no reabre; log cerrado no cambia; ítem con historia no se borra; cambios posteriores de rutina no alteran el snapshot.
- Tres sesiones con dolor alto produjeron alertas para ambos profesionales asignados y admin; paciente y profesional no asignado vieron 0; se contaron sesiones distintas.

## Suites heredadas y alcance real

Se ejecutaron solo las suites puras/estáticas seguras. Las suites integradas del repositorio fijan `supabase_db_plataforma-fisio-training`, usuarios `@demo.local`, puertos 54321/54322 o modifican umbrales globales. No se ejecutaron contra el checkout compartido. Sus escenarios importantes se reescribieron en baterías aisladas con UUIDs y prefijo propio.

Se intentó una vez `npm run test:routines`: la API apuntó al entorno aislado, pero el helper SQL al contenedor compartido. Falló en el primer cruce por FK; se verificó que no creó filas compartidas. Los 5 usuarios aislados alcanzados por GoTrue se registraron por UUID, se borraron exactamente y se comprobó 0. Este intento no cuenta como validación funcional.

Limitaciones declaradas:

- No hubo navegador visual ni dispositivo real: el alcance fue backend/HTTP.
- No se midió rendimiento con volumen semejante a producción; BACK-014 es riesgo, no latencia demostrada.
- No se forzó una intercalación determinista en los reordenamientos; BACK-013 permanece sospecha.
- No se probaron servicios remotos, SMTP real, Railway ni Supabase cloud.

## Limpieza y estado final

- Base aislada: 0 usuarios, perfiles, registros de invitación, asignaciones, ejercicios custom, rutinas, sesiones, logs, tamizajes, asistencias, alertas, planes, servicios, membresías, avisos y objetos Storage.
- Trigger transitorio de fallo: 0 restante.
- Mailpit: 0 mensajes tras borrar los 8 generados en el entorno inicialmente vacío.
- `alert_settings` restaurado exactamente a 7/3/14/3/4/50 según cada clave.
- Cron local conserva `review-membership-expiry`, `0 13 * * *`, activo.
- No se modificó código de aplicación, migración, seed ni configuración del checkout compartido; no hubo commit, push, deploy ni operación remota.
- Evidencia reproducible: `/Users/yordypardopajaro/Freelance/fisio-qa-backend-20260906T145640/qa-backend/codex-20260906T154046/`.

## Orden sugerido de corrección (no ejecutado)

1. BACK-001, BACK-002 y BACK-003: frontera de autorización y decisión clínica.
2. BACK-007 y BACK-009: integridad de contenido y entrega recuperable.
3. BACK-005 y BACK-004: invariantes persistentes y auditoría.
4. BACK-006, BACK-011 y BACK-012: cerrar contradicciones/funcionalidad comprometida.
5. BACK-010, BACK-013 y BACK-014: robustez, atomicidad y capacidad.
