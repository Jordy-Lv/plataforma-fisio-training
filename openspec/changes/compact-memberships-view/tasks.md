# Tasks

## 0. Antes de tocar código

- [ ] 0.1 Avisar al equipo de que el change toca `components/ui/ListFilters.tsx` y `components/ui/FilterForm.tsx` (compartidos) y afecta a nueve listas. Verificación: mensaje enviado y owner técnico asignado como revisor del PR.

## 1. Barra de filtros compacta (`list-filters`)

- [x] 1.1 En `ListFilters`, pintar cada `choice` como `<label>` con aspecto de control (`min-h-11`) que contiene el nombre en `text-xs text-muted-foreground` y un `Select` sin borde propio (design §1), sin definir una clase de campo nueva. Verificación: `npm run test:design` pasa y, en `/memberships`, un lector de pantalla anuncia «Estado», «Plan» y «Orden».
- [x] 1.2 Quitar la tarjeta de `ListFilters`, pasar el buscador a `min-h-11` con rótulo accesible no visible y colocar los desplegables en `flex flex-wrap` (medio ancho en móvil, una fila con el buscador en `lg`) (design §2). Verificación: a 375 px `/memberships` muestra buscador + estado/plan/orden en ≤ 3 filas de controles; en escritorio, en una.
- [x] 1.3 En `FilterForm`, «Aplicar filtros» a tamaño normal con `min-h-11`, mismo texto y misma ocultación al hidratar (design §3). Verificación: con JavaScript desactivado, cambiar «Estado» y pulsar «Aplicar filtros» filtra y la URL lleva `status=`.
- [x] 1.4 En `/attendance`, quitar el envoltorio `mt-4 grid` del `extra` y pintar «Mes» con el mismo patrón de rótulo interior. Verificación: `npm run test:attendance` pasa y a 375 px el mes queda en la fila de desplegables.
- [x] 1.5 Actualizar la fila de `ListFilters` en `docs/10-sistema-de-diseno.md` con el nuevo aspecto (rótulo dentro del control, sin tarjeta). Verificación: el doc describe lo implementado.

## 2. Revisión de vencimientos compacta (`plans-and-memberships`)

- [x] 2.1 En `app/(progress)/memberships/page.tsx`, sustituir la tarjeta por una barra sin tarjeta: «Aviso con N días de antelación · Revisión diaria automática» + `MembershipReviewButton`, con `flex-wrap` (design §4). Verificación: a 375 px, texto y botón ocupan como máximo dos líneas.
- [x] 2.2 Mover `MembershipNoticeDaysForm` a un `<details>` «Cambiar plazo» cerrado, con la explicación del proceso como `hint` del campo y campo + «Guardar plazo» en una fila. Verificación: guardar 7 días actualiza el valor de la barra y el `FormMessage` sigue apareciendo.
- [x] 2.3 Ajustar `MembershipReviewButton` para que su resumen o error siga visible junto a la barra sin romper la línea. Verificación: pulsar «Revisar vencimientos ahora» muestra el resumen.
- [x] 2.4 Acortar la descripción del `Workspace` del administrador a «Fechas, montos y estado de cada mensualidad. No procesa pagos.». Verificación: la del profesional no cambia.

## 3. Contratos y comprobaciones

- [x] 3.1 Confirmar con `docs/11-contratos-de-las-suites-http.md` que el orden de los formularios de `/memberships` no cambia y que ningún texto de contrato se tocó. Verificación: `npm run test:memberships` y `npm run test:memberships:cron` pasan.
- [x] 3.2 Pasar las suites de las pantallas que heredan `ListFilters` (`test:catalog`, `test:templates`, `test:rules:panel`, `test:plans`, `test:attendance`, `test:screenings`, `test:routines`) sin adaptarlas. Verificación: todas en verde; si alguna falla, parar y describir el contrato.
- [x] 3.3 `npm run typecheck`, `npm run lint`, `npm run test:design` y `npm run build`. Verificación: los cuatro pasan.

## 4. Revisión visual

- [ ] 4.1 Recorrer a 375 px y en escritorio, en tema claro y oscuro, `/memberships` (admin y profesional), `/plans`, `/rules`, `/templates`, `/pro/alerts`, `/pro/routines`, `/offer`, `/screenings` y `/attendance`. Verificación: en `/memberships` la primera tarjeta de membresía aparece en la primera o segunda pantalla del teléfono y ningún control mide menos de 44 px; capturas antes/después en el PR.
