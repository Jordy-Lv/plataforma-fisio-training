# Proposal

## Why

Quien entra a `/memberships` desde el panel de administración viene a revisar quién vence,
y a 375 px no ve ni una sola membresía en la primera pantalla: la descripción del
`Workspace`, la tarjeta «Revisión de vencimientos» —un párrafo de cuatro líneas, un botón,
un campo numérico y otro botón— y una barra de filtros con un buscador y tres desplegables
apilados, cada uno con su rótulo encima, ocupan más de dos pantallas antes de la primera
tarjeta. Los filtros de las otras ocho listas tienen el mismo problema, porque salen del
mismo `ListFilters`.

## What Changes

- **`ListFilters` compacto en todas las listas.** El buscador queda en una fila y los
  desplegables pasan a una fila que se reparte y se ajusta sola, con el rótulo **dentro**
  del control (`Estado · Todos`) en vez de encima. La barra deja de ser una tarjeta con
  relleno y pasa a ocupar, a 375 px, unas dos filas de 44 px en vez de ocho bloques
  apilados. Las nueve pantallas que lo usan lo heredan sin tocar sus páginas, salvo
  `/attendance`, cuyo campo «Mes» (`extra`) se ajusta a la nueva fila.
- **«Revisión de vencimientos» pasa a una barra de una línea.** Muestra el plazo vigente
  («Aviso con 4 días de antelación») y el botón «Revisar vencimientos ahora». El campo del
  plazo y la explicación del proceso automático se pliegan en un `<details>` «Cambiar
  plazo», cerrado por defecto.
- **Descripción de `/memberships` en una frase corta** para el administrador.
- Sin cambios de datos, de server actions, de esquema ni de rutas. Ningún texto que sea
  contrato de una suite cambia (`Próximas a vencer`, `Vencidas`, `vence en 3 días`,
  `N membresías encontradas`), ni el orden de los formularios de la pantalla.

## Capabilities

### New Capabilities

- `list-filters`: aspecto y comportamiento común de la barra de filtros de un listado —
  compacta, con rótulo accesible y objetivo táctil de 44 px— en todas las pantallas que la
  usan.

### Modified Capabilities

- `plans-and-memberships`: la revisión manual de vencimientos y el plazo de aviso se
  presentan de forma compacta y no desplazan el listado. (No hay specs principales
  archivadas en `openspec/specs/`, así que el delta se escribe como `ADDED`.)

## Impact

- `components/ui/ListFilters.tsx` y, si hace falta para el ancho del botón sin JavaScript,
  `components/ui/FilterForm.tsx`: **compartidos** (`components/ui/**`), hay que avisar al
  equipo antes de abrir el PR y pedir revisión del owner técnico.
- `app/(progress)/memberships/page.tsx`, `components/progress/MembershipNoticeDaysForm.tsx`,
  `components/progress/MembershipReviewButton.tsx` (slice 4).
- `app/(progress)/attendance/page.tsx`: solo el marcado del `extra` «Mes».
- Pantallas que heredan el cambio sin tocarse: `/plans`, `/rules`, `/templates`,
  `/pro/alerts`, `/pro/routines`, `/offer`, `/screenings`.
- `docs/10-sistema-de-diseno.md`: la fila de `ListFilters` describe el nuevo aspecto.
- Sin dependencias nuevas, sin migraciones.
