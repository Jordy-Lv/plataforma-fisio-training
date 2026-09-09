# Contratos de las suites HTTP

Dieciocho suites de `scripts/` no consultan la base de datos para saber si una pantalla
funciona: **piden la página por HTTP y buscan un `<form>` dentro del HTML del servidor con
una expresión regular**. Eso convierte detalles del marcado —el orden de los formularios, el
rótulo de un botón, el `name` de un campo, una frase de confirmación— en contrato.

Ninguno de esos contratos está en el código de la aplicación. Este documento los reúne para
que nadie los rompa sin darse cuenta. **Antes de mover, envolver o reordenar un `<form>`,
busca su pantalla en la tabla de la sección 3.**

Complementa a [`docs/10-sistema-de-diseno.md`](10-sistema-de-diseno.md) (cómo se pinta) y al
[ADR-0008](adr/0008-formularios-dentro-de-dialogos.md) (por qué un formulario no puede
mudarse a un diálogo).

---

## 1. Cómo localiza un formulario cada suite

Dos implementaciones, con la misma idea.

**`httpClient().submit(route, values, marker)`** — `scripts/helpers/auth-http.mjs:66`, la usan
catorce suites:

```js
const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
  .map((m) => m[0])
  .find((value) => value.includes(marker));
assert.ok(form, `No se encontró el formulario ${marker} en ${route}`);
// …copia los <input type="hidden"> al FormData…
assert.ok(
  [...body.keys()].some((key) => key.startsWith("$ACTION_")),
  "Falta el formulario de server action",
);
```

**`formulario(html, markers)`** — copia local en `verify-catalog-templates`,
`verify-rules-panel` y `verify-routine-items`, que exige **todos** los marcadores de una lista
(`markers.every(...)`) porque en esas pantallas hay varios formularios casi iguales.

De ahí salen cuatro consecuencias que gobiernan cualquier cambio de interfaz:

1. **Gana el primero.** `find` devuelve el primer `<form>` del documento que contiene el
   marcador. Insertar un formulario nuevo *antes* de otro puede secuestrar su marcador.
2. **El formulario tiene que estar en el HTML del servidor.** Un portal no emite nada
   (ADR-0008). Un Client Component **sí** se renderiza en el servidor: la diferencia está en
   el portal, no en la directiva `"use client"`.
3. **Tiene que llevar un `$ACTION_*` oculto.** Es lo que emite Next para un
   `<form action={serverAction}>`. Un `<form method="get">` no lo lleva: si un formulario de
   filtros captura el marcador de otro, el fallo es `«Falta el formulario de server action»`,
   que no se parece en nada a la causa.
4. **Solo se copian los `<input type="hidden">`.** Los `<select>` y los campos visibles no
   viajan salvo que la prueba los pase en `values`. Un campo nuevo **obligatorio** en un
   formulario que ya recorre una suite rompe esa suite.

### Reglas prácticas

- No introduzcas un `<form>` nuevo **antes** de uno que ya recorre una suite.
- Ningún formulario `GET` (filtros, buscadores) puede emitir `value="<uuid>"` en una pantalla
  cuyo marcador sea un uuid. Los filtros por persona van como **enlaces** (`Chip` con `href`),
  nunca como `<option value="<uuid>">`.
- No renombres un botón cuyo texto sea marcador.
- No añadas campos obligatorios a un formulario ya cubierto.
- El cuerpo del POST se comprueba sobre el HTML de **la respuesta del POST**. Como
  `auth-http.mjs` usa `redirect: "manual"`, **el cuerpo de un 303 llega vacío**: sustituir una
  revalidación por un `redirect()` rompe cualquier aserción sobre esa respuesta.

---

## 2. Cómo se leen los mensajes

Tres extractores, y explican por qué `Notice` tiene la forma que tiene:

```js
const alerta = (html) => decode(html.match(/role="alert"[^>]*>([^<]*)/)?.[1] ?? "");
// en otras suites: /role="alert"[^>]*>([\s\S]*?)<\/p>/
const confirmacion = (html, texto) =>
  [...html.matchAll(/role="status"[^>]*>([^<]*)/g)].map(…).find((m) => m.includes(texto));
```

`([^<]*)` se detiene en la primera etiqueta. Por eso **un aviso sin `title` tiene que ser un
`<p>` con el texto directo dentro**: envolverlo en cualquier elemento intermedio devuelve la
cadena vacía. Ocurrió una vez y dejó trece pruebas en rojo
(`test:catalog:custom`, `test:templates`, `test:rules:panel`).

---

## 3. Marcadores por pantalla

Marcador = lo que debe contener el `<form>`. Varios marcadores en una fila significa que la
suite los exige **todos en el mismo formulario**.

### Acceso y personas

| Pantalla | Marcador | Suite |
|---|---|---|
| `/login` | `name="email"` (implícito, único formulario) | casi todas |
| `/patient/onboarding` | `name="step"` | `test:people`, `test:auth:resilience` |
| `/people` · registrar persona | `name="fullName"` | `test:people` |
| `/people` · baja de persona | **`value="<uuid de la persona>"`** | `test:people` |
| `/people/[id]` · perfil | `name="goal"` | `test:people` |
| `/people/[id]` · condición | `name="conditionId"` | `test:people` |

> `/people` es de las pantallas más frágiles del proyecto: el marcador de la baja es un uuid
> suelto. Cualquier `<select>`, `<input>` u `<option>` con `value="<uuid>"` que aparezca
> **antes** del formulario de baja —el de asignar acompañamiento tiene un `<option>` por cada
> profesional— se convierte en «el formulario» y la suite falla con «Falta el formulario de
> server action». Por eso las tarjetas van en el orden registrar → pacientes → equipo →
> asignar: las bajas quedan antes que la asignación. Los modales de `SheetModal` no usan
> portal, así que su contenido —listas y formularios— sí está en el HTML del servidor.
>
> `/admin` y `/pro` ya no montan formularios de personas: son el panorama del negocio. El
> login sigue redirigiendo el personal a `/admin` y `/pro`, y `test:people` lo comprueba.

### Catálogo

| Pantalla | Marcador | Suite |
|---|---|---|
| `/exercises/new` | `name="name"` | `test:catalog:custom` |
| `/exercises/[id]` · ficha | `name="name"` | `test:catalog:custom` |
| `/exercises/[id]` · etiquetado | texto **`Guardar etiquetado clínico`** | `test:catalog:custom` |
| `/templates/new` | `name="name"` | `test:templates` |
| `/templates/[id]` · cabecera | `name="daysPerWeek"` | `test:templates` |
| `/templates/[id]` · añadir día | texto **`Añadir día`** | `test:templates` |
| `/templates/[id]` · eliminar día | `value="<dayId>"` + texto **`Eliminar día`** | `test:templates` |
| `/templates/[id]` · añadir ejercicio | `value="<exerciseId>"` | `test:templates` |
| `/templates/[id]` · prescripción | `value="<itemId>"` + `name="targetWeight"` | `test:templates` |
| `/templates/[id]` · subir / bajar | `aria-label="Subir <nombre>"` / `aria-label="Bajar <nombre>"` | `test:templates` |
| `/templates/[id]` · activar / desactivar | `name="intent"` | `test:templates` |
| `/templates/[id]` · eliminar plantilla | texto **`Eliminar plantilla`** | `test:templates` |
| `/rules/new` | `name="name"` | `test:rules:panel` |
| `/rules/[id]` · editar | `name="name"` | `test:rules:panel` |
| `/rules/[id]` · activar / desactivar | `name="intent"` | `test:rules:panel` |
| `/rules` · mover | `value="<ruleId>"` + `value="up"` | `test:rules:panel` |

> **`Eliminar día` y `Eliminar plantilla` se localizan por el texto del botón.** Ese texto
> tiene que seguir dentro de un `<form action={serverAction}>` en el HTML del servidor: el
> patrón de confirmación tiene que respetarlo (ver §5).

### Rutinas y sesiones

| Pantalla | Marcador | Suite |
|---|---|---|
| `/pro/routines/[patientId]` · asignar | `name="patientId"`, cuerpo `{}` | `test:routines` |
| `/pro/routines/[patientId]` · prescripción | `value="<itemId>"` + `name="sets"` | `test:routines:items` |
| `/pro/routines/[patientId]` · quitar | `value="<itemId>"` + `$ACTION_`, **sin `name="sets"`** | `test:routines:items` |
| `/pro/routines/[patientId]?dia=<dayId>&q=…` · añadir | `value="<exerciseId>"` + `value="<dayId>"` | `test:routines:items` |
| `/pro/routines/[patientId]?item=<itemId>&q=…` · sustituir | `value="<exerciseId>"` + `value="<itemId>"` | `test:routines:items` |
| `/routine` · iniciar día | `value="<dayId>"` | `test:routines:sessions` |
| `/routine/sessions/[id]` · registrar | `name="itemId"` | `test:routines:sessions` |
| `/routine/sessions/[id]` · cerrar | texto **`Terminar sesión`** | `test:routines:sessions` |
| `/pro/alerts` · marcar leída | `value="<alertId>"` | `test:routines:sessions` |

> **`?dia=` y `?item=` son contrato, no detalle.** `test:routines:items` abre literalmente
> `/pro/routines/<id>?dia=<dayId>&q=<texto>` y `?item=<itemId>&q=<texto>`, y espera encontrar
> ahí el formulario de añadir o de sustituir. Un rediseño del buscador **debe seguir
> respondiendo a esas dos URLs con el formulario correspondiente**.

> **El formulario de quitar tiene que ser el primero del ítem**, porque su marcador
> (`value="<itemId>"` + `$ACTION_`) también lo cumpliría el de la prescripción. La prueba lo
> confirma con `assert.equal(body.get("sets"), null)`.

> **`/pro/alerts` sin filtros tiene que mostrar la alerta recién creada.** La suite la busca
> por `value="<alertId>"` y comprueba además que la tercera sesión del camino 5 aparece. Con
> paginación: orden `created_at desc`, filtro por defecto «todas» y página de 20 o más.
>
> Esa tercera sesión se lee por el **texto de la nota**, no por un formulario. Desde 15.3 vive
> dentro de un diálogo, y por eso ese diálogo no puede usar portal ni montarse al abrirse: ver
> §5, «Leer un detalle en un diálogo sin perder lo que lee una suite».

> **En `/routine/sessions/[id]` el formulario de cierre va ahora antes que los de registro**:
> desde 8.2 vive en la banda de avance, en lo alto de la pantalla. No hay conflicto —los
> marcadores son el texto `Terminar sesión` y `name="itemId"`, y ninguno de los dos formularios
> cumple el del otro—, pero es un orden que conviene no volver a mover a ciegas.

### Seguimiento

| Pantalla | Marcador | Suite |
|---|---|---|
| `/attendance/[patientId]` | `name="attendedOn"` | `test:attendance` |
| `/screenings/[patientId]` | `name="takenOn"` | `test:screenings` |

---

## 4. Frases y marcado exigidos

Además de los formularios, hay texto y HTML que las suites leen literalmente.

### Estructura

| Exigencia | Dónde | Suite |
|---|---|---|
| `<h2 class="text-base font-semibold leading-6">` **literal**, sin ningún atributo antes de `class`, seguido de `<a href="/exercises/…">` | `components/catalog/ExerciseCard.tsx` | `test:catalog` |
| `N ejercicios encontrados` | `/exercises` | `test:catalog` |
| `aria-label="Páginas del catálogo"` y el texto `Siguiente` | `/exercises` | `test:catalog` |
| `Ningún ejercicio coincide con estos filtros` y `Ver todo el catálogo` | `/exercises` sin resultados | `test:catalog` |
| `<option value="weight"…>Peso</option>` y `<option value="bmi"…>IMC</option>` | `/evolution/[id]` | `test:evolution` |
| La cadena `recharts` aparece con datos y **no** aparece sin datos | `/evolution/[id]` | `test:evolution` |
| `data-user="anonymous"` | portada sin sesión | `test:auth` |
| Un solo formulario de cerrar sesión por documento | todo el shell | `test:auth:screens` |

> `<CardTitle>` emite `data-slot` **antes** de `class`, así que **no se puede usar en la
> tarjeta del catálogo**. Es la excepción documentada al «usa el componente compartido».

### Frases de confirmación y de error

Se leen dentro de `role="status"` o `role="alert"`. Cambiar la redacción rompe la suite:

- Catálogo: `Ejercicio actualizado`, `Etiquetado clínico guardado`, `ya no tiene contraindicaciones`, `imagen o un GIF`, `grupo muscular`, `vocabulario clínico`, `Ejercicio propio del negocio`.
- Plantillas: `Día 1 añadido`, `Día 2 añadido`, `Día eliminado`, `Ejercicio añadido al día`, `Ejercicio subido`, `Ejercicio bajado`, `Plantilla activada`, `Plantilla desactivada`, `no tiene ningún día`, `día 1 no tiene ejercicios`, `menos de 3 ejercicios`, `entre 1 y 7`, `series deben ser un número entre 1 y 12`, `Desactívala en lugar de eliminarla`.
- Reglas: `Esta regla no se está aplicando`, `condiciones no son válidas y el motor la ignora`, `criterios que ya no existen: mood`, `objetivo que no está en la lista`.
- Personas: `Persona dada de baja.`, `Confirma la baja para continuar.`, `Perfil actualizado.`, `Condición guardada.`, `Selecciona tu objetivo.`, `Parte del cuerpo inválida.`, `no ha creado ningún paciente`.
- Rutinas: `Rutina asignada. El paciente ya puede consultarla`, `Ejercicio ajustado para este paciente.`, `Ejercicio quitado de la rutina. La plantilla de origen no cambia.`, `Ejercicio añadido al final del día.`, `Ejercicio sustituido. Conserva su posición y su prescripción.`, `contraindicado para Rodilla`, `Sustitúyelo por otro`.
- Sesiones: `Registro guardado`, `Hecho … guardado`, `Terminar sesión`, `Sesión completada|Completada`, `Real:`, `Tu profesional está preparando tu rutina`.
- Seguimiento: `Asistencia registrada.`, `Ese paciente ya tiene la asistencia registrada ese día.`, `has venido` en `/attendance/me`; `Plan …`, `Vencimiento`, `por vencer|está vencida` en `/memberships/me`; `Próximas a vencer`, `Vencidas`, `vence en 3 días` en `/memberships`.
- Acceso: `No pudimos iniciar sesión.`, `Escribe un correo válido.`, `Las contraseñas deben coincidir.`, `al menos 3 caracteres`.

### Ausencias exigidas

Tan contrato como las presencias:

- Tras cerrar una sesión, la respuesta del POST **no** puede contener `Terminar sesión`. Un
  aviso de «te quedan ejercicios sin registrar» tampoco puede contener esa cadena.
- `/routine` **no** puede mostrar `Pendiente de revisión`: la consulta usa
  `patientRoutines(actor.id, true)` y sin ese `true` se cuela una rutina en revisión.
- Tras cerrar sesión de usuario, la página **no** puede contener `Cerrar sesión`.
- `/evolution/[id]` sin datos **no** puede montar la gráfica.

---

## 5. Patrones compatibles

Recetas verificadas para necesidades que chocan de frente con lo anterior.

### Confirmar una acción destructiva sin mover el formulario

`ConfirmDialog` confirma con `onConfirm`, no envolviendo un `<form action>`: envolver la
server action en una función de cliente hace que Next deje de emitir el `$ACTION_ID`
(ADR-0008). Y dos acciones se localizan por el rótulo del botón, así que el rótulo tiene que
seguir dentro del formulario, en el HTML del servidor.

El patrón que cumple las dos cosas es un botón de envío que intercepta su propio clic:

```tsx
// El <form action={serverAction}> queda intacto, con su $ACTION_ID y su rótulo.
// Sin JavaScript no hay handler y el botón envía directo, igual que hoy.
<Button type="submit" onClick={(event) => {
  if (confirmado) return;              // deja pasar el envío real
  event.preventDefault();
  formRef.current = event.currentTarget.form;
  abrirDialogo();                      // al confirmar: form.requestSubmit()
}}>
  Eliminar plantilla
</Button>
```

`requestSubmit()` dispara el envío nativo que React intercepta con normalidad.

### Filtrar y buscar sin perder el formulario del servidor

El estado del listado vive en la URL y el control es un `<form method="get">` renderizado en
el servidor. Un componente cliente puede envolverlo para auto-enviarlo al cambiar un `<select>`
o tras un retardo al escribir: el formulario sigue en el HTML, y sin JavaScript el botón
«Aplicar filtros» lo envía como siempre.

Lo que **no** se puede hacer es emitir uuids en ese formulario dentro de `/admin`, `/pro`,
`/templates/[id]` o `/pro/routines/[patientId]`.

**Dónde sí se pueden emitir uuids, y por qué.** El peligro no son los uuids: es que el
marcador de una suite sea *un uuid cualquiera*. Cuando el marcador es un uuid **concreto**, un
uuid distinto en un formulario anterior no lo captura:

- `/pro/alerts` filtra por paciente con un `<select name="patient">` lleno de uuids. El
  marcador de «marcar leída» es `value="<alertId>"` —el uuid de la alerta—, que nunca coincide
  con el de un paciente.
- `/memberships` filtra por plan con un `<select name="plan">` lleno de uuids. Ninguna suite
  envía formularios en esa pantalla; solo lee texto.
- `/pro/sessions` elige paciente con un `<select name="patient">`, como ya hacía antes de
  tener filtros.

La regla sigue siendo la de `/people`: donde el marcador es «un uuid», no metas otro delante.

### Plegar un formulario sin que la suite lo pierda

Un `<details>` cerrado **emite igual todo su contenido** en el HTML del servidor, así que un
formulario plegado se sigue encontrando por su marcador. Es la única forma de acortar una
pantalla de edición sin tocar los contratos: un diálogo con portal no emitiría nada
(ADR-0008).

Dos límites que no son de las suites sino del navegador y del usuario:

- **No pliegues un campo obligatorio.** Si Zod lo exige y el usuario no lo ve, el error
  aparece sin origen visible; y si además lleva `required`, el navegador rechaza el envío
  apuntando a un campo que no está en pantalla. Lo obligatorio y largo se compacta —dos
  columnas—, no se esconde.
- **Cuidado con el orden.** El contenido de un `<details>` sigue contando para el «gana el
  primero» de la sección 1: plegar no lo mueve al final del documento.

Aplicado en el registro de tamizaje, `/plans`, `/memberships`, `/exercises/{new,[id]}`,
`/rules/{new,[id]}`, `/templates/[id]`, `/pro/routines/[patientId]` y `/people/[id]`.

**Al medir, cuidado con el streaming.** React difiere el contenido de un Client Component:
donde va el formulario emite `<template id="P:n">` y el marcado real viaja al final del
documento dentro de un `<div hidden id="S:n">`. Sigue estando en el HTML —por eso las suites,
que buscan con una expresión regular sobre todo el documento, lo encuentran— pero cualquier
recuento que asocie un campo con el `<details>` que lo contiene dará un resultado falso.

### Leer un detalle en un diálogo sin perder lo que lee una suite

`DetailPanel` (`components/ui/DetailDialog.tsx`) es la contraparte de lectura de `SheetModal`
y comparte con él la decisión que lo hace compatible: **no usa portal**. El contenido se
renderiza en su sitio y solo se muestra u oculta con `hidden`, así que sigue en el HTML del
servidor. Es lo que permite que la evidencia de una alerta —donde `verify-routine-sessions`
busca la nota `Camino 5: sesión 3`— viva dentro de un diálogo.

Tres reglas al usarlo:

- **`keepMounted` decide si el contenido se emite.** Con `true` (el valor por defecto) el
  detalle está siempre en el documento, que es lo que necesita cualquier texto que lea una
  suite. Con `false` se monta al abrir: solo para listados largos donde el detalle se repite
  en cada fila y nadie lo lee por HTTP.
- **Dentro no entra ningún formulario.** No es una limitación técnica —sin portal, un `<form>`
  se emitiría igual— sino la misma decisión del ADR-0008: la edición se pliega con `<details>`,
  donde se ve que existe.
- **El enlace de la fila no se sustituye, se intercepta.** El `<a href>` sigue en el HTML con
  su ruta; un envoltorio de cliente captura el clic y abre el diálogo, respetando `Cmd`/`Ctrl`,
  `Shift` y el botón central. Sin JavaScript navega como siempre. Ojo: `next/link` navega desde
  su propio `onClick` **sin mirar si alguien ya llamó a `preventDefault`**, así que el
  interceptor tiene que llamar además a `stopPropagation`.

**Y una advertencia de peso, que no es de contratos pero cuesta cara.** Las props de un
componente de cliente viajan serializadas en el documento. Pasarle el detalle —o la fila— ya
renderizado desde el servidor multiplica el peso de la página: el árbol de React de una tarjeta
pesa unas veinte veces más que los datos con los que se construye. `/exercises` pasó de 64 kB a
623 haciéndolo mal, y a 195 pasando el dato (doc 12, punto 3 quater).

### Acotar una lista sin añadir un `<form>`

El filtro por año o por mes de un historial (`components/ui/PeriodFilter.tsx`) **no es un
formulario**: el servidor pinta todas las tarjetas con un `data-year` o `data-month` y un
`<select>` de cliente oculta las que no tocan. Tres razones:

1. Un `<form method="get">` en `/screenings/[patientId]` o `/attendance/[patientId]` —cuyo
   marcador es `name="takenOn"` / `name="attendedOn"`— es exactamente el caso que produce
   «Falta el formulario de server action».
2. Sin JavaScript se ve el historial entero: el filtro solo estrecha.
3. Las tarjetas las sigue renderizando el servidor, así que los `<h3>` con la fecha y su
   orden —lo que leen `verify-progress-screenings` y `verify-progress-attendance`— no cambian.

La banda de pestañas del paciente (`components/patients/PatientTabs.tsx`) sigue la misma
idea: son enlaces, no un formulario, y el identificador del paciente viaja en el `href`,
nunca en un `value`.

### Mostrar un acuse que sobreviva a la revalidación

Si al completar la acción el componente que muestra el acuse deja de renderizarse, el acuse no
llega a verse. La salida no es un `redirect()` —vaciaría el cuerpo del POST que la suite
lee— sino **poner el mensaje en el componente que sí se renderiza después**.

Lo mismo con las claves de React: una `key` que depende de los datos remonta el componente al
guardar y descarta su `useActionState`, con el acuse dentro.

---

## 6. Cómo verificar

```bash
npm run typecheck && npm run lint && npm run test:design && npm run build
```

Y las suites de las pantallas que tocaste (`package.json` las lista todas). Necesitan Supabase
local encendido y `npm run dev` en marcha:

```bash
npm run db:reset && npm run dev
```

Para comprobar a mano que un formulario sigue en el HTML del servidor:

```bash
curl -s localhost:3000/exercises | grep -o '<form[^>]*>'
```

Si una suite falla con **«No se encontró el formulario X»**, el formulario desapareció del HTML
del servidor o dejó de contener el marcador. Si falla con **«Falta el formulario de server
action»**, otro formulario —casi siempre uno `GET` nuevo— capturó el marcador antes.
