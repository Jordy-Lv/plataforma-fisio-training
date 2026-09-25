# Lo que falta por hacer

Foto del **2026-09-25**, tomada con `main` = `c4419d3` (PR
[#40](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/40) fusionado) y con el PR
[#41](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/41) abierto y sin conflictos.
Entre los dos rediseñan el panel del administrador (ver «E» abajo). El
[#21](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/21) (KAN-3, rendimiento) ya
está en `main` (`d50f05d`). Las ramas antiguas se borraron el 2026-09-25: en el remoto solo
quedan `main` y la del PR abierto.

**Lo siguiente es el flujo de asignación de rutinas** (sección F): el cambio de la
asignación automática por reglas a una asignación manual por el profesional. Empieza por ahí
una sesión nueva, pero **lee F antes de tocar código**: la decisión que lo gobierna todavía no
está en el repositorio.

Este documento reúne **todo** lo que queda abierto, dentro y fuera de OpenSpec. La fuente de
verdad de cada tarea del change en curso sigue siendo su `tasks.md`, y cada casilla se marca
ahí al cerrarla; lo que aquí se añade es lo que **no vive en ningún `tasks.md`**: el estado de
la CI, del despliegue y de las herramientas.

Complementa a [`openspec/changes/improve-frontend-ux/pendiente-frontend.md`](../openspec/changes/improve-frontend-ux/pendiente-frontend.md),
que detalla sección por sección el frontend pendiente. Si los dos se contradicen, gana el
`tasks.md`.

El **orden** en que se ataca todo esto, y qué se recorta por no aportar valor, se decide en
[`16-plan-de-mejora.md`](16-plan-de-mejora.md), que valida además los tickets de Jira contra el
código y recoge nueve defectos que no estaban en ninguna lista.

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
| `add-routine-calendar` | 14 | — | — |
| `simplify-navigation-and-panel` | 12 | — | **1** |
| `improve-frontend-ux` | 128 | — | **11** |

Los seis changes funcionales (todo salvo `improve-frontend-ux`) están cerrados salvo dos
verificaciones en teléfono real (`add-routine-execution` 6.1 y `simplify-navigation-and-panel`
1.2), que caben en la misma sesión que la 13.5 de `improve-frontend-ux` (§C.1). Las secciones
16 y 14 de `improve-frontend-ux` —el bulto de código que quedaba— ya están las dos en `main`
(PRs [#34](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/34) y
[#35](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/35)). Lo que queda vivo en
código es solo la sección 13 (cierre del change, ya sin nada que la bloquee) y las
verificaciones a mano de la sección 6 y de C.2, más el bloque de operación que nunca estuvo
en ninguna lista.

---

## Estado de las suites y tickets abiertos

**Dos suites fallan en `main` a 2026-09-25**, las dos ajenas al PR #41 (se comprobó
corriéndolas sobre `origin/main` sin sus cambios):

- **`test:calendar` 3/9** — fallan «El editor conserva fecha y vista al abrir, buscar y
  cerrar el catálogo» («La rutina debe abrirse desde la cuadrícula.») y «Recorrido completo:
  día vacío, asignación, programación y primera sesión completada» (URL del día esperada
  distinta). Sin diagnosticar. Sospecha: depende de la hora (se corrió de noche en Bogotá)
  o del estado que deja `seed:calendar-demo`.
- **`test:catalog` 3/9** tras `seed:calendar-demo`: esa semilla crea tres ejercicios
  «· Ejemplo» y la suite espera exactamente los 868 de free-exercise-db (871 ≠ 868).
  `npm run db:clean` también los señala.

El último defecto real de código (KAN-17, abajo) se cerró el 2026-09-11. Aviso operativo del 2026-09-12, no de código:
`npm run seed:exercises` depende de descargar
`raw.githubusercontent.com/yuhonas/free-exercise-db`, que en este momento devuelve **503**
de forma intermitente — si `test:catalog`, `test:templates:seed`, `test:rules:seed` o
`test:overview` fallan porque el catálogo está vacío, comprobar primero si ese dominio
responde antes de sospechar de una rama.

Cuatro tickets quedaron abiertos en Jira el 2026-09-10/11, sin `tasks.md` propio porque no son
parte de ningún change de OpenSpec en curso:

- **KAN-17** — `CalendarGrid` fechaba la rutina en la zona del servidor, no en la de Bogotá
  (la migración de KAN-9 perdió el `set timezone` al reescribir `copy_routine_template` con
  `create or replace`). Cerrado: PR #31 fusionado a `main` (`a5c8bcc`).
- **KAN-16** — las suites de `scripts/` (29 comandos `test:*` en `package.json`) no declaraban
  de qué semillas dependían: tras un `db:reset` limpio, `test:overview` fallaba 3/5 con «La
  semilla no tiene ninguna rutina con tres ejercicios» en vez de decir que faltaba
  `seed:progress-demo`. Cerrado: PR #37 fusionado a `main`, cabecera explícita en las 29
  suites y el mensaje de `test:overview` ahora nombra los tres comandos exactos.
- **KAN-15** — `listPatientsWithMonthAttendance` trae todos los perfiles activos y pagina en
  memoria (`all.slice(...)`), el mismo patrón que D4 (KAN-12) pero en `/attendance`. Prioridad
  baja: el tope de PostgREST (mil filas) exige mil pacientes activos, lejos del volumen de la
  demo. Coordinar con **14.7/14.8** de `improve-frontend-ux` (ya fusionadas) y con **B.2** más
  abajo: es el mismo patrón de paginación. **En pausa a propósito**, a la espera de que se
  decida si vale la pena la migración que requiere paginar en el servidor.
- **KAN-3** — **fusionado** (`d50f05d`). PR [#21](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/21), de un
  colaborador externo (`vigoya19`): quita
  `recharts` de `EvolutionChart.tsx` (baja el *First Load JS* de `/evolution/[patientId]` de
  ~251 kB a ~144 kB) y añade una suite de humo con Playwright. Se revisó dos veces: la primera
  encontró y corrigió dos defectos reales (`Suspense` que rompía el acuse de guardado,
  sustitución de ejercicio que podía esconder los ya prescritos) y encontró de paso **KAN-19**
  (ajeno a este PR). La segunda revisión (2026-09-12) atendió lo que faltaba de proceso:
  descripción y checklist en blanco, `recharts`/`playwright` sin justificar, y seis `SKILL.md`
  sueltos de `.agents/skills/source-command-opsx-*` que no eran de este cambio (quitados). El
  PR toca `components/ui/DetailDialog.tsx` y `components/ui/Progress.tsx` sin el aviso previo
  al equipo que pide la sección 3 de `CLAUDE.md` — señalado explícitamente en la descripción
  para que se revise antes de fusionar. `MERGEABLE`/`CLEAN` contra `main`.

---

## A. Operación e infraestructura

Nada de esto está en un `tasks.md`, y es lo que más riesgo acumula.

### A.1 — [oper.] La CI de GitHub Actions no corre. **Prioridad alta.**

Las **165 ejecuciones** registradas desde la primera del 2026-09-05 están en
`startup_failure`, en 0 segundos, sin generar jobs, logs ni check-runs. La API devuelve
`"path": "BuildFailed"` y `gh run view` lo atribuye engañosamente al archivo del workflow.

**Ya está descartado que sea el archivo:** `.github/workflows/ci.yml` compila limpio, el
workflow figura `active` y en su ruta, Actions están habilitadas (`allowed_actions: all`) y
`.nvmrc` existe. La causa es **de facturación de la cuenta** (repositorio privado que consume
minutos del plan), confirmada por Yordy el 2026-09-08.

**Consecuencia:** donde [`CLAUDE.md`](../CLAUDE.md) §11 dice «CI los repite y bloquea el merge
si fallan», eso no ocurre. Los 36 PRs fusionados hasta hoy entraron sin ninguna verificación
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

### A.4 — [código] `test:memberships` depende de la hora a la que la corras — **cerrado**

`dateIn()` en [`scripts/verify-progress-memberships.test.mjs`](../scripts/verify-progress-memberships.test.mjs)
fechaba los fixtures en **UTC**, mientras `daysUntil()` de
[`lib/progress/membership-vocabulary.ts`](../lib/progress/membership-vocabulary.ts) cuenta
desde el «hoy» del negocio (`America/Bogota`, UTC−5). Entre las 19:00 y las 24:00 de Bogotá el
día UTC ya avanzaba y el plazo salía con un día de más: la suite pasaba por la mañana y fallaba
de noche.

Mismo defecto que el PR #8 ya había arreglado en `verify-progress-memberships-cron.test.mjs:42`
—con `timeZone: "America/Bogota"`—, ahora replicado aquí en la rama
`fix/memberships-test-timezone`. 11/11 en verde.

### A.5 — [oper.] La base local tiene un perfil admin de sobra

`Revisión AmadorTrainer` (`c0d6481a-4715-44e5-bf22-7b5a644c3c42`) no viene de
`supabase/seed.sql`. Con dos admins, el cron genera dos alertas por membresía en vez de una y
`test:memberships:cron` cuenta 4 donde espera 2. Se arregla con `npm run db:reset` o borrando
ese perfil. **No es una regresión de código**: conviene descartarlo antes de culpar a una rama.

### A.6 — [oper.] Cabos sueltos menores

- Seis directorios sin trackear en `.agents/skills/source-command-opsx-*` en el árbol de
  trabajo compartido. Decidir si van a `.gitignore` o al repositorio; hoy viajan a producción
  en cada `railway up`. (Se colaron además, ya trackeados, en el PR #21 — se quitaron de esa
  rama el 2026-09-12, pero la decisión de fondo sobre el árbol compartido sigue pendiente.)
- ~~Aviso de lint: `appUrl` sin usar en `verify-auth-screens.test.mjs`.~~ Ya no aparece:
  `npm run lint` está limpio en `main` al 2026-09-12.

---

### A.7 — [oper.] El cliente se queda en la capa gratuita de Supabase

Decisión del cliente (2026-09-25): usar el plan gratuito de Supabase hasta que se sienta
satisfecho y decida pagar. El despliegue en Railway lo paga Jordy. Lo que eso implica, y
que hay que tener presente en cada demo:

- **Pausa por inactividad.** El plan gratuito pausa el proyecto tras días sin uso. Antes
  de cada demo, entrar al panel de Supabase y comprobar que no está pausado; si lo está,
  reactivarlo con tiempo.
- **Sin respaldos automáticos.** Lo dice ya el
  [ADR-0002](adr/0002-hosting-railway.md): aceptable para demo y piloto, inaceptable para
  datos de salud reales. Mientras el cliente esté a prueba, datos ficticios o riesgo
  aceptado por escrito.
- **Correo de autenticación.** «Recuperar contraseña» usa el correo propio de Supabase, que
  en el plan gratuito tiene límites de envío muy bajos. Comprobar en el panel si hay SMTP
  propio configurado antes de que lo use un paciente real.
- **Tamaño: sin riesgo.** Medido en local con todo sembrado: base de 15 MB e imágenes del
  catálogo de 47 MB.
- **Auth ya está incluido** en el plan gratuito: lo que el cliente compraría después es el
  plan de pago de Supabase (respaldos), no «Supabase Auth» por separado.

### A.8 — [oper.] Trabajar en Windows

Jordy trabaja en Windows. Lo que se aprendió el 2026-09-25:

- **PowerShell 7 (`pwsh`), no Windows PowerShell 5.1**: la 5.1 no acepta `&&`, y todas
  las instrucciones del proyecto encadenan con `&&`.
- **Docker Desktop encendido** («Engine running») antes de `npm run db:start`.
- Los scripts de `scripts/` llamaban a `node_modules/.bin/supabase`, que en Windows no se
  puede ejecutar (`spawnSync … ENOENT`): fallaban `db:env`, todas las semillas y varias
  suites. **Arreglado en el PR #40**: ahora lanzan `node_modules/supabase/dist/supabase.js`
  con `process.execPath`.
- `railway up` sube la carpeta local tal cual: antes de desplegar, `git status` sin
  archivos sueltos (A.2).

---

## B. Código pendiente del change `improve-frontend-ux`

### B.1 — Sección 16: llegar al paciente sin recorrer una lista — **fusionada**

PR [#34](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/34), en `main`. Las
9 tareas (16.1–16.9) están completas en `tasks.md`. Una segunda revisión encontró y corrigió
dos defectos reales en `PatientSearch.tsx` (error de `searchPatients` sin capturar, condición
de carrera del debounce) antes de fusionar.

### B.2 — Sección 14: ordenación de los listados — **fusionada**

PR [#35](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/35), en `main`. Las
14.1–14.12 están completas en `tasks.md`. **KAN-15** (arriba) queda como el único trabajo
suelto que sigue relacionado con esta sección: el mismo patrón de paginación en memoria, ya
en `/attendance` y no en `/exercises` ni `/templates`.

### B.3 — Sección 13: cierre del change

Rama `docs/cierre-frontend`. Ya no tiene nada que la bloquee: 16 y 14 están las dos en
`main`. Es lo único de código que queda del change.

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

### C.1 — La pasada con el teléfono real. **Cuatro casillas de cuatro sitios distintos, una sola sesión.**

Este es el atajo que más rinde: las cuatro esperan el mismo teléfono y el mismo recorrido
—alta de paciente → registro → asignación → ejecución de sesión.

- **13.5** (`improve-frontend-ux`) — Recorrer los caminos del paciente y registrar el
  resultado.
- **6.1** (`add-routine-execution`) — Ejecutar los **caminos 3, 4 y 5** de
  [`docs/07`](07-plan-de-verificacion.md) —snapshot de rutina, ejecución desde el celular y
  alertas— en un teléfono real. **Es la única casilla abierta de `add-routine-execution`.**
- **1.2** (`simplify-navigation-and-panel`) — Es el mismo recorrido: su propio enunciado remite
  a cerrar estas mismas casillas. Se marca sola al hacer las otras.
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
- **6.3** — Verificar que `/evolution/[patientId]` conserva `<option value="weight">Peso</option>`
  e `<option value="bmi">IMC</option>`, y que la gráfica sigue sin montarse cuando no hay datos.
- **6.5** — Desde cualquier sección de un paciente se llega a las otras cinco en un toque.
- **6.6** — `npm run test:routines`, `test:routines:items`, `test:attendance`,
  `test:screenings` y `test:evolution` en verde, más los cuatro de CI. Cierra la sección 6 de
  `improve-frontend-ux` (montaje de cabecera y pestañas en la ficha del paciente), que hasta
  ahora no aparecía en este documento.

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
  **Revisado el 2026-09-11 con KAN-14 y vuelto a congelar.** Paginar en el servidor
  manteniendo el filtro en el cliente sería peor que no hacerlo: el buscador solo alcanza lo
  ya pintado, así que estrechar la página dejaría a gente fuera de su alcance. Lo que sí se
  arregló es el defecto real que se escondía detrás: la consulta se comía el tope de
  PostgREST **en silencio** y quien no cupiera desaparecía sin rastro. Ahora `/people` lee por
  `listPeopleDirectory`, que devuelve el total, y la pantalla dice cuánta gente queda sin
  mostrar en lugar de fingir que la lista está completa. Mientras 3.3 siga congelada, a esas
  personas no se llega desde el listado: hace falta la búsqueda en el servidor, que es
  justamente lo que exige los filtros en la URL.
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

## E. Panel del administrador — rediseñado el 2026-09-25

PRs #40 (fusionado) y #41 (abierto). No pertenece a ningún change de OpenSpec: fue una
petición directa para la demo. Lo que conviene saber antes de tocarlo:

- **Distribución.** Escritorio (`xl`): «Actividad reciente» a la izquierda con scroll
  propio; a la derecha «Pide tu atención hoy», el panorama en tira de tres cifras y cuatro
  accesos rápidos. Cabe entero sin desplazarse a 1440 × 789 y en pantallas mayores. En el
  teléfono todo va apilado y compacto (1720 → 1111 px de alto).
- **Datos.** `getAdminDashboard` en `lib/progress/overview-queries.ts`, un solo
  `Promise.all`. El mes anterior sale de restar dos llamadas a `business_overview`, que
  acota el cumplimiento solo por abajo: sin migración.
- **Contrato de suite.** `test:overview` lee `Título</h3>` + `<p>cifra</p>` +
  `<p>frase</p>` seguidos. `Metric` es `async` sin esperar nada **a propósito**: React
  Flight parte el árbol en filas de ~3200 caracteres y el corte llegó a caer dentro de una
  tarjeta, separando el `<h3>` de su cifra en el HTML.
- **Shell.** El menú lateral es un riel pegado al borde izquierdo; el contenido llega hasta
  100rem (1600 px) centrado. El texto se queda en 16 px en toda pantalla: se probó escalar
  el tamaño base en monitores grandes y se descartó (con Windows al 125 % se agrandaba dos
  veces).
- **Regla móvil nueva** (`docs/10`, regla 7): ningún acceso directo repite la barra
  inferior; se comprueba con `isInMobileBar`.

---

## F. Siguiente: el flujo de asignación de rutinas

El flujo actual es confuso de usar y de ver (revisión de Jordy, 2026-09-25): la pantalla
`/pro/routines/[patientId]` apila «Asignar según el perfil», el aviso de condiciones, un
buscador de catálogo permanente y la rutina con tarjetas dentro de tarjetas, y el
profesional no puede elegir la plantilla.

**Decisión tomada, pero todavía fuera del repositorio.** Jordy la redactó como
`docs/adr/0009-asignacion-manual-de-rutinas.md`, junto con cambios en `README.md` y en
`docs/00`, `01`, `02`, `03`, `04`, `05`, `06`, `07`, `16` y `adr/README.md`. **Nada de eso
está en el remoto**: el ADR es un archivo sin seguimiento y el resto está en un
`git stash` («docs asignacion manual (pendiente)») de su copia local en Windows. **Primer
paso de la sesión nueva: que esos documentos lleguen a una rama.** Sin ellos, ADR-0009 no
existe para nadie más y `docs/00` sigue diciendo que la rutina se asigna sola.

Lo que Jordy dejó dicho de esa decisión:

- **El entrenador o fisioterapeuta elige y asigna la rutina**: selecciona una plantilla de
  su especialidad, revisa y ajusta la copia del paciente y confirma la asignación.
- **El sistema deja de proponer y asignar rutinas solo al terminar el registro.**
  ADR-0003 (motor de reglas) queda superado por ADR-0009.
- **Se conservan** el snapshot (ADR-0001), los permisos y la validación de
  contraindicaciones.
- **Antes de modificar nada**, identificar todo lo que depende de `assignment_rules` o de
  una «regla ganadora»: pantallas, acciones, consultas, funciones SQL, migraciones, tipos y
  pruebas. Si hace falta migración, nueva y con `lib/db/types.ts` regenerado. Actualizar el
  change de OpenSpec que corresponda.

Puntos de partida en el código: `app/(pro)/pro/routines/[patientId]/page.tsx`,
`components/routines/AssignmentForm.tsx`, `lib/routines/assignment*.ts`, las migraciones
`*_routines_rule_assignment.sql`, `*_routines_auto_assignment.sql` y
`*_routines_qa_rule_winner_recompute.sql`, `/rules` en el panel del admin y las suites
`test:routines`, `test:rules*` y `test:routines:snapshot`. Contratos que siguen vigentes
mientras no se acuerde otra cosa: `?dia=` e `?item=` en `docs/11` y el orden de los
formularios de esa pantalla.

KAN-19 (el «Guardando…» que se queda colgado) sigue abierto como **parcial** y se reprodujo
precisamente en las pantallas de rutina y calendario del profesional: tenerlo presente al
rehacer esa pantalla.

---

## Orden sugerido

Las cuatro fases de [`16-plan-de-mejora.md`](16-plan-de-mejora.md) ya están fusionadas (Fase 2:
KAN-11/5/7; Fase 3: KAN-9/10; Fase 4: KAN-6/8/13/14) salvo el paso a mano de su Fase 1
(`simplify-navigation-and-panel` 1.2), que es la misma pasada con el teléfono de **C.1**. Con
eso, «adelgazar» dejó de ser el paso previo que bloqueaba todo lo demás, que es justo lo que
[`16`](16-plan-de-mejora.md) §«Lo que no entra» daba por hecho al apartar 14.x y 16.x para
«después de adelgazar»: los dos documentos ya dicen lo mismo, en vez de contradecirse.

**Antes que nada (2026-09-25):**

- **Fusionar el PR #41 y desplegar** (`git checkout main && git pull`, `git status`
  limpio, `railway up`). Antes de cualquier demo, A.7: el proyecto de Supabase no pausado.
- **F** — subir los documentos de ADR-0009 a una rama y empezar el flujo de asignación de
  rutinas.

Lo anterior, en su orden original:

1. ~~**KAN-17** — fusionar el PR #31.~~ Hecho: fusionado en `main` (`a5c8bcc`).
2. **A.1 y A.2** — decidir qué se hace con la CI y con el despliegue. Todo lo demás se
   construye encima de esa señal, y hoy no existe.
3. **C.1** — la pasada con el teléfono: media hora, cierra cuatro casillas de tres `tasks.md`
   distintos y es lo único que valida de verdad la experiencia del paciente, que es el usuario
   que importa.
4. ~~**B.1**~~ Hecha, PR #34 fusionado.
5. ~~**B.2**~~ Hecha, PR #35 fusionado. Queda **KAN-15** suelto (mismo patrón de paginación en
   `/attendance`), en pausa a propósito.
6. ~~**A.4**~~ Hecho, PR #36 fusionado. ~~**KAN-16**~~ Hecho, PR #37 fusionado.
7. **B.3** — la sección 13 cierra el change. Ya no tiene nada que la bloquee: es lo único de
   código que queda abierto.
8. ~~**KAN-3**~~ Hecho: PR #21 fusionado (`d50f05d`).
9. **`test:calendar` y `test:catalog`** — diagnosticar los dos fallos de «Estado de las
   suites».
