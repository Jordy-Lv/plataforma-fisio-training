## Context

Este slice depende del slice 2 (plantillas y `evaluateRules`) y del slice 1
(`care_assignments` para la autorización). Es el más grande de los cuatro y el que
concentra lo que el cliente va a mirar en la demostración.

La restricción de fondo: la vista del paciente se usa **en un gimnasio, con el teléfono en
una mano, entre series**. Eso manda sobre cualquier consideración de elegancia en la
interfaz.

## Goals / Non-Goals

**Goals:**
- Que ajustar la rutina de un paciente sea imposible que afecte a otro.
- Que registrar dolor sea tan rápido como saltarse el paso, para que el paciente lo haga de
  verdad.
- Que una alerta explique por sí sola por qué se generó, sin que el profesional tenga que
  investigar.

**Non-Goals:**
- Actualización en tiempo real del panel del profesional (ver
  [ADR-0006](../../../docs/adr/0006-sin-realtime-en-demo.md)).
- Notificaciones push nativas. Las alertas se ven al abrir el panel.
- Modo sin conexión. Se asume conectividad; el gimnasio tiene señal y añadir sincronización
  diferida es un proyecto en sí mismo.

## Decisions

### La copia se hace en una transacción, en la base de datos

Copiar plantilla → rutina se implementa como una función de Postgres invocada desde la
server action, no como una secuencia de inserciones desde TypeScript.

Por qué: son tres tablas y decenas de filas. Si falla a medias desde la aplicación, el
paciente queda con una rutina incompleta —días sin ejercicios— y eso es peor que no tener
rutina. En la base de datos, o se copia todo o no se copia nada.

### El filtro de contraindicaciones se aplica después de copiar, no antes

Se copia la plantilla completa y luego se eliminan los ejercicios incompatibles, registrando
en la rutina qué se quitó y por qué.

Por qué: deja rastro. El profesional puede ver que a este paciente se le retiraron dos
ejercicios por su condición de rodilla, y decidir si los repone con una variante. Filtrando
antes de copiar, esa información no existiría.

### `session_logs` es la unidad de registro, no `sessions`

Una fila por ejercicio, no un documento por sesión. Las consultas que importan —dolor
repetido en el mismo ejercicio, progresión de carga de un movimiento— son consultas por
ejercicio a lo largo del tiempo.

`patient_id` se desnormaliza en `sessions` y `session_logs`: sin él, cada política de RLS
necesitaría dos joins para llegar al paciente, en la tabla que más se consulta.

### Las alertas se evalúan al escribir, no al leer

Cuando se cierra una sesión, se evalúan las condiciones de alerta para ese paciente y se
insertan las que correspondan.

Alternativa descartada: calcularlas al abrir el panel. Sería recalcular lo mismo en cada
carga, y no dejaría constancia de cuándo se detectó ni permitiría marcarlas como leídas.

Los umbrales viven en una tabla de configuración, no en constantes del código: el equipo
profesional va a querer ajustarlos durante la demo, y hacerlo con un despliegue por medio
es perder el momento.

### El registro de dolor está en el mismo paso que saltar el ejercicio

Al marcar un ejercicio como no realizado, el sistema pide el motivo en el acto: nivel de
dolor, zona y observación, en una sola pantalla.

Por qué: si el reporte de dolor es una pantalla aparte a la que hay que navegar, nadie lo
llena. Es lo que el equipo profesional describió como la funcionalidad diferencial del
producto; su valor depende por completo de que el paciente la use.

### La sesión se guarda al marcar, no al terminar

Cada marca es una escritura. No hay un botón de "guardar" que, si no se pulsa, pierda media
sesión.

## Risks / Trade-offs

**El paciente no reporta el dolor y las alertas nunca se disparan** → El motivo se pide en
el mismo paso que saltar el ejercicio, y saltar sin motivo no está permitido.

**Una alerta ruidosa hace que el profesional deje de mirar la bandeja** → Umbrales
conservadores por defecto (nivel 7, tres sesiones) y configurables. Se calibran con el
equipo durante la demo.

**La copia transaccional de la rutina es lenta con plantillas grandes** → Son decenas de
filas, no miles. Si apareciera, se mide antes de optimizar.

**Este slice depende del slice 2 y podría bloquearse** → El contrato de `evaluateRules` se
acuerda el día 3 y se trabaja contra plantillas sembradas por el seed, sin esperar al panel
de parametrización.

**Es el slice más grande y puede no llegar** → El orden de las tareas está pensado para que
lo demostrable esté antes: primero ver la rutina, luego marcarla, luego el dolor, luego las
alertas. Si algo se cae, se cae por el final.
