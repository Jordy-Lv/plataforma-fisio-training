Rediseño de las pantallas de acceso, aprobado sobre maqueta el 2026-10-03. El detalle de cada
cambio está en [`docs/17-registro-de-cambios-frontend.md`](../../../docs/17-registro-de-cambios-frontend.md).

## 1. Implementación

- [x] 1.1 Token `--brand-bright` / `--brand-bright-foreground` en `app/globals.css` (compartido: avisar en el PR).
- [x] 1.2 `AuthBrandPanel`: panel siempre oscuro con foto atenuada y logo blanco grande y centrado; franja con logo y tema en el teléfono.
- [x] 1.3 Layout de `(auth)` con la tarjeta en alto relieve, montada sobre la franja en el teléfono.
- [x] 1.4 `AuthHeading` en `/login`, `/recuperar` y `/actualizar-contrasena`.
- [x] 1.5 `AuthForm`: «¿La olvidaste?» junto a la contraseña, «Mostrar/Ocultar» y botón en `--brand-bright`.
- [x] 1.6 «¿Aún no tienes acceso?» centrado en dos líneas.
- [x] 1.7 Mismo amarillo en claro y en oscuro dentro de las pantallas de acceso: `<main>` redefine `--brand`, `--brand-soft` y `--ring` con `--brand-bright`.
- [x] 1.8 Migas de pan «← Inicio › <pantalla>» en el panel de marca (`AuthBreadcrumb`); en el teléfono, solo «← Inicio».
- [x] 1.9 El control de mostrar la contraseña es un ojo (`Eye`/`EyeOff`) con `aria-label`, en lugar del texto «Mostrar/Ocultar».

## 2. Verificación

- [x] 2.1 `typecheck`, `lint`, `test:design` y `build` en verde.
- [x] 2.2 `test:auth:screens` (10/10), `test:people` (11/11) y `test:auth:resilience` (16/16).
- [x] 2.3 Recorrido en el navegador a 375 px y en escritorio, claro y oscuro: error de credenciales, «Mostrar», acceso correcto y contraseña nueva.
- [x] 2.4 `test:smoke` 11/11 contra `next dev` (lo que corre la CI). Destapó un contrato: el conmutador de tema tiene que ser único en la pantalla; se dejó uno solo.
- [ ] 2.5 Revisión en un teléfono real (cabe en la pasada de `docs/15` C.1).

## 3. Antes de producción

- [ ] 3.1 Licencia de la foto de fondo: sustituir `fondo-acceso.webp` por una foto propia del cliente o con licencia libre.
