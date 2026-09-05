## Context

Este slice es el más independiente de los cuatro: depende de `profiles` y
`care_assignments`, y lee `session_logs` solo para la gráfica de progresión de carga, que se
puede construir contra datos del seed sin esperar al slice 3.

Cubre lo que el negocio nombró como administrativamente esencial —el control de fechas de
ingreso y vencimiento— y lo que sustituye la hoja de cálculo de seguimiento.

## Goals / Non-Goals

**Goals:**
- Que graficar la evolución deje de ser trabajo manual.
- Que nadie caiga en mora por no enterarse: aviso antes del vencimiento.
- Que la asistencia quede registrada de forma que sustente una conversación con el cliente.

**Non-Goals:**
- Procesar pagos. Wompi es Etapa 3; aquí solo se registra el control administrativo.
- Facturación, recibos o contabilidad.
- Notificaciones push. El aviso es dentro de la aplicación y por correo.
- Planes por número de sesiones consumidas. Se registra asistencia y se registra membresía;
  cruzarlas automáticamente es Etapa 2.

## Decisions

### El IMC es una columna generada

`bmi` se calcula en la base de datos a partir de peso y talla, no en la aplicación. Así no
existe la posibilidad de que dos vistas muestren valores distintos por calcularlo de forma
diferente.

### El job de vencimientos vive en `pg_cron`

Una tarea diaria dentro de Postgres invoca una ruta interna protegida por secreto
compartido, que marca estados y genera avisos.

Alternativa descartada: un worker o un servicio de cron externo. Sería otro servicio que
desplegar, vigilar y pagar para ejecutar una consulta al día. `pg_cron` ya está en la base
de datos que tenemos.

El secreto compartido es necesario porque la ruta cambia datos: sin él, cualquiera podría
invocarla.

### La revisión diaria es idempotente

Ejecutarla dos veces el mismo día no genera avisos duplicados: se comprueba si ya existe un
aviso para ese vencimiento antes de crear otro.

Por qué: durante la demo el job se va a ejecutar a mano varias veces para mostrarlo
funcionando. Si cada ejecución generara un aviso nuevo, la bandeja quedaría llena de
duplicados justo delante del cliente.

### Las gráficas se calculan en el servidor

Los datos llegan al componente ya agregados y ordenados; Recharts solo dibuja. En un
teléfono de gama media, agregar en el cliente es trabajo innecesario.

### El estado vacío es parte del diseño, no un caso límite

Con un solo tamizaje se muestra el valor y se explica que hace falta un segundo. Es la
situación normal de todo paciente nuevo, y es lo que el cliente va a ver primero en la
demostración: una gráfica vacía o un error ahí es una mala primera impresión evitable.

## Risks / Trade-offs

**`pg_cron` no está disponible o no se puede habilitar** → Se comprueba el día 3, no el día
10. Si no estuviera, la alternativa es una acción manual desde el panel de administración,
que además hay que tener igualmente para poder demostrarlo.

**Los correos de aviso caen en spam** → Para la demo basta con que el aviso se vea en la
aplicación; el correo es refuerzo. No se construye nada que dependa de que el correo llegue.

**Las gráficas quedan pobres con datos de demostración escasos** → Los datos de
demostración del día 10 incluyen pacientes con tres o cuatro tamizajes y varias semanas de
sesiones, para que las gráficas tengan forma real.

**Cruzar asistencia con planes por sesiones** → Está fuera de alcance y hay que decirlo
explícitamente al cliente si lo pregunta durante la demostración.
