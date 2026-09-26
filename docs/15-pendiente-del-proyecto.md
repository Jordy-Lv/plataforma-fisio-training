# Lo que falta por hacer

Foto del **2026-09-26**, tomada con `main` = `d4ef9a2` (sin cambios desde la noche del 25;
el estado de la CI se revisó este día en Actions, ver A.1). El 25 se fusionaron, en
orden: [#42](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/42) (asignación
manual de rutinas, sección F),
[#43](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/43) (cierre de
`improve-frontend-ux`, B.3),
[#44](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/44) (pasada de las 31 suites,
paquete de OpenSpec en la CI, `test:catalog` y deltas de `simplify-navigation-and-panel`) y
[#45](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/45), que es un duplicado del
#44 hecho por Copilot: mismos cambios, sin nada nuevo. Antes, los PRs
[#40](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/40) y
[#41](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/41) rediseñaron el panel del
administrador (ver «E» abajo), y el
[#21](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/21) (KAN-3, rendimiento) está en
`main` desde `d50f05d`. Además de `main`, en el remoto quedan `claude/kind-johnson-50sh63`,
`copilot/fix-ci-job-and-suites-pending` y `docs/asignacion-manual`: **las tres están ya
contenidas en `main`** y se pueden borrar. `claude/exciting-albattani-8jt0nu` solo lleva por
delante de `main` el commit que puso al día este documento tras el #45; ese commit viaja en
`claude/gifted-bell-619sct`, así que también se puede borrar cuando esta se fusione.

### Dónde retomar

**Ya no queda código pendiente en ningún change.** Todo lo que está abierto es una de estas
cuatro cosas, y ninguna se empieza sin decidirla antes con Jordy:

1. **KAN-19** (§F) — con JavaScript, tras una server action, el botón puede quedarse en
   «Asignando…» o sin su acuse. Es lo único que deja `test:smoke` en 7/11 y lo que mantiene
   abiertas la 13.6 de `improve-frontend-ux` y la 7.1 de `manual-routine-assignment`. Decidido
   dejarlo para un change propio: ni parche en el shell compartido sin consenso, ni subir
   Next/React sin confirmar que es del framework.
2. **C.1** — la pasada con el teléfono real. Cierra cinco casillas de una vez.
3. **`retire-rules-engine`** (§F) — proponer el change que retira el motor de reglas.
4. **Operación** (§A) — la CI ya corre y está en verde en `main`, pero no bloquea el merge y
   su job de pruebas funcionales falla por dos defectos del propio workflow (A.1); el
   despliegue sigue siendo manual (A.2).

`openspec validate --all --strict` pasa los 8 changes desde el #44. Los changes que ya no
tienen tareas abiertas (`add-auth-and-roles`, `add-exercise-library-and-rules`,
`add-progress-and-memberships`, `add-routine-calendar`) se podrían archivar con
`/opsx:archive`, lo que crearía por primera vez `openspec/specs/`. Tampoco se ha decidido.

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
| `improve-frontend-ux` | 132 | — | **7** |
| `manual-routine-assignment` | 32 | — | **2** |

Los seis primeros changes funcionales están cerrados salvo dos verificaciones en teléfono
real (`add-routine-execution` 6.1 y `simplify-navigation-and-panel` 1.2), que caben en la
misma sesión que la 13.5 de `improve-frontend-ux` y la 7.2 de `manual-routine-assignment`
(§C.1). A `manual-routine-assignment` le queda además la 7.1, que espera a KAN-19 (§F). Las secciones
16 y 14 de `improve-frontend-ux` —el bulto de código que quedaba— ya están las dos en `main`
(PRs [#34](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/34) y
[#35](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/35)). Lo que quedaba vivo en
código era solo la sección 13, cuyas cuatro tareas de código (13.1–13.4) están en `main`
(PR #43). Quedan las verificaciones a mano de la sección 6, de C.2 y la 13.5–13.6, más el
bloque de operación que nunca estuvo en ninguna lista.

---

## Estado de las suites y tickets abiertos

**Pasada completa del 2026-09-25 sobre `main` = `c7be7ea`** (tarea 13.6 de
`improve-frontend-ux`): **30 de 31 suites en verde** tras `db:reset`, `seed:exercises`,
`seed:templates` y `seed:progress-demo`. Solo `test:smoke` queda en 7/11, por KAN-19 (§F).
Antes de esa pasada fallaban dos suites en `main`, las dos ajenas al PR #41:

- **`test:calendar` 3/9** — fallan «El editor conserva fecha y vista al abrir, buscar y
  cerrar el catálogo» («La rutina debe abrirse desde la cuadrícula.») y «Recorrido completo:
  día vacío, asignación, programación y primera sesión completada» (URL del día esperada
  distinta). **Cerrado en el PR #42:** la suite tomaba el buscador de pacientes de la
  cabecera (PR #34) en vez del del catálogo, y el final del subtest esperaba el buscador
  general y `#assign-routine` que el diseño de `manual-routine-assignment` retira. Ajustado
  de acuerdo con Jordy: 9/9.
- **`test:catalog` 3/9** tras `seed:calendar-demo`: esa semilla crea tres ejercicios
  «· Ejemplo» y la suite espera exactamente los 868 de free-exercise-db (871 ≠ 868).
  `npm run db:clean` también los señala. **Diagnosticado el 2026-09-25: el fallo es de la
  suite, no de la aplicación.** `verify-catalog-list` compara el total que muestra
  `/exercises` con `count(*) … where is_custom = false`, pero `/exercises` lista **todos**
  los ejercicios (la política de lectura es `using (true)` para cualquier autenticado), así
  que cualquier ejercicio propio —de esa semilla o creado a mano en la demo— descuadra el
  total. **Corregido de acuerdo con Jordy (2026-09-25):** la suite compara con el total de
  la tabla; la guarda de «catálogo sembrado» sigue contando solo lo sembrado. Reproducido
  antes (6/9 tras `seed:calendar-demo`) y 9/9 después, con y sin esa semilla.

El último defecto real de código (KAN-17, abajo) se cerró el 2026-09-11. Aviso operativo del 2026-09-12, no de código:
`npm run seed:exercises` depende de descargar
`raw.githubusercontent.com/yuhonas/free-exercise-db`, que en este momento devuelve **503**
de forma intermitente — si `test:catalog`, `test:templates:seed`, `test:rules:seed` o
`test:overview` fallan porque el catálogo está vacío, comprobar primero si ese dominio
responde antes de sospechar de una rama.

En la ejecución de CI del PR #41, `Typecheck, lint y build` terminó correctamente. `Validar
specs` no llegó a ejecutar OpenSpec porque el workflow intenta instalar `openspec@1`, una
versión que npm no publica (`ETARGET`). Es un defecto del workflow independiente de la
facturación; el problema histórico de minutos de Actions sigue documentado abajo.
**Corregido el 2026-09-25:** el paquete `openspec` de npm es un marcador vacío (solo publica
`0.0.0`); OpenSpec se publica como `@fission-ai/openspec`, que es lo que instala ahora
`ci.yml`. Con él, `openspec validate --all --strict` pasaba 7 de 8 changes: fallaba
`simplify-navigation-and-panel`, cuya propuesta declaraba cuatro capacidades modificadas pero
no tenía ningún delta en `specs/`. **Resuelto el mismo día, de acuerdo con Jordy:** se
escribieron sus deltas a partir del código vigente (sin KAN-7 ni KAN-9, que ya no lo están)
y ahora pasan los 8.

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

### A.1 — [oper.] La CI ya corre, pero todavía no protege `main`

**Historia.** Desde el 2026-09-05, las ejecuciones del workflow anterior (165 contadas en su
momento) acabaron en `startup_failure` en 0 segundos, sin jobs ni logs. La causa era **de facturación de la
cuenta** (repositorio privado que consume minutos del plan), confirmada por Yordy el
2026-09-08; el archivo del workflow estaba descartado.

**Estado al 2026-09-26, comprobado en Actions.** El workflow `CI` se volvió a registrar el
2026-09-25 (sus ejecuciones empiezan de nuevo en la n.º 1, en el PR #40). Las tres primeras
terminaron en segundos; desde la n.º 5 **corre de verdad**, con jobs y logs, y hasta el PR #44
quedaba en rojo (entre otras cosas por «Validar specs» y `openspec@1`, ver arriba). La
ejecución de `main` sobre `d4ef9a2` (n.º 23) termina en **verde**:

| Job | Resultado en `d4ef9a2` |
|---|---|
| Typecheck, lint y build (incluye `test:design`) | verde |
| Validar specs (`openspec validate --all --strict`) | verde, 8 de 8 |
| Pruebas funcionales (Supabase local + HTTP) | **rojo**, marcado `continue-on-error` |

El job de pruebas funcionales corre `scripts/verify.sh --full`: **30 de las 31 suites en
verde**, las mismas que la pasada a mano de la 13.6. Falla por dos cosas, ninguna de la
aplicación:

- **`openspec: command not found`.** `verify.sh` valida las specs primero, y ese job no instala
  `@fission-ai/openspec` (solo lo instala el job «Validar specs»).
- **`test:smoke`** no llega a empezar: `browserType.launch: Executable doesn't exist`. El job
  no ejecuta `npx playwright install chromium`. Aunque lo hiciera, la suite quedaría en 7/11
  por KAN-19 (§F).

Arreglar las dos es añadir dos pasos a `ci.yml`; queda por decidir con Jordy, porque con eso
el job solo quedaría en rojo por KAN-19.

**Lo que sigue abierto.** `main` **no tiene protección de rama** (la API la da como
`protected: false`), así que la CI informa pero no impide fusionar en rojo: donde
[`CLAUDE.md`](../CLAUDE.md) §11 dice «CI los repite y bloquea el merge si fallan», la primera
mitad ya es cierta y la segunda no. Activarla (exigir «Typecheck, lint y build» y «Validar
specs») es un ajuste del repositorio en GitHub, no de código, y lo decide Jordy. Los PRs
anteriores al #44 entraron sin verificación automática.

Hasta que la protección esté puesta, el procedimiento antes de cada PR sigue siendo:

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

### B.3 — Sección 13: cierre del change — **código fusionado**

PR [#43](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/43) (el plan decía rama
`docs/cierre-frontend`). Las cuatro tareas de código están en `main`:

- ~~**13.1**~~ — [`docs/10`](10-sistema-de-diseno.md) documenta los componentes que faltaban,
  los listados, los componentes de dominio reutilizados y cuándo usar `ConfirmSubmit` frente
  a `ConfirmDialog`. `StaffWorkboard` ya no existe (KAN-5 lo sustituyó por `ProHome`).
- ~~**13.2**~~ — [ADR-0011](adr/0011-estado-de-listado-en-la-url.md), no 0009 como decía el
  plan: ese número ya lo tomó la asignación manual de rutinas.
- ~~**13.3**~~ — `lib/shared/**` declarado compartido en [`CLAUDE.md`](../CLAUDE.md) §3.
- ~~**13.4**~~ — `test:design` exige un `loading.tsx` en cada segmento dinámico con página. Solo
  2 de 11 lo tenían; se añadieron los 9 que faltaban con la forma de su pantalla.

Queda:

- **[verif.] 13.6** — Las veinticinco suites en verde sobre la rama fusionada, más los cuatro
  de CI. **Corrida el 2026-09-25 sobre `c7be7ea`:** hoy son 31 suites y pasan 30, más los
  cuatro de CI. Solo `test:smoke` queda en 7/11 por KAN-19, así que la casilla sigue abierta.
- **[verif.] 13.5** — el teléfono real (§C.1).

---

## C. Verificaciones que piden manos

Ninguna de estas se puede cerrar leyendo código.

### C.1 — La pasada con el teléfono real. **Cinco casillas de cinco sitios distintos, una sola sesión.**

Este es el atajo que más rinde: las cuatro esperan el mismo teléfono y el mismo recorrido
—alta de paciente → registro → asignación → ejecución de sesión.

- **13.5** (`improve-frontend-ux`) — Recorrer los caminos del paciente y registrar el
  resultado.
- **6.1** (`add-routine-execution`) — Ejecutar los **caminos 3, 4 y 5** de
  [`docs/07`](07-plan-de-verificacion.md) —snapshot de rutina, ejecución desde el celular y
  alertas— en un teléfono real. **Es la única casilla abierta de `add-routine-execution`.**
- **1.2** (`simplify-navigation-and-panel`) — Es el mismo recorrido: su propio enunciado remite
  a cerrar estas mismas casillas. Se marca sola al hacer las otras.
- **7.2** (`manual-routine-assignment`) — Elegir, ajustar y confirmar una rutina como
  profesional a 375 px; el paciente no ve el borrador y ve la rutina al confirmar. Es el mismo
  recorrido, en el paso de asignación.
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

PRs #40 y #41 (fusionados). No pertenece a ningún change de OpenSpec: fue una
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

**Decisión ya en el repositorio.** [ADR-0009](adr/0009-asignacion-manual-de-rutinas.md) y los
cambios en `README.md`, `docs/00`–`07` y `adr/README.md` llegaron desde la rama
`docs/asignacion-manual`, fusionada sobre `main` el 2026-09-25. Tres conflictos, resueltos así:
en [`02`](02-modelo-de-datos.md) y [`03`](03-motor-de-reglas.md) manda ADR-0009 (en `02` se
conserva el párrafo de KAN-8; en `03`, «Estado de implementación» dice dónde asigna hoy el
código por reglas); en [`16`](16-plan-de-mejora.md) se quedó la versión de `main`, así que su
KAN-7, D1 y Fases 2–3 describen el plan **anterior** a ADR-0009 y no son alcance vigente.
`docs/00` ya no dice que la rutina se asigna sola; **el código sí lo sigue haciendo**.

Lo que dicen las dos decisiones:

- **[ADR-0009](adr/0009-asignacion-manual-de-rutinas.md)** — el entrenador o fisioterapeuta
  elige una plantilla de su especialidad, revisa y ajusta la copia y confirma. El sistema no
  propone ni asigna solo al terminar el registro. Se conservan el snapshot (ADR-0001), los
  permisos y la exclusión de contraindicados.
- **[ADR-0010](adr/0010-especialidad-en-la-asignacion-de-rutinas.md)** (supera en parte a
  ADR-0007) — crear y confirmar la rutina exige que la plantilla sea de la especialidad del
  profesional y una `care_assignments` vigente de ese tipo; el admin puede las dos. Editar los
  ejercicios de una rutina ya creada sigue abierto a cualquier profesional a cargo.

**Plan: el change
[`manual-routine-assignment`](../openspec/changes/manual-routine-assignment/proposal.md)**,
validado con `openspec validate --strict`. Aprobado por Jordy el 2026-09-25, junto con estas
decisiones de diseño (todas en su `design.md`):

- El borrador es `pending_review`, que el paciente ya no puede leer, rotulado «Borrador».
  Crearlo no cierra la rutina activa ni genera alertas; confirmarlo cierra la anterior, activa
  la nueva y avisa como hasta ahora.
- Un solo borrador por paciente y tipo; con uno abierto hay que descartarlo antes de elegir
  otra plantilla. Descartar **archiva**, no borra.
- Crear un borrador exige el registro terminado.
- Contraindicados: se quitan solos al crear el borrador y la pantalla dice cuáles; añadir uno
  a mano se permite con aviso.
- Un día vacío bloquea la confirmación; un día con uno o dos ejercicios solo pide
  confirmación con aviso.
- Sin ranking ni «recomendada»: ficha breve del paciente y filtros de plantillas por enlaces.
- `copy_routine_template` también comprueba ADR-0010, y un trigger impide activar un
  borrador con un `update` directo.
- La pantalla va por pasos (elegir → ajustar y confirmar → activa); cada profesional ve la
  rutina de su tipo; el admin cambia de tipo con chips `?tipo=`. El buscador del catálogo
  solo aparece con `?dia=` o `?item=`.
- Sin alerta al terminar el registro: el listado de `/pro/routines` ya distingue a quien no
  tiene rutina.
- **Contratos de suites aprobados:** `test:routines` se reescribe sobre el ciclo nuevo, y
  `test:calendar` y `test:smoke` añaden el paso de elegir plantilla antes del formulario
  `#assign-routine` (tarea 5.1). Las filas nuevas de `docs/11` entran con la implementación
  (tarea 4.9).

**Implementado el 2026-09-25 y fusionado** en el PR
[#42](https://github.com/Jordy-Lv/plataforma-fisio-training/pull/42) (`87039ad`, 32 de 34 tareas):
migración [`20260925120000_routines_manual_assignment`](../supabase/migrations/20260925120000_routines_manual_assignment.sql),
acciones y consultas en `lib/routines/`, la pantalla por pasos (`AssignmentFlow`,
`AssignmentSteps`, `TemplateChoice`, `RoutineDraftBar`, `RoutineEditor`), `test:routines`
reescrita (14/14) y el paso de elegir plantilla en `test:calendar` y `test:smoke`. Quedan
abiertas **7.1** (`test:smoke` arrastra KAN-19, abajo) y **7.2** (teléfono real).

**Deuda anotada:** `public.copy_routine_template` sigue creando una rutina **activa** sin
borrador ni exclusión de contraindicados (ahora sí con ADR-0010). La usan
`test:routines:snapshot`, `test:routines:items` y `test:calendar` para preparar datos;
cerrarla del todo exige cambiar esas suites (design, Risks).

**KAN-19 se reproduce aquí de forma fiable, y ya se sabe algo más.** Decisión de Jordy
(2026-09-25): **se deja documentado para un change posterior**; ni parche en el shell
compartido sin consenso del equipo, ni subir Next/React sin confirmar antes que es del
framework y no de la integración del proyecto. Con JavaScript, tras
elegir o confirmar, la base se actualiza pero el botón puede quedarse en «Asignando…» y la
pantalla no cambia de paso. Diagnóstico del 2026-09-25 con Chromium a 375 px:

- El servidor termina la respuesta de la acción en ~0,2 s (medido con `curl` y desde la
  página); no quedan peticiones abiertas ni *chunks* por cargar.
- No es la precarga: en el cuelgue no hay ninguna petición `_rsc`.
- Si la respuesta se entrega **entera** al cliente de React (en un trozo o re-troceada hasta
  en trozos de 1 byte, pero ya descargada), funciona siempre (8 de 8). Si React la procesa
  **mientras llega**, se cuelga en la mayoría de los intentos.
- Next 15.5.26 (el último 15.x) no lo corrige (2 cuelgues de 3).

Es un problema de tiempos del cliente de Next/React al consumir en *streaming* la respuesta
de una server action, no de esta pantalla: `test:smoke` falla igual en `main` en la sesión
del paciente. Sin JavaScript (lo que recorren las suites HTTP) todo funciona.

**Fuera de este change:** retirar `assignment_rules`, `/rules`, el simulador, `seed:rules` y
las suites `test:rules*` va en otro change, `retire-rules-engine`, todavía sin proponer.
Hasta entonces el motor queda como código legado que la aplicación ya no invoca.

**Fallo encontrado en el camino de reglas, sin arreglar a propósito:** cuando el motor deja
una rutina en `pending_review` (días cortos), `private.assign_routine_from_rules` cierra la
activa y la «restaura» después, pero el trigger `closed_routine_cancels_calendar` ya canceló
su calendario al cerrarla, y restaurarla no lo recupera. El borrador nuevo no usa ese camino, y
el motor se retira en `retire-rules-engine`.

KAN-19 sigue abierto: ver el diagnóstico de arriba.

---

## Orden sugerido

Las cuatro fases de [`16-plan-de-mejora.md`](16-plan-de-mejora.md) ya están fusionadas (Fase 2:
KAN-11/5/7; Fase 3: KAN-9/10; Fase 4: KAN-6/8/13/14) salvo el paso a mano de su Fase 1
(`simplify-navigation-and-panel` 1.2), que es la misma pasada con el teléfono de **C.1**. Con
eso, «adelgazar» dejó de ser el paso previo que bloqueaba todo lo demás, que es justo lo que
[`16`](16-plan-de-mejora.md) §«Lo que no entra» daba por hecho al apartar 14.x y 16.x para
«después de adelgazar»: los dos documentos ya dicen lo mismo, en vez de contradecirse.

**Estado al 2026-09-25 (noche):**

- **PRs #41 a #45 fusionados** (`main` = `d4ef9a2`). Falta desplegar (`git checkout main &&
  git pull`, `git status` limpio, `railway up`). Antes de cualquier demo, A.7: el proyecto de
  Supabase no pausado.
- **F** — ~~subir los documentos de ADR-0009~~, ~~proponer el plan~~ e ~~implementarlo~~
  (PR #42 fusionado, `87039ad`). Quedan la 7.1 (KAN-19) y la 7.2 (teléfono, §C.1). La
  retirada del motor va aparte, en `retire-rules-engine`, todavía sin proponer.
- **B.3** — 13.1–13.4 fusionadas (PR #43). 13.6 corrida (PR #44): 30 de 31, abierta por
  KAN-19. Queda 13.5 (§C.1).
- **CI y OpenSpec** — el job «Validar specs» instala ya `@fission-ai/openspec` y los 8 changes
  validan (PR #44). La CI corre y `main` está en verde, pero sin protección de rama y con el
  job funcional en rojo por dos defectos del workflow (A.1).

Lo anterior, en su orden original:

1. ~~**KAN-17** — fusionar el PR #31.~~ Hecho: fusionado en `main` (`a5c8bcc`).
2. **A.1 y A.2** — decidir qué se hace con la CI y con el despliegue. La señal de la CI ya
   existe (2026-09-25); falta que bloquee el merge y que el job funcional no falle por el
   propio workflow. El despliegue sigue sin automatizar.
3. **C.1** — la pasada con el teléfono: media hora, cierra cinco casillas de cuatro `tasks.md`
   distintos y es lo único que valida de verdad la experiencia del paciente, que es el usuario
   que importa.
4. ~~**B.1**~~ Hecha, PR #34 fusionado.
5. ~~**B.2**~~ Hecha, PR #35 fusionado. Queda **KAN-15** suelto (mismo patrón de paginación en
   `/attendance`), en pausa a propósito.
6. ~~**A.4**~~ Hecho, PR #36 fusionado. ~~**KAN-16**~~ Hecho, PR #37 fusionado.
7. **B.3** — ~~13.1–13.4~~ fusionadas (PR #43). Quedan 13.5 (C.1) y 13.6 (KAN-19).
8. ~~**KAN-3**~~ Hecho: PR #21 fusionado (`d50f05d`).
9. ~~**`test:calendar` y `test:catalog`**~~ — los dos corregidos: `test:calendar` en el PR #42
   y `test:catalog` en el PR #44.
