# Proposal

## Why

La vitrina (`/offer`) la ven el paciente, el profesional y el administrador, y a 375 px
cada plan de suscripción ocupa casi una pantalla completa: nombre, precio, descripción y
una lista de viñetas en una tarjeta con mucho relleno. Con tres planes y los servicios
adicionales, comparar la oferta obliga a desplazarse cinco o seis pantallas, y cada
servicio es otra tarjeta suelta con su propio borde y relleno.

## What Changes

- **Planes en fila deslizable en el teléfono.** A 375 px los planes se muestran uno junto a
  otro en una fila con desplazamiento horizontal y ajuste por tarjeta (se asoma el
  siguiente); desde `sm` vuelven a una rejilla de dos o tres columnas.
- **Tarjeta de plan más densa.** Nombre y precio en la cabecera, precio como dato
  protagonista, descripción en una línea de apoyo y características con un icono de marca
  de verificación en lugar de viñetas.
- **Servicios agrupados en una tarjeta por categoría.** Cada servicio es una fila (nombre y
  precio a los lados, descripción debajo) separada por una línea, en vez de una tarjeta por
  servicio.
- **Descripción de la página en una frase corta.**
- Sin cambios en la barra de filtros, en las consultas, en los datos, en los precios ni en
  el formato de los importes.

## Capabilities

### New Capabilities

<!-- Ninguna. -->

### Modified Capabilities

- `plans-and-memberships`: la vitrina presenta planes y servicios de forma compacta en el
  teléfono. (No hay specs archivadas en `openspec/specs/`, así que el delta se escribe como
  `ADDED`.)

## Impact

- `app/(progress)/offer/page.tsx` (slice 4) y, si se extraen, componentes nuevos en
  `components/progress/` (por ejemplo `OfferPlanCard.tsx`, `OfferServiceGroup.tsx`).
- **No** se tocan `components/ui/**` —en particular `ListFilters` y `FilterForm`—, ni
  `/memberships`, ni `/attendance`: los está cambiando en paralelo el change
  `compact-memberships-view` (rama `feat/compact-memberships-view`). La barra de filtros de
  `/offer` se volverá compacta cuando ese change llegue a `main`.
- Suites que leen `/offer`: `test:plans` y `test:smoke`. Sin dependencias nuevas
  (`lucide-react` ya está instalado), sin migraciones.
