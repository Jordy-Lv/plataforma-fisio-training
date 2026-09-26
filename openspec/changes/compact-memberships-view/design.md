# Design

## Context

- `ListFilters` (`components/ui/`) envuelve un `FilterForm` en una tarjeta con relleno,
  pinta el buscador como `Field` con rótulo encima y, debajo, una rejilla
  `sm:grid-cols-2 xl:grid-cols-3` de `Field` + `Select`. A 375 px la rejilla es de una
  columna: cada desplegable suma rótulo (≈20 px) + separación + control de 48 px
  (`inputClass`, `min-h-12`). Lo usan nueve pantallas; `/attendance` le pasa un `extra`
  («Mes», `<input type="month">`) envuelto en su propio `mt-4 grid`.
- `FilterForm` emite siempre «Aplicar filtros» (`size="lg"`, `w-full` en móvil) y lo oculta
  al hidratar con `group-data-[enhanced=true]/filters:hidden`.
- En `/memberships` la tarjeta de revisión (`mb-10`) apila párrafo, `MembershipReviewButton`
  y `MembershipNoticeDaysForm`, dos `<form>` de server action que van **antes** de la barra
  de filtros. `docs/11` §1: no se introduce un `<form>` nuevo antes de uno que recorra una
  suite; ninguna suite envía formularios en `/memberships`, solo lee texto.
- La auditoría `test:design` exige que `inputClass` se defina una sola vez y prohíbe colores
  literales.

## Goals / Non-Goals

**Goals:**

- Que a 375 px la primera tarjeta de membresía aparezca en la primera o segunda pantalla.
- Que la barra compacta sea la misma en las nueve listas, sin tocar sus páginas salvo
  `/attendance`.

**Non-Goals:**

- Mover filtros a un panel lateral, una hoja modal o un botón «Filtros» que los esconda
  (un `SheetModal` con portal no emitiría el formulario en el HTML del servidor, ADR-0008).
- Cambiar parámetros de URL, `createListParams`, server actions, textos de confirmación o el
  buscador global de la cabecera.
- Rediseñar las tarjetas de membresía o el alta «Registrar una membresía».

## Decisions

### 1. Desplegable con el rótulo dentro del control

Cada `choice` se pinta como un `<label>` con aspecto de control —borde, fondo `surface`,
radio y `min-h-11`— que contiene un `<span>` con el nombre en `text-xs text-muted-foreground`
y el `<select>` sin borde propio (`border-0 bg-transparent min-h-0`, estirado a lo que queda).
Visualmente: `Estado  Todos ⌄`.

- El `<label>` que envuelve mantiene la asociación por anidamiento, igual que `Field`: el
  lector de pantalla anuncia «Estado».
- Todo el `<label>` es el objetivo táctil de 44 px; tocar el nombre también abre el control.
- Se construye con `Select` + `className` sobre `inputClass`, sin definir otra clase de
  campo (la auditoría lo impide).

Alternativas descartadas: rótulo `sr-only` con la opción vacía «Estado: todos» (se pierde el
nombre en cuanto se elige un valor: «Vencimiento» a secas es ambiguo en «Orden»); mantener
el rótulo encima pero en rejilla de dos columnas (sigue siendo alto y a 375 px los planes
largos se cortan).

### 2. Disposición: buscador en una fila, desplegables en `flex-wrap`

- La barra deja la tarjeta: `FilterForm` sin `cardVariants`, con `grid gap-2`.
- Buscador: `Input type="search"` a `min-h-11`, con el rótulo como `aria-label`/`sr-only`
  y el icono de lupa dentro; el placeholder («Escribe un nombre…») ya dice qué hace. Se
  conserva la prop `search.label` como nombre accesible.
- Desplegables: `flex flex-wrap gap-2`, cada uno `flex-1 basis-[calc(50%-0.25rem)]` en móvil
  y `sm:flex-none sm:basis-auto` en escritorio. Con tres desplegables a 375 px quedan dos
  filas (2 + 1); total ≤ 3 filas de 44 px contando el buscador.
- `extra` pasa a ser un hijo más de esa fila flexible: `/attendance` quita su envoltorio
  `mt-4 grid` y pinta «Mes» con el mismo patrón de rótulo interior.
- En escritorio (`lg`) buscador y desplegables comparten una sola fila
  (`lg:grid-cols-[minmax(16rem,1fr)_auto]`).

### 3. «Aplicar filtros» sin JavaScript

Se mantiene en `FilterForm` tal cual (se emite siempre, se oculta al hidratar), pero pasa a
`size="default"` con `min-h-11`. Es un cambio de un atributo en un componente compartido; no
cambia su texto ni su comportamiento.

### 4. Barra de revisión de vencimientos

Una `<section>` sin tarjeta, con borde inferior y `mb-6`:

```
Aviso con 4 días de antelación · Revisión diaria automática   [Revisar vencimientos ahora]
▸ Cambiar plazo
```

- A 375 px, el texto ocupa una línea y el botón pasa debajo en `flex-wrap`; en escritorio,
  todo en una línea.
- `MembershipReviewButton` conserva su `<form>`, su texto y su `FormMessage`; solo cambia el
  contenedor (`flex` en vez de `grid`).
- `MembershipNoticeDaysForm` se mueve dentro de un `<details>` «Cambiar plazo», cerrado; el
  párrafo explicativo actual se reduce a un `hint` del campo («El proceso diario marca las
  próximas a vencer y las vencidas, avisa al equipo y envía el correo al paciente»). El
  campo y el botón «Guardar plazo» quedan en una fila.
- El orden de los formularios en el HTML no cambia: revisión → plazo → filtros → edición de
  tarjetas → alta. Un `<details>` cerrado emite igual su contenido (docs/11, «Plegar un
  formulario sin que la suite lo pierda»).

### 5. Descripción del `Workspace`

Administrador: «Fechas, montos y estado de cada mensualidad. No procesa pagos.» La del
profesional no cambia.

## Risks / Trade-offs

- [Cambia el aspecto de nueve pantallas a la vez] → Recorrerlas todas a 375 px y en
  escritorio antes del PR (tarea 4), y avisar al equipo porque `components/ui/**` es
  compartido.
- [Nombres de plan largos no caben en medio ancho] → El `<select>` recorta con elipsis y el
  valor completo se ve al abrirlo; la píldora del filtro activo muestra el nombre entero.
- [El buscador pierde su rótulo visible] → El nombre accesible se conserva y el placeholder
  describe la acción; `ListFilters` sigue aceptando `search.label` para leerlo en voz alta.
- [El `<details>` esconde el plazo] → El valor vigente sigue visible en la barra; solo el
  ajuste queda plegado, y es una acción rara.

## Migration Plan

Sin datos ni esquema: se despliega con el siguiente merge y se revierte con `git revert`.
