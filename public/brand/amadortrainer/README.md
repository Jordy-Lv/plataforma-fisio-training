# AmadorTrainer — originales del cliente

Nombre: **AmadorTrainer** (el logotipo lo escribe AMADORTRAINER).  
Lema: **Entrena tu mejor versión**.

Entregados por el usuario el 7 de septiembre de 2026:

- `logo-dorado-original.png`: dorado y negro sobre blanco; versión principal.
- `variantes-monocromas-original.png`: referencia con negro sobre blanco y blanco sobre negro en una misma lámina. No usar la lámina como si fuera un solo logo.
- `logo-blanco-original.png`: blanco sobre negro; versión para superficies oscuras.

Son copias byte por byte de los adjuntos, sin recortar, vectorizar, recolorear ni reconstruir. `originals.json` registra el origen y SHA-256 de cada archivo. No sobrescribir estos originales al preparar variantes de uso futuro.

El componente `ClientLogo` presenta el original completo apropiado al tema. Las rutas, el nombre y el lema se centralizan en `lib/brand/client.ts`. La interfaz usa un dorado oscuro en claro y uno luminoso en oscuro para mantener legibilidad; esos tokens son una adaptación para pantalla, no valores corporativos certificados por el cliente. No se usa el dorado como sustituto de los colores clínicos de dolor y alerta.

`fondo-acceso.webp` no es un original del cliente: es la foto de fondo del panel de las pantallas de acceso (626 px, en gris, 9 KB). **Pendiente de licencia**: sustituirla por una foto propia del cliente o con licencia libre antes de producción (`openspec/changes/refresh-auth-screens`, tarea 3.1).

Los iconos pequeños de instalación requieren un recurso específico del símbolo: no se reconstruyen desde estos originales en esta entrega.

`simbolo-blanco.png` (174 × 145 px) es el símbolo recortado de `logo-blanco-original.png` sobre transparente; lo usa la marca de la barra del paciente como «A» de AMADOR.

**Excepción, 2026-10-03:** el favicon de la pestaña (`public/favicon.ico`, 16/32/48 px, y `public/icons/favicon-96.png`) se generó, a petición, recortando el símbolo de `logo-blanco-original.png` y colocándolo sobre un cuadrado redondeado oscuro (`#121416`, el fondo del tema oscuro). Va sobre fondo oscuro porque el blanco solo no se vería en una pestaña clara. El original no se modificó. Los iconos de instalación de la PWA (`icon.svg`, `icons/icon-*.png`, `apple-touch-icon.png`) siguen siendo los genéricos anteriores.
