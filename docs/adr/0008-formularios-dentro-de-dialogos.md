# ADR-0008 — Qué formularios pueden vivir dentro de un diálogo

**Estado:** Propuesta · **Fecha:** 2026-09-06

## Contexto

La fase 3 del rediseño introduce las capas: diálogo, confirmación y avisos, todas sobre
`@base-ui/react`, que ya estaba instalado. La tentación inmediata es mover a un diálogo los
formularios que hoy ocupan una pantalla propia o un bloque al final de una lista.

Hay un obstáculo que no se ve hasta que rompe la CI. Las suites de `scripts/` no usan
navegador: `scripts/helpers/auth-http.mjs` pide la página por HTTP, busca el `<form>` en el
**HTML que devuelve el servidor** con una expresión regular, le extrae los `input` ocultos
—entre ellos el `$ACTION_ID` que Next añade a un formulario cuyo `action` es una server
action— y hace el POST con ese cuerpo. Son 76 envíos repartidos en 18 suites.

Un diálogo de Base UI renderiza su contenido dentro de un portal, y un portal es
`createPortal`: no emite nada durante el render del servidor. Se midió sobre la propia
página de muestra de esta fase, con `keepMounted` activado:

```
curl -s http://localhost:3010/ui/overlays | grep -o '<form[^>]*>'   # sin resultados
```

`keepMounted` mantiene el contenido en el DOM **una vez hidratada la página**, que es útil
para conservar lo escrito en un formulario al cerrar y volver a abrir, pero no añade nada
al HTML del servidor. Un formulario mudado a un diálogo desaparece para esas pruebas, que
fallan con «No se encontró el formulario».

El segundo obstáculo es del mismo tipo: si para cerrar el diálogo al terminar se envuelve
la server action en una función de cliente (`action={async (fd) => { await guardar(fd);
cerrar(); }}`), Next deja de emitir el `$ACTION_ID` y la prueba falla en la aserción
«Falta el formulario de server action», aunque el formulario sí esté en el HTML.

## Decisión

1. **Un formulario que recorra hoy una suite de `scripts/` no se mueve dentro de un
   diálogo** durante el rediseño. Sigue en su pantalla o en su bloque, con el aspecto
   nuevo.
2. Los diálogos se usan para lo que no toca esas suites: confirmaciones destructivas,
   detalle de solo lectura, selectores, y formularios nuevos que nazcan ya en un diálogo y
   se prueben de otra forma.
3. `ConfirmDialog` confirma llamando a `onConfirm`, no envolviendo un `<form action>`: así
   ninguna confirmación arrastra el problema del `$ACTION_ID`.
4. Si más adelante hace falta mover uno de esos formularios, el cambio incluye adaptar su
   suite, no solo la pantalla.

## Alternativas consideradas

**Renderizar el popup sin portal.** Base UI solo mantiene montado el contenido de un
diálogo cerrado a través de `keepMounted` en el portal; sin portal el contenido tampoco
está en el HTML inicial, y además el popup queda sujeto al `overflow` y al `z-index` de su
contenedor.

**Dejar el `<form>` en la página y meter solo los campos en el diálogo**, asociándolos con
el atributo `form="id"`. El `<form>` aparecería en el HTML, pero sus campos no, así que la
prueba enviaría un cuerpo incompleto. Además obliga a repetir el identificador en cada
campo.

**Pasar las suites a un navegador real.** Resuelve el problema de raíz y cuesta una
dependencia nueva (Playwright), un contenedor más en CI y varios minutos por ejecución.
Está fuera del alcance del rediseño; si algún día se hace, este ADR se supera.

## Consecuencias

- Las 18 suites siguen pasando sin tocarlas, que es la condición para que el rediseño no
  bloquee la demo.
- Algunas pantallas conservarán su formulario en línea aunque un diálogo quedara más
  limpio. Es un empate aceptable: el formulario en línea funciona sin JavaScript.
- `components/ui/Dialog.tsx` deja `keepMounted` activado por defecto de todas formas: no
  ayuda al HTML del servidor, pero conserva lo escrito al cerrar y reabrir el diálogo.
