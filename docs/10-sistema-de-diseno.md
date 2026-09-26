# 10 — Sistema de diseño

Este documento cierra el rediseño del frontend. Describe **qué existe, dónde vive y qué no
se puede hacer** al pintar una pantalla nueva. La regla de fondo es una sola: la identidad
visual se cambia moviendo tokens en `app/globals.css`, así que ninguna pantalla decide un
color, un radio ni una tipografía por su cuenta.

Lo que sigue no es una propuesta: es lo que ya está en el código. Si algo aquí no coincide
con `components/ui/**`, gana el código y este documento está desactualizado.

---

## 1. Tokens

Todos viven en `app/globals.css`. El bloque `:root` define la paleta clara completa; el
bloque `.dark` redefine **solo** lo que cambia y nunca duplica la lista. `@theme inline`
los expone a Tailwind, que es como llegan a las clases (`bg-surface`, `text-danger`).

| Familia | Tokens | Para qué |
|---|---|---|
| Superficie | `--background`, `--surface`, `--muted`, `--foreground`, `--muted-foreground` | fondo de página, tarjetas, texto |
| Bordes | `--border`, `--border-strong` | divisor decorativo / límite de un control |
| Marca | `--brand`, `--brand-foreground`, `--brand-soft`, `--brand-soft-foreground` | acciones principales y acentos |
| Estado | `--success`, `--warning`, `--danger`, `--info` + `-foreground` + `-soft` | avisos, badges, resultados |
| Dolor | `--pain-none` … `--pain-severe` + `-soft` | la escala 0-10, el dato clínico central |
| Elevación | `--elevation-low`, `--panel-shadow`, `--elevation-high` → `shadow-low`, `shadow-panel`, `shadow-high` | profundidad |
| Gráficas | `--chart-1` … `--chart-5` | series de Recharts |

Dos decisiones que no hay que volver a discutir:

- **Dos bordes, no uno.** WCAG 1.4.11 exige 3:1 para el límite de un control, pero no para
  un divisor decorativo. `--border` es el de tarjetas y separadores; `--border-strong`
  (3,41:1) es el de campos y casillas, y `--input` apunta a él. Subir un único token
  pondría líneas oscuras alrededor de cada tarjeta.
- **El verde de marca cambia en oscuro.** `#146c5b` en claro, `#4db6a0` en oscuro (7,46:1,
  AAA). El de la paleta clara sería ilegible sobre fondo oscuro.

La escala de dolor varía **en tono y en luminosidad a la vez**, para que siga leyéndose con
daltonismo rojo-verde. Y el color nunca es el único medio: el texto siempre nombra el
estado (WCAG 1.4.1).

**Tipografía:** Figtree, autoalojada con `next/font/google` en `app/layout.tsx` y expuesta
como `--font-sans`. No hay `font-family` escrito a mano en ningún componente.

**Modo oscuro:** claro, oscuro y seguir al sistema. Un script en línea en el `<head>`
(`lib/theme/constants.ts`) aplica la clase antes del primer pintado —es lo que evita el
destello blanco al abrir la app de noche— y la preferencia persiste en `localStorage`. El
conmutador es `ThemeToggle`: lo monta el shell, y aparte la portada y las pantallas de
acceso, que no tienen shell.

---

## 2. Componentes

Todo lo compartido está en `components/ui/**` y `components/shell/**`. Ambas carpetas son
**territorio común**: avisa al equipo antes de abrir un PR que las toque.

### Estructura

| Componente | Qué resuelve |
|---|---|
| `AppShell` | Cabecera fija, barra lateral en escritorio, barra inferior en el teléfono, `ToastProvider` y conmutador de tema. `Workspace` se limita a montarlo. |
| `nav-items.ts` | Las secciones de cada rol. **Solo rutas que ese rol puede abrir de verdad**: un enlace que redirige al pulsarlo es peor que no tenerlo. Pantalla nueva ⇒ entrada nueva aquí. |
| `PageHeader` | Título, descripción y acciones de una pantalla. |
| `Card` + `CardHeader/Title/Description/Content/Footer` | La superficie de casi todo. `cardVariants` es lo que consume un `<article>` o una `<section>` que necesita conservar su etiqueta semántica. |
| `EmptyState` | El hueco que explica qué hacer. Borde discontinuo para distinguirlo de una tarjeta con contenido. |
| `SidebarNav`, `MobileNav`, `SectionTabs` | Navegación que monta `AppShell`: lista lateral en escritorio, barra inferior en el teléfono y pestañas de la sección donde estás. Son de cliente por `usePathname` (y `MobileNav`, además, por el panel «Menú»); se renderizan igual en el servidor. |
| `TabBar` | Banda de pestañas hecha de enlaces. **Sin `<form>` y sin `value="<uuid>"`** dentro: se colaría delante de los formularios que recorren las suites. A 375 px se desplaza en horizontal en vez de partirse. |
| `SectionHeader` | Título de una colección dentro de una pantalla, con su recuento y su acción («Ver todas») a la derecha. Es a una sección lo que `PageHeader` a la pantalla. |
| `DataRow` | Fila densa de 64 px (miniatura o icono, título, apoyo, chevron): la contraparte densa de `Card`. El título con su enlace lo pone quien llama, porque su marcado puede ser contrato. |
| `DataList` | Pares término–valor (`<dl>`) de una ficha. Un valor vacío se pinta «—». |
| `Carousel` | Colección que se ojea, no que se busca: crece a lo ancho con `scroll-snap`. El `overflow-x` vive en la pista; la página nunca se desplaza en horizontal. |
| `Progress` | Barra de avance sin JavaScript: el servidor entrega el ancho ya calculado. |
| `Skeleton`, `SkeletonCard` | Bloques de los `loading.tsx`. `animate-pulse` se apaga con `prefers-reduced-motion`. |

### Formularios

| Componente | Notas |
|---|---|
| `Field` | `<label>` que **envuelve** al control: no hay `htmlFor`/`id` que se puedan desincronizar. `hint` es texto de apoyo, no un error. |
| `Input`, `Select`, `Textarea`, `inputClass` | 48 px de alto. Un campo se acierta peor que un botón: hay que colocar el cursor dentro. |
| `Button` | Tamaño por defecto **44 px**, el mínimo táctil del proyecto. `sm` y `xs` solo donde el control no es el objetivo táctil principal. |
| `ButtonLink` | Navegar es un enlace, no un botón: se abre en otra pestaña con el clic central. |
| `SubmitButton` | Botón de envío que se deshabilita y cambia de rótulo (`pendingLabel`) mientras su formulario envía. Lee `useFormStatus`, así que el `<form>` no se convierte en cliente solo por el botón. Va **siempre** dentro de un `<form action>`. |
| `ConfirmSubmit` | Como `SubmitButton`, pero pide confirmación antes de enviar. Ver «`ConfirmSubmit` o `ConfirmDialog`» en Capas. |
| `Choices` (`components/auth/FormParts.tsx`) | Grupo de radios/casillas de 56 px con estado marcado. |

### Mensajes

| Componente | Cuándo |
|---|---|
| `Notice` | El mensaje **ya renderizado en el servidor**: validación, resultado de una server action, aviso al encabezar una pantalla. Cuatro tonos; `danger` usa `role="alert"` y el resto `role="status"`. `FormMessage` es `Notice` por dentro. Sin `title` es un `<p>` con el texto directo dentro (ver el recuadro de abajo). |
| `Toast` / `useToast` | El acuse **tras una interacción en el cliente**, que desaparece solo. Lo provee `AppShell`, así que cualquier pantalla con sesión puede llamar a `useToast` sin repetir el proveedor. |
| `FlashToast` | El acuse que **viaja en la URL** tras una redirección (`?nueva=1`, `?eliminada=1`): lo convierte en `Toast` y limpia el parámetro. **Acompaña** al `<p role="status">` del servidor, no lo sustituye: ese párrafo es lo accesible sin JavaScript y lo que leen las suites. No envuelve ninguna server action. |
| `Badge` | Estado de una fila o de una entidad. Los estados de negocio (membresía, severidad de alerta, estado de sesión) se traducen a un semántico: cambiar `--warning` mueve a la vez la membresía por vencer y la alerta a revisar. |

> **El aviso simple es un `<p>`, no un `<div>`.** Las suites de `scripts/` sacan el
> mensaje del HTML del servidor con dos expresiones distintas —`/role="alert"[^>]*>([^<]*)/`
> en unas y `/role="alert"[^>]*>([\s\S]*?)<\/p>/` en otras—, así que solo un párrafo con
> el rol encima y el texto directo dentro satisface a las dos. Envolver el texto en
> cualquier elemento intermedio deja a esas pruebas leyendo una cadena vacía y falla en
> `test:catalog:custom`, `test:templates` y `test:rules:panel`. Con `title` el aviso sí es
> un `<div>`, porque dentro va más de un bloque; ningún mensaje que recorra una suite lo
> usa.

### Listados

El estado de un listado —búsqueda, filtros, orden, vista y página— vive en la URL
([ADR-0011](adr/0011-estado-de-listado-en-la-url.md)) y se lee con `createListParams` de
`lib/shared/list-params.ts`.

| Componente | Notas |
|---|---|
| `ListFilters` | La barra de filtros de un listado: buscador, desplegables y, **fuera** del formulario, las píldoras que quitan cada filtro. Todo filtro nace en «Todos». Sin tarjeta: el buscador (44 px, con lupa y rótulo solo para lectores de pantalla) ocupa una fila y los desplegables se reparten en la siguiente, dos por fila a 375 px; en escritorio, todo en una. Cada desplegable lleva el rótulo **dentro** del control («Estado  Todos ⌄») con `FilterField`, que es también el patrón para un `extra` como el «Mes» de `/attendance`. |
| `FilterForm` | El `<form method="get">` de servidor que hay debajo de `ListFilters` y `CatalogPicker`, con autoenvío: desplegable al instante, texto tras 300 ms. «Aplicar filtros» (44 px) se emite siempre y se oculta al hidratar. |
| `Chip` | Filtro activo como **enlace** que lo quita. Es también la forma de filtrar por persona: un `<select>` de uuids capturaría el formulario de una suite que busca `value="<uuid>"`. |
| `Pagination` | Anterior/siguiente con enlaces; desaparece con una sola página. |
| `PeriodFilter` | Estrecha por año o mes un historial que el servidor ya pintó entero. **No es un `<form>`**: sirve en pantallas cuyo marcador es un uuid. Sin JavaScript se ve todo. |

### Componentes de dominio que se reutilizan

No son de `components/ui/**`, pero más de una pantalla depende de ellos.

| Componente | Notas |
|---|---|
| `CatalogPicker` (`components/catalog/`) | Buscador de catálogo de `/templates/[id]` y `/pro/routines/[patientId]`. Cada pantalla cablea su control de añadir en `children`. Solo emite `dia`/`item` como ocultos; ningún filtro es un uuid. |
| `PatientHeader` (`components/patients/`) | Cabecera de la ficha de un paciente: estado, membresía y condiciones. Solo lectura, sin `<form>`. |
| `PatientTabs` (`components/patients/`) | Las seis vistas de un paciente sobre `TabBar`. Sin `<form>`: no desplaza los marcadores de `test:people` ni de `test:routines`. |

### Capas

`Dialog` (hoja inferior en móvil, panel centrado desde `sm`), `AlertDialog` (no cierra al
pulsar fuera) y `ConfirmDialog` (estado pendiente, bloqueo de salida y el error dentro del
propio diálogo). Se revisan en `/ui/overlays`, que solo existe en desarrollo.

`DetailDialog` / `DetailPanel` y `SheetModal` son la excepción que **no usa portal**: el
contenido se renderiza en su sitio y solo se muestra u oculta, así que sigue en el HTML del
servidor. `DetailDialog` es de **solo lectura** (nunca un formulario dentro); `SheetModal`
resume una pantalla larga en tarjetas y **sí** admite formularios, porque emite su contenido
siempre.

**`ConfirmSubmit` o `ConfirmDialog`.** Los dos piden confirmación antes de algo que no se
deshace; se elige por cómo se ejecuta la acción:

| | `ConfirmSubmit` | `ConfirmDialog` |
|---|---|---|
| Qué es | Un `<button type="submit">` que intercepta su clic y, al confirmar, llama a `form.requestSubmit()` | Un disparador que abre el diálogo y, al confirmar, llama a `onConfirm` |
| El `<form action>` | Queda intacto, con su `$ACTION_ID` y el rótulo del botón en el HTML del servidor | No hay `<form>`: la acción se llama desde el cliente |
| Sin JavaScript | El botón envía directo | No funciona |
| El error de la acción | Lo pinta la pantalla, como cualquier envío | Se queda dentro del diálogo, que no se cierra |
| Cuándo | **Por defecto.** Siempre que el formulario lo recorra una suite de `scripts/` o deba funcionar sin JavaScript: quitar un ejercicio, eliminar un día, una plantilla o una regla, confirmar una rutina que reemplaza a la activa | Solo cuando ninguna suite envía ese formulario por HTTP y la acción devuelve un error legible sin recargar. Hoy, un único caso: eliminar un plan o servicio en `OfferControls` |

> **Límite del ADR-0008:** un formulario que hoy recorre una suite de `scripts/` **no se
> muda dentro de un diálogo**. El contenido de un portal no llega al HTML del servidor ni
> con `keepMounted`, y `auth-http.mjs` busca los `<form>` ahí. Por lo mismo,
> `ConfirmDialog` confirma con `onConfirm` y no envolviendo un `<form action>`: envolver la
> server action en una función de cliente hace que Next deje de emitir el `$ACTION_ID`.

---

## 3. Reglas al pintar una pantalla

1. **Ningún color, sombra ni tipografía literal.** Si falta un matiz, se añade un token.
2. **Móvil primero**, a 375 px, y objetivos táctiles de 44 px como mínimo. El paciente usa
   esto sudando, entre series.
3. **Los tres estados**: cargando, vacío y error. El vacío explica qué hacer; no dice «Sin
   datos». Cada grupo de rutas tiene su `loading.tsx` y su `error.tsx`, y cada segmento
   dinámico con página (`[id]`, `[patientId]`…) su propio `loading.tsx` con la forma de
   su pantalla: el del grupo dibuja una forma genérica que no se parece a una ficha.
4. **Un solo formulario de cerrar sesión por documento**: las pruebas por HTTP localizan
   los formularios por orden de aparición.
5. **El texto visible va en español**, con acentos, y el error es accionable: «El nivel de
   dolor debe estar entre 0 y 10», no «Invalid input».
6. **Antes de crear un componente**, busca si ya existe en `components/ui/**`. Antes de
   añadir una dependencia, justifícalo en el PR: el rediseño entero se hizo sin añadir
   ninguna.
7. **En el teléfono, ningún acceso directo repite la barra inferior.** Si un destino ya
   está en la barra —como entrada o como pestaña de una entrada—, no se añade como
   acceso directo en la pantalla: solo suma ruido y alarga el scroll. Los accesos
   directos móviles son para lo que la barra esconde tras «Menú». Se comprueba con
   `isInMobileBar(role, href)` de `components/shell/nav-items.ts` en vez de fijar la
   lista a mano, para que siga valiendo si el menú cambia.

---

## 4. Cómo se verifica

```bash
npm run test:design   # auditoría estática del sistema de diseño
npm run typecheck
npm run lint
npm run build
```

`npm run test:design` (`scripts/verify-design-system.test.mjs`) no levanta la aplicación:
lee los archivos y falla si aparece un color literal fuera de `app/globals.css` y
`lib/pwa/theme.ts`, una tipografía escrita a mano, una copia de `inputClass`, un grupo de
rutas sin sus estados de carga y de error o un segmento dinámico con página sin su
`loading.tsx`. Son las cinco cosas que rompen la identidad
visual sin que `typecheck` ni `lint` digan nada.

Lo que la auditoría no puede ver —contraste real, tamaño táctil, foco visible, lectura a
375 px— se revisa en el navegador, en claro y en oscuro, y en un teléfono real para las
vistas del paciente.
