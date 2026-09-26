# Design

## Context

- `app/(progress)/offer/page.tsx` es un Server Component que lee `listActivePlans` y
  `listActiveServiceGroups` y pinta todo dentro de `<section className="max-w-3xl">`. Cada
  plan es un `<li>` con `cardVariants()` (relleno grande) apilado en `grid sm:grid-cols-2`;
  cada servicio es otro `<li>` con `cardVariants()`.
- La barra de filtros sale de `ListFilters` (`components/ui/`). **En paralelo**, el change
  `compact-memberships-view` (rama `feat/compact-memberships-view`) está reescribiendo
  `ListFilters`, `FilterForm` y `/attendance`. Este change no puede tocar esos archivos ni
  la llamada a `<ListFilters …>` de `/offer`.
- `test:plans` lee `/offer` como texto: nombres de planes y servicios, `90.000`, `47.000`, y
  la ausencia de lo inactivo. `test:smoke` solo exige que la página cargue para el paciente.
- `test:design` prohíbe colores literales y tipografías escritas a mano, y exige estados de
  carga y error por grupo de rutas.
- Iconos: `lucide-react` ya es dependencia.

## Goals / Non-Goals

**Goals:**

- A 375 px, que los tres planes quepan en la altura de uno y que los servicios ocupen la
  mitad de lo que ocupan hoy.
- Todo el cambio dentro de `app/(progress)/offer/` y `components/progress/`.

**Non-Goals:**

- La barra de filtros (lo resuelve `compact-memberships-view`).
- Botones de contratar, destacados («el más popular»), imágenes o comparadores: no están en
  `docs/00-contexto-y-alcance.md`.
- La pestaña «Planes» (`/plans`, administración) y cualquier consulta o esquema.

## Decisions

### 1. Planes: fila con `scroll-snap` en móvil, rejilla desde `sm`

`<ul aria-label="Planes de suscripción">` con
`flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3`,
y cada `<li>` con `basis-[85%] shrink-0 snap-start sm:basis-auto`. El 15 % que se asoma
indica que hay más sin añadir flechas ni puntos.

- Es CSS puro: sin `"use client"`, sin dependencia de carrusel, y el HTML del servidor
  sigue conteniendo todos los planes (lo que lee `test:plans`).
- Accesibilidad: el contenedor desplazable lleva `tabIndex={0}` y un `role="region"` con
  `aria-label` para poder enfocarlo y moverlo con flechas.
- El margen negativo `-mx-4 px-4` deja que la fila llegue al borde de la pantalla sin
  romper el gutter; hay que comprobar que no provoca desplazamiento horizontal **de la
  página** (solo de la fila).
- Si solo hay un plan activo, el `<li>` ocupa el ancho completo (`only:basis-full`).

Alternativa descartada: plegar las características en un `<details>` por plan. Ahorra
altura, pero esconde justo lo que se viene a comparar.

### 2. Tarjeta de plan

- `cardVariants({ padding: "sm" })` (o la variante compacta que ya exista en `Card`; no se
  crea una nueva en `components/ui/`).
- Cabecera: nombre (`text-base font-semibold`) y debajo el precio como dato protagonista
  (`text-2xl font-semibold tabular-nums`) con el periodo en `text-sm text-muted-foreground`.
  `formatCurrency` y `billingPeriodSuffix` no cambian.
- Descripción: `text-sm text-muted-foreground`, sin recortar.
- Características: `<ul>` sin viñetas, cada `<li>` con `Check` de `lucide-react`
  (`aria-hidden`, `size-4`, color de token —`text-brand` o `text-primary`—) y el texto.
- Se extrae a `components/progress/OfferPlanCard.tsx` (Server Component).

### 3. Servicios: un bloque por categoría con filas divididas

Cada categoría es un `cardVariants({ padding: "sm" })` con el título de la categoría como
encabezado (`h3`) y un `<ul className="divide-y divide-border">`; cada servicio es un
`<li className="py-3 first:pt-0 last:pb-0">` con nombre y precio en `flex justify-between`
y la descripción debajo. Se extrae a `components/progress/OfferServiceGroup.tsx`.

### 4. Cabecera de la página

Descripción del `Workspace`: «Planes de suscripción y servicios que se contratan aparte.»
Separación entre secciones de `mb-10` a `mb-8`. El `<ListFilters>` queda tal cual.

## Risks / Trade-offs

- [Conflicto con `compact-memberships-view`] → Este change no toca ningún archivo de aquel;
  se trabaja en la rama `feat/compact-offer-showcase` desde `main` y, si aquel llega antes a
  `main`, se rebasa. La única zona común visual es la barra de filtros de `/offer`, que aquí
  no se modifica.
- [El desplazamiento horizontal pasa desapercibido] → La tarjeta siguiente se asoma un 15 %;
  se valida en teléfono real.
- [Desbordamiento horizontal de la página por el margen negativo] → Comprobar a 375 px que
  `document.documentElement.scrollWidth === 375`.
- [Planes con muchas características descuadran la altura de la fila] → `items-stretch`
  en la fila para que todas las tarjetas midan lo mismo.

## Migration Plan

Sin datos ni esquema: entra con el merge y se revierte con `git revert`.
