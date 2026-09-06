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

### Formularios

| Componente | Notas |
|---|---|
| `Field` | `<label>` que **envuelve** al control: no hay `htmlFor`/`id` que se puedan desincronizar. `hint` es texto de apoyo, no un error. |
| `Input`, `Select`, `Textarea`, `inputClass` | 48 px de alto. Un campo se acierta peor que un botón: hay que colocar el cursor dentro. |
| `Button` | Tamaño por defecto **44 px**, el mínimo táctil del proyecto. `sm` y `xs` solo donde el control no es el objetivo táctil principal. |
| `ButtonLink` | Navegar es un enlace, no un botón: se abre en otra pestaña con el clic central. |
| `Choices` (`components/auth/FormParts.tsx`) | Grupo de radios/casillas de 56 px con estado marcado. |

### Mensajes

| Componente | Cuándo |
|---|---|
| `Notice` | El mensaje **ya renderizado en el servidor**: validación, resultado de una server action, aviso al encabezar una pantalla. Cuatro tonos; `danger` usa `role="alert"` y el resto `role="status"`. `FormMessage` es `Notice` por dentro. Sin `title` es un `<p>` con el texto directo dentro (ver el recuadro de abajo). |
| `Toast` / `useToast` | El acuse **tras una interacción en el cliente**, que desaparece solo. Lo provee `AppShell`, así que cualquier pantalla con sesión puede llamar a `useToast` sin repetir el proveedor. |
| `Badge` | Estado de una fila o de una entidad. Los estados de negocio (membresía, severidad de alerta, estado de sesión) se traducen a un semántico: cambiar `--warning` mueve a la vez la membresía por vencer y la alerta a revisar. |

> **El aviso simple es un `<p>`, no un `<div>`.** Las suites de `scripts/` sacan el
> mensaje del HTML del servidor con dos expresiones distintas —`/role="alert"[^>]*>([^<]*)/`
> en unas y `/role="alert"[^>]*>([\s\S]*?)<\/p>/` en otras—, así que solo un párrafo con
> el rol encima y el texto directo dentro satisface a las dos. Envolver el texto en
> cualquier elemento intermedio deja a esas pruebas leyendo una cadena vacía y falla en
> `test:catalog:custom`, `test:templates` y `test:rules:panel`. Con `title` el aviso sí es
> un `<div>`, porque dentro va más de un bloque; ningún mensaje que recorra una suite lo
> usa.

### Capas

`Dialog` (hoja inferior en móvil, panel centrado desde `sm`), `AlertDialog` (no cierra al
pulsar fuera) y `ConfirmDialog` (estado pendiente, bloqueo de salida y el error dentro del
propio diálogo). Se revisan en `/ui/overlays`, que solo existe en desarrollo.

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
   datos». Cada grupo de rutas tiene su `loading.tsx` y su `error.tsx`.
4. **Un solo formulario de cerrar sesión por documento**: las pruebas por HTTP localizan
   los formularios por orden de aparición.
5. **El texto visible va en español**, con acentos, y el error es accionable: «El nivel de
   dolor debe estar entre 0 y 10», no «Invalid input».
6. **Antes de crear un componente**, busca si ya existe en `components/ui/**`. Antes de
   añadir una dependencia, justifícalo en el PR: el rediseño entero se hizo sin añadir
   ninguna.

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
`lib/pwa/theme.ts`, una tipografía escrita a mano, una copia de `inputClass` o un grupo de
rutas sin sus estados de carga y de error. Son las tres cosas que rompen la identidad
visual sin que `typecheck` ni `lint` digan nada.

Lo que la auditoría no puede ver —contraste real, tamaño táctil, foco visible, lectura a
375 px— se revisa en el navegador, en claro y en oscuro, y en un teléfono real para las
vistas del paciente.
