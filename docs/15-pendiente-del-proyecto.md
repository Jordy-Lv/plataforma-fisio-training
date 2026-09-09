# Lo que falta por hacer

Foto del **2026-09-08**, tomada justo después de fusionar a `main` los PRs
[#16](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/16),
[#17](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/17) y
[#18](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/18) (`main` = `4388346`).

Este documento reúne **todo** lo que queda abierto, dentro y fuera de OpenSpec. La fuente de
verdad de cada tarea del change en curso sigue siendo su `tasks.md`, y cada casilla se marca
ahí al cerrarla; lo que aquí se añade es lo que **no vive en ningún `tasks.md`**: el estado de
la CI, del despliegue y de las herramientas.

Complementa a [`openspec/changes/improve-frontend-ux/pendiente-frontend.md`](../openspec/changes/improve-frontend-ux/pendiente-frontend.md),
que detalla sección por sección el frontend pendiente. Si los dos se contradicen, gana el
`tasks.md`.

Notación: **[código]** hay que escribirlo · **[verif.]** es comprobar, medir o correr suites ·
**[oper.]** es infraestructura o proceso, no código de la aplicación.

---

## Dónde está el proyecto

| Change de OpenSpec | Hechas | Parciales | Pendientes |
|---|---|---|---|
| `add-auth-and-roles` | 25 | — | — |
| `add-exercise-library-and-rules` | 27 | — | — |
| `add-progress-and-memberships` | 31 | — | — |
| `add-routine-execution` | 28 | — | **1** |
| `improve-frontend-ux` | 120 | 3 | **19** |

Los cuatro slices funcionales están cerrados salvo una verificación en teléfono real. Todo lo
que queda vivo es el change de frontend y un bloque de operación que nunca estuvo en ninguna
lista.

---

## A. Operación e infraestructura

Nada de esto está en un `tasks.md`, y es lo que más riesgo acumula.

### A.1 — [oper.] La CI de GitHub Actions no corre. **Prioridad alta.**

Las **40 ejecuciones** registradas desde la primera del 2026-09-05 están en
`startup_failure`, en 0 segundos, sin generar jobs, logs ni check-runs. La API devuelve
`"path": "BuildFailed"` y `gh run view` lo atribuye engañosamente al archivo del workflow.

**Ya está descartado que sea el archivo:** `.github/workflows/ci.yml` compila limpio, el
workflow figura `active` y en su ruta, Actions están habilitadas (`allowed_actions: all`) y
`.nvmrc` existe. La causa es **de facturación de la cuenta** (repositorio privado que consume
minutos del plan), confirmada por Yordy el 2026-09-08.

**Consecuencia:** donde [`CLAUDE.md`](../CLAUDE.md) §11 dice «CI los repite y bloquea el merge
si fallan», eso no ocurre. Los 18 PRs fusionados hasta hoy entraron sin ninguna verificación
automática. **La única validación real es la que se corre a mano antes de abrir el PR.**

Mientras siga así, el procedimiento obligatorio antes de cada PR es:

```bash
npm run typecheck && npm run lint && npm run test:design && npm run build
```

…más las suites HTTP de las pantallas que toque el cambio, contra un `next start` de
producción en el 3000 con Supabase local (no otro puerto: los enlaces de recuperación que
emite Supabase apuntan a `localhost:3000` y tres pruebas de `test:auth:screens` fallan si el
servidor está en otro sitio).

### A.2 — [oper.] El despliegue no está automatizado

El [ADR-0002](adr/0002-hosting-railway.md) decide desplegar por push desde GitHub, pero **eso nunca se montó**. Hoy
se despliega con `railway up`, que sube el **árbol local**, no `main`. Dos consecuencias:

- `main` y producción pueden divergir sin que nada avise. Hay que comprobar a mano que el
  árbol está limpio y sincronizado antes de cada subida.
- Cualquier archivo sin commitear que tengas en el directorio **viaja a producción**.

Al enlazar, cuidado: el workspace tiene también un proyecto `portafolio`, y un `railway link`
sin mirar lo engancha por ser el primero de la lista. El correcto es
**`plataforma-fisio-training`**, servicio `web`, entorno `production`.

### A.3 — [oper.] `railway.json` queda deprecado el 2026-12-01

Hay que migrar a `.railway/railway.ts`. El `railway config migrate` falló al intentarlo, así
que probablemente haya que escribirlo a mano. Los archivos actuales siguen funcionando hasta
esa fecha.

### A.4 — [código] `test:memberships` depende de la hora a la que la corras

`dateIn()` en [`scripts/verify-progress-memberships.test.mjs`](../scripts/verify-progress-memberships.test.mjs)
fecha los fixtures en **UTC**, mientras `daysUntil()` de
[`lib/progress/membership-vocabulary.ts`](../lib/progress/membership-vocabulary.ts) cuenta
desde el «hoy» del negocio (`America/Bogota`, UTC−5). Entre las 19:00 y las 24:00 de Bogotá el
día UTC ya avanzó y el plazo sale con un día de más: la suite **pasa por la mañana y falla de
noche**.

Es el mismo defecto que el PR #8 arregló en `verify-progress-memberships-cron.test.mjs:42`
—que sí usa `timeZone: "America/Bogota"`— y que quedó sin arreglar en esta. Arreglo de una
línea, fuera del alcance de `improve-frontend-ux`: merece su propia rama.

### A.5 — [oper.] La base local tiene un perfil admin de sobra

`Revisión AmadorTrainer` (`c0d6481a-4715-44e5-bf22-7b5a644c3c42`) no viene de
`supabase/seed.sql`. Con dos admins, el cron genera dos alertas por membresía en vez de una y
`test:memberships:cron` cuenta 4 donde espera 2. Se arregla con `npm run db:reset` o borrando
ese perfil. **No es una regresión de código**: conviene descartarlo antes de culpar a una rama.

### A.6 — [oper.] Cabos sueltos menores

- Seis directorios sin trackear en `.agents/skills/source-command-opsx-*`. Decidir si van a
  `.gitignore` o al repositorio; hoy viajan a producción en cada `railway up`.
- Aviso de lint preexistente: `appUrl` sin usar en `scripts/verify-auth-screens.test.mjs`.
  Es el único que emite `npm run lint` y ensucia la señal de los cuatro checks.

---

## B. Código pendiente del change `improve-frontend-ux`

### B.1 — Sección 16: llegar al paciente sin recorrer una lista

Rama `ui/acceso-directo`. **Es lo único grande que queda sin empezar.** Las pestañas de las
secciones 5 y 6 resolvieron moverse *dentro* de un paciente; esto resuelve llegar hasta él.

- **[código] 16.1** — `lib/auth/patient-search.ts` con `searchPatients(term, limit = 8)`,
  acotado por RLS y sin `select("*")`.
- **[código] 16.2** — Buscador de paciente en la cabecera de `AppShell` para `admin` y
  `professional`: `<form method="get">` que apunta a `/people`, con sugerencias tras dos
  caracteres y salto directo a la ficha.
- **[verif.] 16.3** — **Antes de montarlo**, verificar que el formulario nuevo queda *después*
  del de cerrar sesión en el HTML del servidor: `auth-http.mjs` toma el primer `<form>` que
  contiene el marcador y `AppShell` documenta que solo puede haber uno. Ver
  [`docs/11`](11-contratos-de-las-suites-http.md).
- **[verif.] 16.8** — A mano: desde cualquier pantalla del personal se llega a un paciente
  escribiendo su nombre, sin pasar por ningún listado.

### B.2 — Sección 14: ordenación de los listados

- **[código] 14.7** — Añadir `orden` a `exerciseList`, `templateList` y a los listados de
  seguimiento, con las claves que cada pantalla puede ordenar y **sin tocar** el
  `.order("priority")` de `/rules`.
- **[código] 14.8** — Ordenación por defecto explícita en cada listado, documentada en un
  comentario junto a su `createListParams`.
- **[verif.] 14.9** — Medir de nuevo `/exercises` y `/pro/alerts` en Chrome a 1440×900 y
  606×667 → [`docs/12`](12-medicion-de-densidad.md).
- **[verif.] 14.10** — `test:catalog`, `test:catalog:custom`, `test:routines:sessions` + los
  cuatro de CI.

### B.3 — Sección 13: cierre del change

Rama `docs/cierre-frontend`. Se ejecuta **al final**, cuando 16 y 14 estén dentro.

- **[código] 13.1** — Añadir a [`docs/10`](10-sistema-de-diseno.md) los componentes nuevos
  (`SubmitButton`, `FlashToast`, `ConfirmSubmit`, `CatalogPicker`, `PatientHeader`,
  `StaffWorkboard`) y cuándo usar `ConfirmDialog` frente a `ConfirmSubmit`.
- **[código] 13.2** — Escribir `docs/adr/0009-estado-de-listado-en-la-url.md`: por qué el
  estado vive en la URL y por qué el autoenvío no es una excepción del ADR-0008.
- **[código] 13.3** — Declarar `lib/shared/**` como territorio compartido en la sección 3 de
  [`CLAUDE.md`](../CLAUDE.md).
- **[código] 13.4** — Añadir a `scripts/verify-design-system.test.mjs` la comprobación de que
  todo segmento dinámico con `page.tsx` tiene su `loading.tsx`.
- **[verif.] 13.6** — Las veinticinco suites en verde sobre la rama fusionada, más los cuatro
  de CI.

---

## C. Verificaciones que piden manos

Ninguna de estas se puede cerrar leyendo código.

### C.1 — La pasada con el teléfono real. **Tres casillas de tres sitios distintos, una sola sesión.**

Este es el atajo que más rinde: las tres esperan el mismo teléfono.

- **13.5** (`improve-frontend-ux`) — Recorrer los caminos del paciente y registrar el
  resultado.
- **6.1** (`add-routine-execution`) — Ejecutar los **caminos 3, 4 y 5** de
  [`docs/07`](07-plan-de-verificacion.md) —snapshot de rutina, ejecución desde el celular y
  alertas— en un teléfono real. **Es la única casilla abierta de los cuatro slices
  funcionales.**
- **Camino 8, PWA** — El manifest, los iconos y el service worker están implementados y
  verificados en navegador desde el 2026-09-05; falta el recorrido de instalación en un
  teléfono real.

El registro va en la sección «Registro de la ejecución» de [`docs/07`](07-plan-de-verificacion.md).

### C.2 — Navegador con el `next start` local

Quedaron abiertas porque los navegadores disponibles en la sesión eran remotos y no alcanzaban
el servidor local.

- **7.2** *(parcial)* — Al guardar un registro de la sesión, el bloque sigue abierto y
  «Registro guardado» permanece a la vista. La suite ya verifica que la respuesta del POST
  contiene el texto; falta verlo con los ojos.
- **11.7** *(parcial)* — Las seis confirmaciones de `ConfirmSubmit` con JavaScript **activado y
  desactivado**. Por HTTP está verificado que las seis pantallas conservan sus `<form action>`
  con sus marcadores; falta el recorrido visual.
- **6.5** — Desde cualquier sección de un paciente se llega a las otras cinco en un toque.

---

## D. Deuda conocida y decisiones congeladas

**No son olvidos.** Están aquí para que nadie las «arregle» sin hablarlo.

- **827 ejercicios con las indicaciones en inglés.** El 2026-09-07 se decidió explícitamente
  traducir los **868 nombres** completos y solo las indicaciones de los **41 ejercicios que la
  demo usa**. Para cerrar la deuda: añadir entradas a
  `lib/catalog/exercise-instructions.es.json` y correr `npm run seed:exercises:textos`.
- **3.3 — Filtros por URL en `PeoplePanel`.** Congelado: desde que `/people` son cuatro
  tarjetas con `SheetModal`, un filtro en la URL navega y cierra el modal en cada tecla.
  `PeopleFilter` ya filtra en el cliente y sin JavaScript la lista se ve entera. Reabrir
  cuando el modal conserve su estado en la URL.
- **10.2 — Devolver al servidor los componentes de cliente.** Cerrado como «no aplica»:
  ninguno es de cliente *solo* por el botón; todos pintan además errores en línea, y dos
  tienen contrato de suite sobre esa respuesta. Reabrir si un change posterior mueve esos
  mensajes a acuses de URL.
- **18.4 — Medición en píxeles del resto de pantallas.** El antes/después está recogido en
  recuento; faltan las alturas en píxeles de las pantallas del punto «3 ter».
- **La ventana de dos minutos del acuse de cierre.** `recienCerrada()` decide en el servidor
  si la sesión se acaba de cerrar comparando `completed_at` con ahora. Si el paciente recarga
  el informe dentro de esos dos minutos, «Sesión completada» reaparece. Es deliberado: el
  acuse no puede viajar en la URL porque `closeSession` no puede usar `redirect()` sin vaciar
  el cuerpo del POST que lee la suite.
- **`patientOverview` hace nueve consultas.** `/patient` —la portada móvil— la llama aunque
  solo use tres de sus campos. Van en paralelo y seis son conteos con `head: true`, pero es la
  vista más sensible a una red lenta. Si molesta, separar la agregación del personal de la del
  paciente en un change posterior.

---

## Orden sugerido

1. **A.1 y A.2** — decidir qué se hace con la CI y con el despliegue. Todo lo demás se
   construye encima de esa señal, y hoy no existe.
2. **C.1** — la pasada con el teléfono: media hora, cierra tres casillas y es lo único que
   valida de verdad la experiencia del paciente, que es el usuario que importa.
3. **B.1** — la sección 16, el bulto de código que queda.
4. **B.2** — la sección 14.
5. **A.4** — el fix de `test:memberships`, en su propia rama, cuando apetezca.
6. **B.3** — la sección 13 cierra el change.
