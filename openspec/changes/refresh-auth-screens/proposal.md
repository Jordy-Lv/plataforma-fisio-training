## Why

Las pantallas de acceso son lo primero que ve el cliente y cada paciente, y hasta ahora no
transmitían la marca: el logo iba pequeño dentro de la tarjeta, el panel izquierdo era solo
texto y el enlace «Olvidé mi contraseña» quedaba debajo del botón, lejos del campo al que se
refiere. El 2026-10-03 se pidió un rediseño con identidad de AmadorTrainer, validado antes
sobre una maqueta aparte.

## What Changes

- Panel de marca oscuro, siempre oscuro, con el logo blanco del cliente grande y centrado
  sobre una foto de gimnasio atenuada (9 KB en WebP). En el teléfono se reduce a una franja
  con el logo y el conmutador de tema.
- El formulario va en una tarjeta en alto relieve (`shadow-high`) que en el teléfono se monta
  sobre la franja de marca.
- Encabezado común (`AuthHeading`) en las tres pantallas: línea de saludo, título y frase.
- «¿La olvidaste?» junto a la etiqueta de la contraseña, y botón «Mostrar/Ocultar» dentro de
  los campos de contraseña.
- Botón principal en el amarillo luminoso del logo, con un token nuevo, `--brand-bright`, en
  `app/globals.css` (compartido).
- El recuadro «¿Aún no tienes acceso?» se centra en dos líneas.
- Dentro de estas pantallas el dorado es el amarillo del logo también en tema claro (saludo,
  enlaces, foco y tema activo). Como texto pequeño sobre blanco da 2,1:1; decisión aceptada.

Sin cambios de comportamiento en la autenticación: mismas server actions, mismos esquemas de
Zod, mismos mensajes y un solo formulario por pantalla (contrato de `docs/11`).

## Capabilities

### Modified Capabilities

- `user-auth`: presentación de las pantallas de inicio de sesión, recuperación y contraseña
  nueva.

## Impact

- `app/(auth)/layout.tsx`, `login/page.tsx`, `recuperar/page.tsx`,
  `actualizar-contrasena/page.tsx`.
- `components/auth/AuthForm.tsx`, y nuevos `AuthBrandPanel.tsx` y `AuthHeading.tsx`.
- `app/globals.css` (**compartido**): `--brand-bright` y `--brand-bright-foreground`.
- `lib/brand/client.ts` y `public/brand/amadortrainer/fondo-acceso.webp`.
- Sin migraciones ni dependencias nuevas.

## Non-goals

- Acceso con Google o Facebook: no está en `docs/00-contexto-y-alcance.md`.
- Cambiar el resto de la aplicación: `--brand-bright` solo se usa aquí.
