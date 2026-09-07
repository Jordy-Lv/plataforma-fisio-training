## Context

Este change no añade comportamiento: reorganiza el acceso al que ya existe. Eso lo hace más
delicado de lo que parece, porque toca pantallas que dieciocho suites de `scripts/` recorren
por HTTP buscando formularios con expresiones regulares. **El riesgo no está en la lógica,
está en el marcado.**

Tres restricciones de fondo mandan sobre cualquier consideración de elegancia:

1. Las suites leen el **HTML del servidor**. Un portal no emite nada; envolver una server
   action en una función de cliente hace que Next deje de emitir el `$ACTION_ID`
   ([ADR-0008](../../../docs/adr/0008-formularios-dentro-de-dialogos.md)).
2. La vista del paciente se usa **en un gimnasio, con el teléfono en una mano, entre series**.
3. La identidad visual se cambia moviendo tokens: ninguna pantalla decide un color
   ([`docs/10-sistema-de-diseno.md`](../../../docs/10-sistema-de-diseno.md)).

El inventario completo de marcadores frágiles está en
[`docs/11-contratos-de-las-suites-http.md`](../../../docs/11-contratos-de-las-suites-http.md),
escrito como parte de este change. Es la referencia a consultar antes de tocar una pantalla.

## Goals / Non-Goals

**Goals:**

- Que encontrar a una persona, una alerta o una plantilla no dependa de recorrer una lista
  completa con la vista.
- Que el profesional pueda moverse entre las secciones de un mismo paciente sin volver a
  buscarlo.
- Que el paciente vea confirmado lo que acaba de guardar.
- Que ninguna acción destructiva ocurra de un solo clic.
- Que todo siga funcionando sin JavaScript, porque es lo que las suites ejercitan y porque es
  la línea de base honesta en un gimnasio con mala cobertura.

**Non-Goals:**

- Actualización en vivo. Sigue vigente el [ADR-0006](../../../docs/adr/0006-sin-realtime-en-demo.md).
- Reescribir los formularios con una biblioteca de formularios. Zod más server actions se
  queda.
- Añadir dependencias. `@base-ui/react` v1.8.0 aporta `Tabs`, `Progress`, `Separator`,
  `Popover` y `Tooltip`, y hoy solo se usan cuatro de sus primitivas.
- Ordenación configurable en `/rules`: el orden por prioridad es contrato con el motor de
  reglas, no una preferencia de interfaz.
- Reordenar reglas en un solo envío: necesita una server action nueva con reindexado
  transaccional, y eso es trabajo de backend. Queda propuesto, no incluido.

## Decisions

### El estado del listado vive en la URL, y el formulario sigue siendo del servidor

Un `<form method="get">` renderizado en el servidor, envuelto por un componente cliente que lo
autoenvía: al cambiar un `<select>` navega en el acto; al escribir, tras 300 ms.

Por qué así y no con estado local: la URL se comparte, el botón de retroceso funciona, el
filtro sobrevive a una recarga y —lo decisivo— **el formulario sigue en el HTML del
servidor**, que es lo que las suites necesitan y lo que hace que la pantalla funcione sin
JavaScript.

Por qué no choca con el ADR-0008: un Client Component **sí** se renderiza a HTML en el
servidor. Lo que no aparece es el contenido de un *portal*. La distinción es esa, no la
directiva `"use client"`.

El botón «Aplicar filtros» se emite siempre y se oculta con CSS tras la hidratación
(`data-enhanced="true"` sobre el formulario más `group-data-…:hidden` en el botón). Así no
hace falta `<noscript>` ni renderizado condicional: sin JavaScript el botón está y funciona;
con JavaScript sobra y desaparece.

Al escribir se navega con `router.replace` y al cambiar un desplegable con `router.push`: una
pulsación de tecla no merece una entrada en el historial, un cambio de filtro sí. El envío se
intercepta con `preventDefault` y se construye la URL desde `new FormData(form)` dentro de
`startTransition`, para que el cursor no salga del campo ni salte el desplazamiento.

### Un solo helper de parámetros, y `/exercises` no cambia de API

`lib/shared/list-params.ts` generaliza lo que hoy hace `lib/catalog/schemas.ts` para una sola
pantalla. `lib/catalog/schemas.ts` se reescribe encima **conservando sus tres exportaciones**
(`exerciseFiltersSchema`, `exercisesHref`, `hasActiveFilters`), porque tiene tres consumidores
y uno de ellos hace `exerciseFiltersSchema.parse({ q })` con un subconjunto de claves.

Cada campo conserva su `catch`: la URL la escribe cualquiera —un enlace viejo, un filtro que
dejó de existir— y un valor inválido debe ignorarse, no tumbar la pantalla.

### Todo filtro nace en «todas»

Ningún filtro nuevo puede tener un valor por defecto que oculte filas. Las suites crean una
fila y la buscan en la pantalla inmediatamente después: un estado por defecto distinto de
«todas» la escondería y el fallo parecería un problema de escritura.

Vale para el estado de las membresías, el de las plantillas, el de leídas en las alertas y el
de personas activas. `/memberships` conserva además sus tres secciones y sus rótulos: los
filtros se añaden encima y solo colapsan a una sección cuando hay un estado activo.

### Ninguna barra de filtros emite uuids donde el marcador es un uuid

En `/admin`, `/pro`, `/templates/[id]` y `/pro/routines/[patientId]` la suite localiza el
formulario por `value="<uuid>"`. Un `<form method="get">` de filtros con
`<option value="<uuid>">` que aparezca antes lo captura, y como no lleva `$ACTION_*` el fallo
es «Falta el formulario de server action»: un mensaje que no se parece a la causa.

Por eso los filtros por persona van como **enlaces** (`Chip` con `href`), nunca como
desplegable de uuids. `/pro/sessions` es la excepción: conserva su `<select name="patient">`
porque ninguna suite envía formularios en esa pantalla.

### `/rules` oculta los controles de mover cuando hay filtros

`MoveRuleForm` deshabilita sus botones con el índice dentro de la rebanada visible. Con un
filtro activo o en la página dos ese índice mentiría, y «subir» intercambiaría la regla con
otra que no está a la vista.

En vez de complicar la acción, la pantalla oculta los controles en ese caso y explica por qué:
«Quita los filtros para reordenar: el orden es el que evalúa el motor». Es honesto y no toca
`moveRule`, que además es lo que la suite envía sobre `/rules` sin filtros.

### La ficha del paciente es una banda de pestañas, no una ruta nueva

Descartadas dos alternativas:

- **Subrutas bajo `/people/[id]/…`**: duplicaría los formularios de asistencia, tamizaje y
  condiciones en dos URLs, y cualquier formulario nuevo que apareciese antes desplazaría el
  marcador `name="patientId"` que busca `test:people`.
- **Segmentos paralelos**: todos los slots se renderizan a la vez, o sea seis consultas
  pesadas en cada visita, y el estado activo acabaría igualmente en la URL.

La banda mantiene **intactas** las seis rutas —mismos formularios, mismos marcadores, mismo
orden— y les añade una cabecera y unas pestañas comunes. `/people/[id]` gana además un resumen
agregado y deja de ser un callejón sin salida. Las pestañas son enlaces del servidor: no
añaden ni un byte de JavaScript.

`PatientTabs` **no contiene ningún `<form>`**. Es la condición para no desplazar los
marcadores de `test:people` ni los de `test:routines`.

### Los dos defectos del paciente se corrigen sin tocar las acciones

**El acuse que se pierde al guardar**: la `key` de cada tarjeta incluye el registro
serializado, así que al guardar React desmonta y remonta el componente, cierra el `<details>`
y descarta el `useActionState` —justo el acuse que debía quedarse a la vista—. La corrección
es `key={item.id}`. Los datos visibles vienen de props y se actualizan solos; lo que hay en
los campos es exactamente lo que se acaba de guardar, así que no refrescarlos es correcto.

**El acuse de cierre que nadie ve**: al cerrar, el estado deja de ser `in_progress` y el
control que mostraba el mensaje se desmonta. No se puede resolver con `redirect()`: las suites
usan `redirect: "manual"` y el cuerpo de un 303 llega vacío, así que la aserción sobre la
respuesta del POST fallaría. El mensaje se mueve al componente que **sí** se renderiza tras el
cierre, el informe de la sesión. La server action no se toca.

### Confirmar sin mover el formulario

`ConfirmDialog` confirma con `onConfirm` porque envolver la server action en una función de
cliente rompe el `$ACTION_ID`. Pero dos de las seis acciones destructivas se localizan **por
el rótulo del botón** (`Eliminar día`, `Eliminar plantilla`), así que ese rótulo tiene que
seguir dentro del formulario en el HTML del servidor.

`ConfirmSubmit` resuelve las dos cosas: es un `<Button type="submit">` que intercepta su
propio clic, abre un `AlertDialog` y, al confirmar, llama a `form.requestSubmit()` —el envío
nativo, con el `$ACTION_ID` intacto—. Sin JavaScript no hay manejador y el botón envía
directo, exactamente como hoy. Ninguna suite cambia.

`ConfirmDialog` se conserva para el caso de `OfferControls`, donde la acción devuelve un error
en vez de lanzarlo. Se documenta cuándo usar cada uno.

### `useToast` entra por la puerta de los acuses en la URL

El proveedor está montado en el shell desde el rediseño y no lo usa ninguna pantalla, porque
lanzarlo desde una server action rompería el `$ACTION_ID`. `FlashToast` no envuelve ninguna
acción: lee un parámetro de la URL —`?nueva=1`, `?eliminada=1`— lo convierte en aviso efímero
y limpia la URL. El `<p role="status">` del servidor se conserva debajo, que es el estado
accesible sin JavaScript y lo que leen las suites.

### El buscador del catálogo deja de duplicarse, pero `?dia=` y `?item=` siguen respondiendo

Al construir una plantilla, añadir un ejercicio cuesta hoy tres navegaciones completas de una
página que ya renderiza la plantilla entera. Un buscador único y permanente arriba, con
paginación y un `<select name="dayId">` por resultado, lo deja en un envío.

**Pero `test:routines:items` abre literalmente `?dia=<dayId>&q=<texto>` y
`?item=<itemId>&q=<texto>`** y espera encontrar ahí los formularios de añadir y de sustituir.
Esas dos URLs siguen siendo contrato: el buscador permanente se añade, el comportamiento de
los parámetros se conserva.

## Risks / Trade-offs

- **El riesgo dominante es romper una suite por un detalle de marcado.** Mitigación: el
  documento de contratos, y correr las suites de la pantalla tocada en cada pull request, no
  solo al final de la fase.
- **`components/ui/**` y `lib/shared/**` son territorio compartido.** Este change es el aviso
  al equipo que pide la sección 3 de `CLAUDE.md`.
- **Nueve componentes compartidos nuevos** es un salto grande de superficie. Se acota
  entregando los cinco de la fase 1 primero y usándolos en varias pantallas antes de añadir
  los demás: si una API no encaja, se corrige con dos consumidores, no con doce.
- **La paginación cambia lo que se ve por defecto.** Donde antes salía todo, ahora sale una
  página. En `/pro/alerts` eso afecta a una suite que busca una alerta recién creada: hay que
  garantizar orden descendente por fecha y página de veinte o más.
- **El auto-envío puede sorprender** a quien esperaba pulsar un botón. Se acota a
  desplegables —cambio deliberado— y a texto con retardo, y el foco no se mueve.

## Migration Plan

Sin migraciones de base de datos. Cinco fases, una rama y un pull request por tanda, con
revisión en el navegador entre fases. El orden no es negociable:

1. **Filtros y listados** crea el helper y los cinco componentes que consumen las demás.
2. **Ficha del paciente** es solo navegación y agregación: riesgo bajo, valor alto, y es el
   destino de los enlaces de la fase 4.
3. **Paciente móvil** contiene los dos defectos y es la superficie con menos suites encima:
   es donde conviene estrenar `useFormStatus` y `useToast`.
4. **Edición del personal** va última porque concentra las suites más frágiles y conviene
   atacarla con los patrones ya probados.
5. **Cierre documental**.

Las fases 3.1 (los dos defectos) puede adelantarse como corrección independiente si hace falta
para una demostración.

## Open Questions

- ¿El tamaño de página de 24 del catálogo sirve para el resto de listados, o personas y
  alertas piden 20? Se decide midiendo con datos de la demostración.
- ¿Merece la pena una entrada de menú para `/evolution` una vez que la pestaña lo resuelve?
  Se deja fuera y se revisa tras la fase 2.
- La reordenación de reglas en un solo envío queda propuesta como trabajo de backend
  (`setRulePriority` con reindexado transaccional). Decidir si entra en un change posterior.
