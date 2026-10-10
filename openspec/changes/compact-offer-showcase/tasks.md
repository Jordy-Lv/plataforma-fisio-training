# Tasks

Regla de convivencia: este change se ejecuta en paralelo con `compact-memberships-view`.
**No** se editan `components/ui/**`, `app/(progress)/memberships/**`,
`app/(progress)/attendance/**` ni la llamada a `<ListFilters …>` de `/offer`. Si una tarea
parece requerirlo, se detiene y se avisa.

## 1. Planes

- [x] 1.1 Crear `components/progress/OfferPlanCard.tsx` (Server Component) con cabecera nombre + precio protagonista, descripción y características con `Check` de `lucide-react` en color de token (design §2). Verificación: `npm run typecheck` y `npm run test:design` pasan.
- [x] 1.2 En `app/(progress)/offer/page.tsx`, pintar los planes con la fila `scroll-snap` en móvil y rejilla desde `sm`, contenedor enfocable con `role="region"` y `aria-label` (design §1). Verificación: a 375 px se ve un plan completo y el borde del siguiente; la página no se desplaza en horizontal (`scrollWidth` = 375); en escritorio, rejilla sin desplazamiento.

## 2. Servicios

- [x] 2.1 Crear `components/progress/OfferServiceGroup.tsx` con un bloque por categoría y filas `divide-y` (design §3) y usarlo en `/offer`. Verificación: una categoría con varios servicios se ve como un bloque con filas; el precio queda alineado a la derecha.

## 3. Página

- [x] 3.1 Acortar la descripción del `Workspace` a «Planes de suscripción y servicios que se contratan aparte.» y ajustar la separación entre secciones (design §4), sin tocar `<ListFilters>` ni los estados vacíos. Verificación: `git diff` no muestra cambios en la llamada a `ListFilters` ni en los `EmptyState`.

## 4. Comprobaciones

- [x] 4.1 `npm run test:plans` y `npm run test:smoke` pasan sin adaptar las suites. Si alguna falla, parar y describir el contrato roto.
- [x] 4.2 `npm run typecheck`, `npm run lint`, `npm run test:design` y `npm run build` pasan.
- [x] 4.3 Recorrer `/offer` como paciente, profesional y administrador a 375 px y en escritorio, en tema claro y oscuro, con y sin filtros, y con la oferta vacía. Verificación: capturas antes/después en el PR.

## Evidencia local

- Las seis verificaciones requeridas pasaron; las suites HTTP se ejecutaron contra esta rama en `http://localhost:3002`, sin modificarlas.
- Se revisaron 60 combinaciones en navegador: tres roles, 375/1440 px, claro/oscuro y oferta completa, categoría, un plan, filtros sin resultados y oferta vacía. Las flechas desplazan la fila enfocable; a 375 px la página mantiene `scrollWidth = 375`.
- Capturas antes/después guardadas en `/tmp/compact-offer-showcase/`, preparadas para adjuntar al PR cuando se autorice. No se abrió PR ni se hizo push. La prueba en teléfono físico sigue pendiente.
- Comprobación adicional sin JavaScript: el contenido del segmento queda en un contenedor oculto del streaming de la aplicación; el HTML conserva la lista. No se modificaron componentes compartidos para resolver ese comportamiento general.
