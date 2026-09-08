# Cómo ejecutar este change

Escrito para que una sesión nueva —persona o agente— pueda retomar el trabajo sin repetir la
investigación y sin romper nada. Léelo entero antes de escribir la primera línea.

---

## 1. Antes de tocar código

Lee, en este orden:

1. `CLAUDE.md` — convenciones del proyecto. Gana sobre cualquier sugerencia.
2. [`docs/11-contratos-de-las-suites-http.md`](../../../docs/11-contratos-de-las-suites-http.md)
   — **el documento decisivo**. Dieciocho suites localizan formularios por expresión regular
   sobre el HTML del servidor. Casi todo lo que puede salir mal en este change está ahí.
3. [`docs/10-sistema-de-diseno.md`](../../../docs/10-sistema-de-diseno.md) — tokens y
   componentes. Ningún color literal, ninguna tipografía a mano.
4. [`docs/adr/0008-formularios-dentro-de-dialogos.md`](../../../docs/adr/0008-formularios-dentro-de-dialogos.md)
   — por qué un formulario no se muda a un diálogo.
5. [`proposal.md`](proposal.md) y [`design.md`](design.md) de este change.
6. [`docs/14-auditoria-de-vistas.md`](../../../docs/14-auditoria-de-vistas.md) — el repaso
   pantalla por pantalla con la rúbrica. Es lo que dice **qué le falta a cada vista** y en qué
   orden. La sección 18 de `tasks.md` lo convierte en tareas.
7. La sección de [`tasks.md`](tasks.md) que vas a implementar, entera, antes de empezar.

Levanta el entorno:

```bash
npm run db:start && npm run db:reset && npm run dev
```

**Si el `next dev` va lento**, `npm run dev:turbo` (Turbopack). Solo funciona con un
`node_modules` real: en un worktree con `node_modules` como enlace simbólico hay que hacer
antes `npm install` en el propio worktree, o usar el árbol principal.

Los seeds que las suites esperan:

```bash
npm run seed:exercises && npm run seed:templates && npm run seed:rules && npm run seed:progress-demo
```

---

## 2. Una sección de `tasks.md` es un pull request

Las secciones 1–17 salen de `design.md`; la **18** salió de la auditoría del 2026-09-07 y es la
que hay que seguir en la práctica: recorre `docs/14-auditoria-de-vistas.md` por prioridad. El
orden dentro de la fase 1 (secciones 1–4) **no es negociable**: la 1 crea las piezas que
consumen las demás, la 5 crea la agregación que usa la 9, y las secciones 11 y 12 tocan las
pantallas más frágiles, así que van con los patrones ya probados.

```bash
git checkout main && git pull
git checkout -b <rama que indica la sección>
# …implementar…
npm run typecheck && npm run lint && npm run test:design && npm run build
# …y las suites que la sección nombra…
```

Marca cada casilla de `tasks.md` **en el mismo commit** que la completa, no al final.

Un pull request se abre cuando:

- Las cuatro comprobaciones de CI pasan.
- Las suites que nombra la sección pasan.
- La pantalla se ha visto en el navegador en claro y en oscuro, a 375 px y en escritorio.
- Si la sección toca filtros: se ha probado con JavaScript desactivado.

Entre secciones hay revisión. No encadenes dos sin que la anterior esté revisada: si una API
compartida no encaja, es mucho más barato corregirla con dos consumidores que con doce.

---

## 3. Las cinco reglas que evitan el 90 % de los fallos

1. **No insertes un `<form>` nuevo antes de uno que ya recorre una suite.** Gana el primero
   que contiene el marcador.
2. **Ningún formulario `GET` puede emitir `value="<uuid>"`** en `/admin`, `/pro`,
   `/templates/[id]` ni `/pro/routines/[patientId]`. Los filtros por persona van como enlaces.
3. **No renombres un botón cuyo texto sea marcador** (`Eliminar día`, `Eliminar plantilla`,
   `Añadir día`, `Terminar sesión`, `Guardar etiquetado clínico`).
4. **No añadas campos obligatorios** a un formulario que ya recorre una suite: la prueba solo
   envía los ocultos más los que ella misma pasa.
5. **No sustituyas una revalidación por un `redirect()`** en una pantalla cuya suite lee la
   respuesta del envío: el cuerpo de un 303 llega vacío.

---

## 4. Contratos de las piezas compartidas nuevas

Las APIs están decididas. Si necesitas cambiar una, dilo en el pull request en vez de
improvisar: son territorio compartido.

### `lib/shared/list-params.ts`

```ts
export const pageParam = z.coerce.number().int().min(1).max(500).catch(1);
export const searchParam = (max = 80) => /* recorta; vacío → undefined */;
export const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).optional().catch(undefined);
export const optionalId = z.string().uuid().optional().catch(undefined);

export function createListParams<S extends z.ZodObject<z.ZodRawShape>>(config: {
  path: string;      // "/exercises"
  schema: S;         // debe incluir `page: pageParam`
  pageSize: number;
}): {
  schema: S;
  pageSize: number;
  parse: (search: Record<string, string | string[] | undefined>) => z.infer<S>;
  href: (filters: z.infer<S>, overrides?: Partial<z.infer<S>>) => string;
  hasActiveFilters: (filters: z.infer<S>) => boolean;   // la página no cuenta
  empty: z.infer<S>;                                    // para «Quitar filtros»
  range: (filters: z.infer<S>) => { from: number; to: number };
  pages: (total: number) => number;                     // mínimo 1
};
```

`href` omite los valores vacíos y omite `page` cuando vale 1; `true` se serializa como `"1"`.
Todos los miembros son funciones flecha del closure: `const href = list.href` desestructurado
tiene que seguir funcionando, porque así se usa hoy.

Cada campo lleva `catch`: la URL la escribe cualquiera y un valor inválido se ignora.

### `components/ui/FilterForm.tsx` (`"use client"`)

```tsx
<FilterForm action="/exercises" label="Filtros del catálogo" debounceMs={300}>
  {/* Field, Input, Select — los mismos `name` de siempre */}
</FilterForm>
```

- Renderiza un `<form method="get" action={action}>` real, con su botón de envío.
- `onChange` en `<select>` o casilla → navega ya, con `router.push`.
- `onInput` en texto → temporizador de `debounceMs`, luego `router.replace`.
- `onSubmit` → `preventDefault`, URL desde `new FormData(form)` omitiendo vacíos,
  `router.push(url, { scroll: false })` dentro de `startTransition`.
- `aria-busy` mientras navega; `data-enhanced="true"` tras hidratar, para que el botón se
  oculte por CSS sin dejar de emitirse.
- Limpia el temporizador al desmontar.

### `components/ui/Pagination.tsx` (Server Component)

```tsx
<Pagination page={page} pages={pages} hrefFor={(p) => exercisesHref(filters, { page: p })}
            label="Páginas del catálogo" />
```

Conserva los textos `Anterior` y `Siguiente`, `rel="prev"`/`rel="next"` y el
`<p aria-live="polite">Página X de Y</p>`. Devuelve `null` con una sola página.

### Las demás

- **`Chip`** — `{ href?, children, removeLabel? }`. Con `href` es un enlace que quita ese
  filtro; sin él, una etiqueta.
- **`Skeleton`** / **`SkeletonCard`** — extraen el patrón repetido en los `loading.tsx`;
  `animate-pulse motion-reduce:animate-none`.
- **`DataList`** — `{ items: { term, value }[] }`, sustituye la lista de definición repetida
  en diez pantallas.
- **`Progress`** — sobre la primitiva de `@base-ui/react`, con texto accesible.
- **`SubmitButton`** — `{ pendingLabel, ...ButtonProps }`, con `useFormStatus`. Permite que el
  formulario siga siendo Server Component.
- **`ConfirmSubmit`** — `{ title, description?, confirmLabel?, tone?, ...ButtonProps }`. Botón
  de envío que intercepta su clic y confirma con `form.requestSubmit()`. **No envuelve la
  server action.** Sin JavaScript envía directo.
- **`FlashToast`** — `{ param, message, tone? }`. Convierte un acuse de la URL en aviso
  efímero y limpia la URL. El mensaje del servidor se conserva debajo.

### Firmas de `lib/**` que cambian

Todas con argumento opcional, para no romper a los llamantes actuales. Ninguna toca una
escritura ni el esquema.

```ts
listExercises(filters, options?: { pageSize?: number })
listTemplates(filters?)              → { templates, total, pages }
listRules(filters?)                  → { rules, total, pages }   // el orden NO se toca
listPeople(scope, filters)           // nuevo, sale de PeoplePanel.tsx
listPatientProfiles(filters)         // nuevo, sustituye tres consultas inline
patientSessions(patientId, filters?) // retira el .limit(50)
replacementExercises(muscleGroups?, limit = 200)
clinicalAlerts(filters?)             // retira el .limit(200)
listPatientsWithMonthAttendance(filters?)   // retira el mes fijo
listPatientsWithLastScreening(filters?)
listMembershipsWithPatient(filters?); listPatientsWithMembership(filters?)
listAllPlans(filters?); listAllServices(filters?)
patientOverview(patientId)           // nuevo
```

---

## 5. Cuando algo falla

| Síntoma | Causa casi segura |
|---|---|
| `No se encontró el formulario X en /ruta` | El formulario salió del HTML del servidor, o dejó de contener el marcador. Revisa si lo envolviste en un diálogo o le cambiaste el rótulo |
| `Falta el formulario de server action` | Otro formulario capturó el marcador antes. Casi siempre uno `GET` nuevo con un uuid dentro |
| Una aserción de texto falla sobre la respuesta de un envío | Cambiaste una revalidación por un `redirect()`, o envolviste el mensaje y el extractor devolvió cadena vacía |
| Una fila recién creada no aparece en la pantalla | Un filtro con valor por defecto distinto de «todas», o quedó fuera de la primera página |
| `test:design` falla | Un color literal, una tipografía a mano, una copia de `inputClass`, o un grupo de rutas sin sus estados de carga y error |
| El acuse aparece y desaparece | Un remount: una `key` que depende de los datos, o el componente que lo muestra deja de renderizarse tras la acción |

Para ver si un formulario sigue en el HTML del servidor:

```bash
curl -s localhost:3000/exercises | grep -o '<form[^>]*>'
```

**Si una suite falla, no la adaptes para que pase.** Está describiendo un contrato con el
usuario, no con el código. Cambia la interfaz, o para y consúltalo.

---

## 6. Qué está decidido y no hay que volver a discutir

- El estado del listado vive en la URL. No se sustituye por estado local.
- No se añade ninguna dependencia. Lo que falta sale de `@base-ui/react` v1.8.0.
- El orden de `/rules` es contrato con el motor: no se ofrece ordenación alternativa.
- La ficha del paciente es una banda de pestañas sobre las rutas actuales, no rutas nuevas ni
  segmentos paralelos. Las seis URLs se conservan.
- El acuse de cierre de sesión no se resuelve con `redirect()`.
- `ConfirmDialog` se queda para acciones que devuelven error; `ConfirmSubmit` es para las que
  envían un formulario.
- Reordenar reglas en un solo envío queda fuera: es trabajo de backend.

---

## 7. Cómo arrancar la sesión siguiente

Un mensaje inicial que funciona:

> Retoma el change `improve-frontend-ux`. Lee `CLAUDE.md`,
> `docs/11-contratos-de-las-suites-http.md`, el `design.md` y el `ejecucion.md` del change, e
> implementa la sección N de `tasks.md`. Una rama y un pull request para esa sección; marca
> cada casilla en el commit que la completa; no toques ninguna otra sección.

Sustituye N por la primera sección con casillas sin marcar.
