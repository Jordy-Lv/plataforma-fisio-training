# Frontend pendiente — `improve-frontend-ux`

Foto del 2026-09-08, tras desplegar el **PR #14** (secciones 8, 9, 14.5–14.6 y 15).
Esta es la vista consolidada de lo que queda; la fuente de verdad sigue siendo
[`tasks.md`](tasks.md), y cada casilla se marca ahí al cerrarla.

Notación: **[código]** hay que escribirlo · **[verif.]** es comprobar, medir o
correr suites.

## Entregado hasta ahora

Secciones **1, 2, 3** (salvo 3.3), **4**, **6** (salvo verificación), **8**, **9**,
**14** (salvo 14.7–14.9), **15**, **17**, **18** (salvo 18.4). Todo en `main` y
desplegado a Railway. Sin migraciones nuevas en ninguna de esas entregas.

## Orden recomendado

1. ~~**Sección 5** — la agregación primero.~~ Hecha (rama `ui/ficha-paciente`).
2. ~~**Sección 16.5** — encadena con 5.1.~~ Hecha en la misma rama.
3. **Sección 7** — corta y aislada. ← siguiente
4. **Sección 10 → 11 → 12** — la 10 monta las primitivas (`SubmitButton`,
   `FlashToast`) que consumen la 11 (`ConfirmSubmit`) y la 12 (`FlashToast`).
5. **Secciones 14.7–14.8** y **13** al final.

Esfuerzo real de código restante: 7.1 + 7.3 · sección 10 entera · sección 11
entera · 12.1 + 12.3 + 12.5 · 14.7–14.8 · 16.1 + 16.2 · 13.1–13.4.

---

## Sección 5 — Ficha del paciente: agregación y banda

Rama `ui/ficha-paciente`. Desbloquea 5.3, 5.4, 16.5 y la cabecera de
`/pro/routines/[patientId]`.

- **[código] 5.1** — Completar `lib/progress/patient-overview.ts`. Hoy
  `patientOverview` solo devuelve `week`, `streakWeeks` y `openSession` (lo que
  necesitaba la portada, 17.5). Añadir en el mismo `Promise.all`, sin ninguna
  consulta dentro de un `map`: membresía, condiciones activas, último tamizaje,
  asistencia del mes, rutina activa y alertas sin leer.
- **[código] 5.3** — `components/patients/PatientHeader.tsx`: nombre, estado,
  membresía y condiciones, reutilizando `membershipBadgeVariant`.
- **[código] 5.4** — Montar la cabecera de 5.3 en `/people/[id]` **antes** del
  contenido actual, sin mover los formularios de perfil y de condición.
- **[código] 5.5** — `app/(people)/people/[id]/loading.tsx` con la forma real de la
  ficha.
- **[verif.] 5.6** — En `/people/[id]` el primer `<form>` con `name="goal"` y el
  primero con `name="conditionId"` siguen donde los espera `test:people`.
- **[verif.] 5.7** — `npm run test:people` + los cuatro de CI.

## Sección 6 — Ficha del paciente: montaje y enlaces (casi cerrada)

- **[verif.] 6.3** — `/evolution/[patientId]` conserva
  `<option value="weight">Peso</option>` e `<option value="bmi">IMC</option>`, y la
  gráfica sigue sin montarse cuando no hay datos.
- **[verif.] 6.5** — A mano: desde cualquier sección de un paciente se llega a las
  otras cinco en un toque.
- **[verif.] 6.6** — `test:routines`, `test:routines:items`, `test:attendance`,
  `test:screenings`, `test:evolution` + CI.

## Sección 7 — Los dos defectos de la sesión del paciente

Rama `fix/sesion-acuses`. **Hecha** (salvo el repaso en navegador real de 7.2).

- **[hecho] 7.1** — `key={item.id}` en `SessionItemForm`, con el comentario que
  explica por qué no puede volver a depender del registro.
- **[hecho] 7.3** — `SessionReport` acepta `justClosed?` y pinta un `Notice`
  de éxito con el texto que devuelve `closeSession`. La pantalla del paciente lo
  pasa cuando `completed_at` (lo fija un trigger) está dentro de una ventana de
  dos minutos —sin `redirect()`, el acuse no puede ir en la URL—. De paso, la
  fecha y la hora del informe salen ya las dos de `formatDate`/`formatTime`.
- **[verif.] 7.2** — Falta el repaso en un navegador real: al guardar un
  registro el bloque sigue abierto y «Registro guardado» permanece. La suite ya
  comprueba que el POST devuelve ese texto.
- **[hecho] 7.4** — Cubierto por `test:routines:sessions` (`/Sesión completada|Completada/`
  tras el cierre y `!includes("Terminar sesión")`).
- **[hecho] 7.5** — `test:routines:sessions` 18/18 + CI en verde.

## Sección 9 — Rutina y portada del paciente

- **[verif.] 9.7** — `test:routines:sessions` y `test:auth:screens` + CI.
  *Verificado el 2026-09-08 (18/18 y 10/10 contra el build de producción); falta
  solo marcar la casilla.*

## Sección 10 — Estados pendientes y avisos

Rama `ui/estados-pendientes`.

- **[código] 10.1** — `components/ui/SubmitButton.tsx` con `useFormStatus`.
- **[código] 10.2** — Devolver al servidor los componentes que hoy son
  `"use client"` solo para deshabilitar su botón, usando 10.1.
- **[código] 10.3** — `components/ui/FlashToast.tsx`: convierte el acuse de la URL
  en aviso efímero y limpia la URL, conservando el mensaje del servidor debajo.
  *(Lo consume 12.5.)*
- **[código] 10.4** — Estado optimista al marcar una alerta como leída.
  **No generalizarlo.**
- **[verif.] 10.5** — Ninguna server action queda envuelta en una función de
  cliente.
- **[verif.] 10.6** — Las 25 suites + CI.

## Sección 11 — Confirmación de acciones destructivas

Rama `ui/confirmaciones`. Ver ADR-0008: ningún `<form>` se muda a un diálogo;
`ConfirmSubmit` intercepta el clic y confirma con `form.requestSubmit()`.

- **[código] 11.1** — `components/ui/ConfirmSubmit.tsx`: botón de envío que
  intercepta su clic, abre el diálogo y confirma con `form.requestSubmit()`,
  dejando intacto el `<form action>` y su rótulo.
- **[código] 11.2** — Quitar un ejercicio de la rutina (primer `<form>` del ítem,
  sin `name="sets"`).
- **[código] 11.3** — Quitar un ejercicio de una plantilla y eliminar un día
  (conservando el rótulo `Eliminar día`).
- **[código] 11.4** — Eliminar una plantilla (rótulo `Eliminar plantilla`).
- **[código] 11.5** — Eliminar una regla.
- **[código] 11.6** — Asignar una rutina cuando reemplaza a la activa, **sin
  añadir ningún campo obligatorio** al formulario.
- **[verif.] 11.7** — Las seis confirmaciones con JavaScript activado y
  desactivado.
- **[verif.] 11.8** — `test:templates`, `test:rules:panel`, `test:routines`,
  `test:routines:items` + CI.

## Sección 12 — Construir una plantilla sin recargar

Rama `ui/catalogo-embebido`.

- **[código] 12.1** — Buscador de catálogo único y permanente en `/templates/[id]`,
  con filtros, paginación, `pageSize` reducido y un `<select name="dayId">` por
  resultado.
- **[código] 12.3** — Mismo buscador en `/pro/routines/[patientId]`,
  **conservando el comportamiento de `?dia=` y `?item=`**, que la suite abre
  literalmente.
- **[código] 12.5** — Sustituir los acuses de la URL por `FlashToast` (10.3) en
  `/templates`, `/rules`, `/exercises` y `/plans`.
- **[verif.] 12.2** — El `<form>` de añadir sigue conteniendo
  `value="<exerciseId>"` y los de eliminar conservan sus rótulos.
- **[verif.] 12.4** — En `/pro/routines/[patientId]` el `<form>` de quitar sigue
  siendo el primero del ítem.
- **[verif.] 12.6** — `test:templates`, `test:templates:seed`,
  `test:routines:items` + CI.

## Sección 13 — Cierre

**13.1–13.4 fusionadas** en el PR #43 (2026-09-25). La 13.6 se corrió en el PR #44: 30 de
31 suites en verde, con `test:smoke` en 7/11 por KAN-19, así que sigue abierta. Queda además
la 13.5 (teléfono real). Estado vivo en `docs/15` §B.3.

- **[código] 13.1** — Añadir a `docs/10-sistema-de-diseno.md` los componentes
  nuevos y cuándo usar `ConfirmDialog` frente a `ConfirmSubmit`.
- **[código] 13.2** — Escribir `docs/adr/0011-estado-de-listado-en-la-url.md`: por
  qué el estado vive en la URL y por qué el autoenvío no es una excepción del
  ADR-0008.
- **[código] 13.3** — Declarar `lib/shared/**` como territorio compartido en la
  sección 3 de `CLAUDE.md`.
- **[código] 13.4** — Añadir a `scripts/verify-design-system.test.mjs` la
  comprobación de que todo segmento dinámico con `page.tsx` tiene su `loading.tsx`.
- **[verif.] 13.5** — Recorrer los caminos del paciente en un teléfono real y
  registrar el resultado.
- **[verif.] 13.6** — Las 25 suites en verde sobre la rama fusionada + CI.

## Sección 14 — Densidad de los listados (resto)

- **[código] 14.7** — Añadir `orden` a `exerciseList`, `templateList` y a los
  listados de seguimiento, con las claves que cada pantalla puede ordenar y **sin
  tocar** el `.order("priority")` de `/rules`.
- **[código] 14.8** — Ordenación por defecto explícita en cada listado,
  documentada en un comentario junto a su `createListParams`.
- **[verif.] 14.9** — Medir de nuevo `/exercises` y `/pro/alerts` en Chrome a
  1440×900 y 606×667 → `docs/12-medicion-de-densidad.md`.
- **[verif.] 14.10** — `test:catalog`, `test:catalog:custom`,
  `test:routines:sessions` + CI.

## Sección 16 — Llegar al paciente sin recorrer una lista

Rama `ui/acceso-directo`.

- **[código] 16.1** — `lib/auth/patient-search.ts` con
  `searchPatients(term, limit = 8)`, acotado por RLS y sin `select("*")`.
- **[código] 16.2** — Buscador de paciente en la cabecera de `AppShell` para
  `admin` y `professional`: `<form method="get">` que apunta a `/people`, con
  sugerencias tras dos caracteres y salto directo a la ficha.
- **[verif.] 16.3** — **Antes de montarlo**, verificar que el `<form>` nuevo queda
  *después* del de cerrar sesión en el HTML del servidor: `auth-http.mjs` toma el
  primer `<form>` que contiene el marcador y `AppShell` documenta que solo puede
  haber uno.
- **[hecho] 16.5** — `getStaffWorkboard` + `StaffWorkboard` montados en
  `StaffHome`: alertas sin leer, sesiones de hoy, membresías por vencer y
  tamizajes pendientes, con enlace a la pantalla de cada una. `test:overview`
  5/5, `test:people` 10/10.
- **[verif.] 16.8** — A mano: desde cualquier pantalla del personal se llega a un
  paciente escribiendo su nombre, sin pasar por ningún listado. *(Depende de
  16.2, el buscador de la cabecera.)*
- **[hecho] 16.9** — `test:people`, `test:overview` + CI, en verde.

## Pendientes a propósito

- **3.3** — Filtros por URL en `PeoplePanel`: congelado hasta que el modal
  (`SheetModal`) conserve su estado en la URL. Hoy `PeopleFilter` filtra en el
  cliente sobre `<li data-name data-specialty>` y sin JavaScript la lista se ve
  entera. Reabrir cuando el modal navegue sin cerrarse.
- **18.4** — Medir en píxeles el resto de las pantallas del punto «3 ter» de
  `docs/12-medicion-de-densidad.md`. El navegador integrado mide si se le fuerza
  un repintado antes de leer (basta una captura).
