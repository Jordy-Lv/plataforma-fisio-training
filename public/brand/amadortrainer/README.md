# AmadorTrainer — originales del cliente

Nombre: **AmadorTrainer** (el logotipo lo escribe AMADORTRAINER).  
Lema: **Entrena tu mejor versión**.

Entregados por el usuario el 7 de septiembre de 2026:

- `logo-dorado-original.png`: dorado y negro sobre blanco; versión principal.
- `variantes-monocromas-original.png`: referencia con negro sobre blanco y blanco sobre negro en una misma lámina. No usar la lámina como si fuera un solo logo.
- `logo-blanco-original.png`: blanco sobre negro; versión para superficies oscuras.

Son copias byte por byte de los adjuntos, sin recortar, vectorizar, recolorear ni reconstruir. `originals.json` registra el origen y SHA-256 de cada archivo. No sobrescribir estos originales al preparar variantes de uso futuro.

El componente `ClientLogo` presenta el original completo apropiado al tema. Las rutas, el nombre y el lema se centralizan en `lib/brand/client.ts`. La interfaz usa un dorado oscuro en claro y uno luminoso en oscuro para mantener legibilidad; esos tokens son una adaptación para pantalla, no valores corporativos certificados por el cliente. No se usa el dorado como sustituto de los colores clínicos de dolor y alerta.

Los iconos pequeños de instalación requieren un recurso específico del símbolo: no se reconstruyen desde estos originales en esta entrega.
