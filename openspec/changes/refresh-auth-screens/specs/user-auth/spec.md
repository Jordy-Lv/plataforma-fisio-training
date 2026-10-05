## Purpose

Que las pantallas de acceso presenten la marca del cliente y faciliten entrar a quien no
recuerda su contraseña, sin cambiar cómo se autentica nadie.

## ADDED Requirements

### Requirement: Las pantallas de acceso muestran la marca del cliente

Las pantallas de inicio de sesión, recuperación y contraseña nueva SHALL mostrar el logo del
cliente en un panel de marca oscuro, y el formulario SHALL ir en una tarjeta separada de ese
panel. En un ancho de 375 px el formulario SHALL verse sin desplazamiento horizontal.

#### Scenario: Escritorio

- **WHEN** alguien abre `/login` en una pantalla ancha
- **THEN** ve el logo del cliente en el panel de marca a un lado y el formulario en una
  tarjeta al otro

#### Scenario: Teléfono

- **WHEN** alguien abre `/login` a 375 px de ancho
- **THEN** ve el logo en una franja superior y la tarjeta del formulario debajo, sin
  desplazamiento horizontal

### Requirement: La recuperación se ofrece junto al campo de contraseña

En el inicio de sesión, el enlace a la recuperación de contraseña SHALL aparecer junto a la
etiqueta del campo de contraseña.

#### Scenario: Enlace junto a la contraseña

- **WHEN** alguien abre `/login`
- **THEN** el enlace «¿La olvidaste?» está junto a la etiqueta «Contraseña» y lleva a
  `/recuperar`

### Requirement: La contraseña escrita se puede mostrar

Todo campo de contraseña de las pantallas de acceso SHALL ofrecer un control para mostrar u
ocultar lo escrito. Ese control MUST NOT enviarse con el formulario.

#### Scenario: Mostrar y ocultar

- **WHEN** alguien escribe su contraseña y pulsa el ojo, cuyo nombre accesible es «Mostrar contraseña»
- **THEN** la contraseña se ve en claro y el control pasa a llamarse «Ocultar contraseña»

#### Scenario: El control no viaja con el formulario

- **WHEN** alguien envía el formulario de inicio de sesión
- **THEN** la petición lleva solo el correo y la contraseña
