# ADR-0011 — El estado de un listado vive en la URL

**Estado:** Aceptada · **Fecha:** 2026-09-25 · **Relacionada con:** ADR-0008

## Contexto

El change [`improve-frontend-ux`](../../openspec/changes/improve-frontend-ux/design.md) añadió
búsqueda, filtros, orden y paginación a los listados del personal (`/exercises`,
`/templates`, `/rules`, `/plans`, `/memberships`, `/attendance`, `/screenings`,
`/pro/alerts`, `/pro/sessions`, `/pro/routines`, `/offer`) y un buscador de catálogo dentro
de `/templates/[id]` y `/pro/routines/[patientId]`. Había que decidir dónde vive ese estado:
en la URL o en el estado local de un componente de cliente.

Dos restricciones pesaban más que la comodidad de cualquiera de las dos:

- **Las suites de `scripts/` no usan navegador.** Piden la página por HTTP y localizan los
  `<form>` por expresión regular sobre el HTML del servidor
  ([`docs/11`](../11-contratos-de-las-suites-http.md)). Un filtro que solo existiera
  después de hidratar sería invisible para ellas.
- **La pantalla tiene que funcionar sin JavaScript**, que es además lo que recorren esas
  suites.

El [ADR-0008](0008-formularios-dentro-de-dialogos.md) prohíbe mover dentro de un diálogo un
formulario que recorra una suite, porque el contenido de un portal no llega al HTML del
servidor. El autoenvío de los filtros exige un componente de cliente, y cabía la duda de si
eso era la misma trampa con otro nombre.

## Decisión

1. **El estado de un listado —búsqueda, filtros, orden, vista y página— vive en la URL.** Se
   lee en el Server Component con `createListParams` de
   [`lib/shared/list-params.ts`](../../lib/shared/list-params.ts), y cada campo lleva su
   `catch`: la URL la escribe cualquiera (un enlace viejo, un filtro que dejó de existir) y
   un valor inválido se ignora en vez de tumbar la pantalla. Los esquemas de **escritura**
   siguen siendo estrictos; esto vale solo para leer.
2. **El formulario de filtros es un `<form method="get">` renderizado en el servidor.**
   `FilterForm` (`components/ui/FilterForm.tsx`) lo envuelve y lo autoenvía: al cambiar un
   desplegable navega en el acto con `router.push`; al escribir, tras 300 ms, con
   `router.replace`, porque una pulsación no merece una entrada en el historial. El envío se
   intercepta y la URL se construye con `new FormData(form)` dentro de `startTransition`,
   así el cursor no sale del campo.
3. **El botón «Aplicar filtros» se emite siempre** y se oculta con CSS tras la hidratación
   (`data-enhanced="true"`). Sin JavaScript el botón está y funciona; con JavaScript sobra.
   No hay `<noscript>` ni renderizado condicional.
4. **Todo filtro nace en «todas».** Ningún valor por defecto puede ocultar filas: las suites
   crean una fila y la buscan justo después.
5. **Ningún formulario de filtros emite un uuid** donde una suite localiza su formulario por
   `value="<uuid>"`. Los filtros por persona van como enlaces (`Chip` con `href`) y los
   filtros de pantallas con marcador de uuid se hacen sin `<form>` (`PeriodFilter`, chips de
   `/pro/routines/[patientId]`).

### Por qué el autoenvío no es una excepción del ADR-0008

El ADR-0008 no trata de la directiva `"use client"`; trata de los **portales**. Un Client
Component se renderiza a HTML en el servidor igual que uno de servidor: `FilterForm` emite su
`<form method="get">`, sus campos y su botón en la primera respuesta, y las suites los
encuentran. Lo que no emite nada en el servidor es el contenido de un `createPortal`, y
`FilterForm` no usa ninguno.

Tampoco arrastra el segundo problema del ADR-0008: `FilterForm` no envuelve ninguna server
action, así que no hay `$ACTION_ID` que perder. Navega por GET, que es exactamente lo que
haría el navegador sin JavaScript. El autoenvío es mejora progresiva sobre un formulario que
ya funciona, no un sustituto de él; por eso cabe dentro del ADR-0008 y no necesita
excepción.

## Alternativas consideradas

**Estado local en un componente de cliente** (`useState` y filtrado en memoria). Se descartó
para los listados paginados: la URL no se comparte, el botón de retroceso no deshace un
filtro, una recarga lo pierde y, sobre todo, el filtrado solo alcanza lo que ya se pintó, así
que con paginación dejaría gente fuera de alcance. Sigue siendo correcto donde no hay
paginación ni URL que conservar: `PeopleFilter` en `/people`, congelado a propósito
(`docs/15` §D, tarea 3.3), y `PeriodFilter` sobre un historial ya pintado entero.

**Un `<form method="get">` sin autoenvío.** Funciona, y es lo que queda sin JavaScript, pero
obliga a pulsar «Aplicar filtros» tras cada cambio. El autoenvío cuesta un componente
pequeño y no cambia el HTML del servidor.

**Parámetros de búsqueda leídos en el cliente con `useSearchParams` y consultas desde el
navegador.** Llevaría las consultas al cliente del navegador, contra la regla de
[`CLAUDE.md`](../../CLAUDE.md) §5 de que el navegador no recibe filas completas de otros, y
dejaría la pantalla vacía sin JavaScript.

## Consecuencias

- Un filtro se comparte, sobrevive a una recarga y el botón de retroceso lo deshace.
- Las suites HTTP siguen encontrando los formularios de filtros y los de server action sin
  cambiar ninguna expresión regular.
- Cada pantalla con filtros declara su esquema con `createListParams`; los valores de un
  enlace viejo se ignoran en silencio en vez de lanzar un 500.
- `lib/shared/**` pasa a ser territorio compartido, como `components/ui/**`: cambiar
  `createListParams` o `FilterForm` toca los listados de tres slices (catálogo, rutinas y
  progreso)
  ([`CLAUDE.md`](../../CLAUDE.md) §3).
- El autoenvío puede sorprender a quien esperaba pulsar un botón. Se acota a desplegables,
  que son un cambio deliberado, y a texto con retardo; el foco no se mueve.
