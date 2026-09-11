# 16 — Plan de mejora: adelgazar la aplicación

Foto del **2026-09-10**, sobre `main` = `10dfa55`.

El punto de partida es una queja concreta del negocio: **la aplicación se siente cargada y hay
demasiadas cosas que no aportan valor**. Este documento recoge la validación de los ocho tickets
abiertos en Jira (proyecto `KAN`) contra el código real, los defectos que aparecieron por el
camino y el plan por fases que sale de ambos.

No sustituye a [`15-pendiente-del-proyecto.md`](15-pendiente-del-proyecto.md), que sigue siendo el
inventario de lo que falta. Este documento decide **en qué orden** y **qué se recorta**. Si los
dos se contradicen, gana el `tasks.md` del change en curso.

Notación: **[código]** hay que escribirlo · **[verif.]** es comprobar, medir o correr suites ·
**[oper.]** es infraestructura o proceso.

---

## Por qué se siente cargada

La sensación es medible, y no es una cuestión de gusto:

- **42 pantallas** (`page.tsx`). El menú expone **13 al admin** y **12 al profesional**.
- **`/admin` y `/pro` son la misma pantalla.** Ambas renderizan
  [`components/progress/StaffHome.tsx`](../components/progress/StaffHome.tsx) con los mismos
  **siete KPI**; lo único que cambia son los títulos y un par de frases.
- **En el teléfono se esconde la mitad de la aplicación.** Con 13 entradas, `primaryNavItems`
  ([`nav-items.ts`](../components/shell/nav-items.ts)) muestra cuatro y mete el resto detrás de
  «Menú». Al paciente le pasa lo mismo: tiene seis secciones y ve cuatro.
- **El menú está organizado por entidad, no por tarea.** La cadena real de trabajo es
  Ejercicios → Plantillas → Reglas → Rutina: cuatro conceptos repartidos en tres entradas de
  menú, y nada dice en qué orden se usan ni que el orden es obligatorio. De ahí sale la confusión
  que reportan KAN-7 y KAN-8.

La conclusión operativa es que **el problema es de superficie, no de funcionalidad**. Casi nada de
lo que hay sobra; lo que sobra es cuánto de ello se enseña a la vez.

---

## Veredicto por ticket

| Ticket | Estado | Veredicto |
|---|---|---|
| **KAN-4** — Filtros, roles y UX | En curso | **Premisa parcialmente falsa.** Se reparte en tres. |
| **KAN-5** — Rediseñar el panel de administración | Por hacer | **Válido y confirmado.** Es la palanca principal. |
| **KAN-6** — Asignación de equipo en Personas | Por hacer | **Válido.** El esquema ya lo soporta; falta interfaz. |
| **KAN-7** — Validar el apartado de Reglas | Por hacer | **La funcionalidad se queda.** Sobra la presentación. |
| **KAN-8** — Simplificar la creación de rutinas | Por hacer | **Válido**, con dos datos del ticket corregidos. |
| KAN-1, KAN-3 | De Andrès | Solapan con KAN-6 y con los defectos D4 y D7. Coordinar. |

Del análisis salieron **seis tickets nuevos**, ya creados y enlazados:

| Ticket | Qué es | Fase |
|---|---|---|
| **KAN-9** | Defecto D1 — la rutina no se asigna sola al terminar el registro | 3 |
| **KAN-10** | Defecto D2 — las alertas se reparten sin mirar la especialidad (era «KAN-4b») | 3 |
| **KAN-11** | Agrupar el menú con pestañas: de 13 entradas a 8 (era «KAN-4a») | 2 |
| **KAN-12** | Defecto D4 — el porcentaje de cumplimiento se falsea en silencio | 2 |
| **KAN-13** | Defecto D5 — no se puede cerrar ni reasignar un acompañamiento. **Bloquea KAN-6** | 4 |
| **KAN-14** | Filtros de Personas por URL, con paginación (era «KAN-4c») | 4 |

### KAN-4 — el criterio de aceptación parte de un supuesto que no se cumple

El ticket pide «verificar que no hay fuga de datos entre pacientes de distintas especialidades».
**No hay tal fuga, y el comportamiento actual es el diseñado.**

Toda la autorización pasa por `treats_patient()`
([`20260906230000_qa_actor_active_access.sql`](../supabase/migrations/20260906230000_qa_actor_active_access.sql)),
que filtra por `care_assignments` y **no compara `kind`**. Un profesional solo alcanza a quien
tiene asignado. Cuando un paciente tiene entrenador *y* fisioterapeuta a la vez, ambos ven todo
—que es exactamente lo que pide [`00-contexto-y-alcance.md`](00-contexto-y-alcance.md) («un mismo
paciente puede tener entrenador y fisioterapeuta a la vez») y lo que decide
[`adr/0007`](adr/0007-tres-roles-mas-especialidad.md):

> «La interfaz debe filtrar por `specialty` donde corresponda […]. Es filtrado de presentación,
> no de autorización.»

Ese filtrado de presentación es lo que **no** está hecho. El ticket queda repartido en tres tickets
que ya existen:

- **KAN-11** — menú y panel → Fase 2.
- **KAN-10** — alertas por especialidad → es el defecto **D2**, y sí es un defecto real.
- **KAN-14** — filtros de `/people` → Fase 4.

Con eso, KAN-4 se queda sin contenido propio: conviene cerrarlo apuntando a los tres, en vez de
dejarlo abierto con un criterio de aceptación que no se puede cumplir.

### KAN-7 — qué hacen las reglas y por qué no se pueden quitar

Una regla dice «a un paciente con este perfil le toca esta plantilla». Al ejecutarse
([`lib/routines/assignment.ts`](../lib/routines/assignment.ts)):

1. Gana la primera regla activa que coincide, por prioridad.
2. Su plantilla **se copia** a una rutina propia del paciente (snapshot,
   [`adr/0001`](adr/0001-snapshot-de-rutinas.md)).
3. **Se le quitan los ejercicios contraindicados** por las condiciones del paciente. Esta es la
   parte clínica del motor.
4. Si un día queda con menos de tres ejercicios, la rutina no se publica: queda `pending_review`,
   se restaura la anterior y el paciente no la ve.
5. Si ninguna regla coincide, no se inventa nada: no hay rutina y se genera una alerta.

El servidor **recalcula la ganadora en SQL** (`resolve_assignment_winner`,
[`20260906233000`](../supabase/migrations/20260906233000_routines_qa_rule_winner_recompute.sql)) y
rechaza el envío si no coincide, de modo que un profesional no puede falsear qué regla ganó ni
dejar una auditoría engañosa.

**No se puede retirar**, por dos razones duras:

- Es el punto 2 del alcance ([`00`](00-contexto-y-alcance.md)): «la plataforma propone una rutina
  base automáticamente».
- **No existe otra forma de asignar una rutina.** Toda fila de `routines` nace de
  `copy_routine_template`, invocada solo por `commit_routine_assignment`, que exige regla
  ganadora. No hay pantalla de «asignar esta plantilla a este paciente».

Lo que sí sobra es la presentación: el nombre («Reglas» es lenguaje de ingeniero), tres de los
siete criterios del formulario, y la entrada de menú para el profesional, que solo puede mirar.

**Descartado** doblar la regla dentro de la plantilla. Obligaría a una regla por plantilla —el
seed ya tiene dos apuntando a la misma— y reescribiría `test:rules:panel` (ocho sub-tests) a
cambio de un beneficio que las pestañas de la Fase 2 ya dan.

### KAN-8 — dos correcciones al enunciado

- El esquema de Zod del alta de ejercicio **no está en `lib/catalog/schemas.ts`**: ese archivo son
  solo los filtros del listado. Está en
  [`lib/catalog/exercise-schemas.ts`](../lib/catalog/exercise-schemas.ts).
- «¿Un ejercicio debe estar asociado a una o varias rutinas?» → **a tantas como se quiera**, y ya
  funciona así. Ni `template_items` ni `routine_items` tienen unicidad sobre `exercise_id`; la
  única restricción es `unique (template_day_id, position)`.

Fricción real, medida: crear un ejercicio es **una pantalla y un envío**. Crear una plantilla
asignable son **dos fases obligatorias y unos ocho clics** (cabecera → redirección → añadir día →
enfocar el día → buscar → añadir ×3 → activar), con recarga de servidor en cada paso.

---

## Defectos encontrados fuera de los tickets

| # | Defecto | Dónde | Gravedad |
|---|---|---|---|
| **D1** | **La rutina no se asigna sola.** La pantalla de reglas y [`00`](00-contexto-y-alcance.md) / [`03`](03-motor-de-reglas.md) prometen que el motor se evalúa cuando el paciente termina su registro. `finish_patient_onboarding` no lo invoca: el único disparo es el botón manual «Evaluar y asignar rutina». | [`20260905050000_auth_people_onboarding.sql`](../supabase/migrations/20260905050000_auth_people_onboarding.sql) | **Alta** — incumple el punto 2 del alcance |
| **D2** | **Las alertas ignoran la especialidad.** `notify_routine_assignment` inserta una alerta para *cada* profesional con asignación viva, sin mirar `kind`: el entrenador recibe las alertas de dolor que son trabajo del fisioterapeuta. [`00`](00-contexto-y-alcance.md) promete «cada uno ve las alertas que le corresponden». | [`20260905190000_routines_rule_assignment.sql`](../supabase/migrations/20260905190000_routines_rule_assignment.sql) | **Alta** |
| **D3** | El botón «Planes y servicios» se le muestra al profesional, y `/plans` es `requireAdmin`: lo pulsa y rebota. Contradice la regla escrita en [`nav-items.ts`](../components/shell/nav-items.ts). | [`components/progress/BusinessOverview.tsx`](../components/progress/BusinessOverview.tsx) | Media |
| **D4** | El porcentaje de cumplimiento del panel se calcula con un `select` de `sessions` más embed **sin `limit` ni paginación**: PostgREST corta en `max-rows` y el número sale falseado **en silencio**. Es el número que se le enseña al cliente. | [`lib/progress/overview-queries.ts`](../lib/progress/overview-queries.ts) | Media |
| **D5** | No se puede cerrar ni reasignar un acompañamiento: **ninguna server action escribe `ended_at`**. El mensaje de error de `assignProfessional` pide «cierra la asignación anterior», algo que la interfaz no ofrece. | [`lib/auth/people-actions.ts`](../lib/auth/people-actions.ts) | Media |
| **D6** | `assignProfessional` revalida `/admin` y `/pro`, pero **no `/people`**, que es donde vive el panel que muestra el dato. | [`lib/auth/people-actions.ts`](../lib/auth/people-actions.ts) | Baja |
| **D7** | `patientOverview` hace **nueve consultas** y devuelve once campos; sus dos únicos llamadores usan tres y dos. Cuatro consultas son trabajo tirado en la vista más sensible a red lenta. Alimenta KAN-3. | [`lib/progress/patient-overview.ts`](../lib/progress/patient-overview.ts) | Baja (deuda declarada) |
| **D8** | Comentarios desactualizados en `MobileNav`: dice «el administrador tiene doce» (son trece) y «el paciente tiene cinco secciones y las ve todas» (tiene seis, así que ve cuatro). | [`components/shell/MobileNav.tsx`](../components/shell/MobileNav.tsx) | Baja |
| **D9** | `requireStaff` y `requireAdmin` duplicados palabra por palabra en `lib/catalog/access.ts` y `lib/progress/access.ts`. | [`lib/catalog/access.ts`](../lib/catalog/access.ts) | Baja |

---

## El plan por fases

Antes de empezar, abrir un change de OpenSpec (nombre sugerido `simplify-navigation-and-panel`)
para que las tareas se marquen donde el proyecto espera ([`CLAUDE.md`](../CLAUDE.md) §12).

**Recordar que la CI no corre** ([`15`](15-pendiente-del-proyecto.md) A.1): los cuatro checks se
pasan a mano antes de cada PR.

### Fase 1 — Verificar antes de tocar nada

Media hora, y puede explicar sola parte de la sensación de «no aporta valor».

1. **[oper.]** `npm run db:reset` — descarta también el perfil admin de sobra de
   [`15`](15-pendiente-del-proyecto.md) A.5.
2. **[oper.]** `npm run seed:exercises && npm run seed:templates && npm run seed:rules`.
   **`supabase/seed.sql` trae cero reglas.** Sin `seed:rules`, ninguna regla está activa, `/rules`
   avisa en rojo y **toda asignación falla con `no_match`**. Conviene descartarlo antes de culpar
   al diseño del motor.
3. **[verif.]** `next start` en el **3000** —no otro puerto: los enlaces de recuperación que emite
   Supabase apuntan a `localhost:3000`— y recorrer alta de paciente → registro → «Evaluar y
   asignar rutina» → ejecución de la sesión desde el teléfono. Anotar dónde se atasca.
4. **[verif.]** Aprovechar el teléfono para cerrar de un tiro las tres casillas de
   [`15`](15-pendiente-del-proyecto.md) C.1 (13.5, 6.1 y el camino 8 de la PWA). El registro va en
   [`07`](07-plan-de-verificacion.md).

Salida: confirmar o descartar **D1** en vivo, y saber si el motor está sembrado.

### Fase 2 — Adelgazar (KAN-11, KAN-5, KAN-12, KAN-7)

El bulto del valor. **Ninguna ruta cambia**: las pestañas son enlaces a las rutas que ya existen,
así que el riesgo para las dieciocho suites HTTP de [`11`](11-contratos-de-las-suites-http.md) es
nulo.

**2.1 — [código] El menú, de trece entradas a ocho.** Solo
[`components/shell/nav-items.ts`](../components/shell/nav-items.ts). Tres grupos colapsan en una
entrada cada uno:

```
Panel · Personas · Catálogo · Rutinas · Sesiones · Alertas · Seguimiento · Negocio

Catálogo     → Ejercicios | Plantillas | Asignación
Seguimiento  → Tamizaje | Asistencia
Negocio      → Planes | Membresías | Vitrina
```

El profesional queda igual, sin «Asignación» ni «Planes». Actualizar de paso los comentarios de
`MobileNav` (**D8**), que quedan mintiendo.

**2.2 — [código] `SectionTabs` compartido.** Generalizar
[`components/patients/PatientTabs.tsx`](../components/patients/PatientTabs.tsx) a
`components/shell/SectionTabs.tsx`. **Respetar las tres restricciones que su propio comentario ya
documenta**: sin ningún `<form>` dentro, sin emitir `value="<uuid>"`, y con desplazamiento
horizontal a 375 px con objetivos táctiles de 44 px. `components/shell/**` lo usan todos los
slices: avisar al equipo antes de abrir el PR ([`CLAUDE.md`](../CLAUDE.md) §3).

**2.3 — [código] Separar `/admin` de `/pro` (KAN-5).** Hoy comparten `StaffHome`. Partir en:

- `/admin` → **Panorama del negocio**: Clientes activos · Cumplimiento · Asistencia.
- `/pro` → **Mi trabajo de hoy**: Mis alertas · Sesiones de hoy · Tamizajes pendientes.

De siete KPI por pantalla a tres. Quitar el botón «Planes y servicios» del profesional (**D3**) y
acotar la consulta de cumplimiento (**D4**), o declararla aproximada en la propia pantalla: hoy
miente en silencio.

**2.4 — [código] Reglas (KAN-7), sin tocar el motor.**

- Renombrar «Reglas» → «Asignación» en el menú y «Asignación automática» en la pantalla. Está
  verificado que el rótulo **no es contrato de ninguna suite** —solo aparece en comentarios de
  `scripts/`— y que [`11`](11-contratos-de-las-suites-http.md) no impone nada sobre el menú.
- Recortar [`components/catalog/RuleForm.tsx`](../components/catalog/RuleForm.tsx) de siete
  criterios a los cuatro que el negocio usa. `age_range` y «tiene todos los equipos» pasan a un
  `<details>` de avanzado, o salen. **El esquema de Zod no se toca**: sigue aceptándolos y las
  reglas existentes siguen funcionando.
- Añadir una línea de estado: «N plantillas activas · N reglas activas». Hoy hay que deducir si la
  máquina está cableada.

**[verif.]** `test:design`, `test:auth:screens`, `test:rules:panel`, `test:catalog`,
`test:templates`, más los cuatro checks.

### Fase 3 — Cumplir lo prometido (KAN-9 y KAN-10)

**3.1 — [código] El disparo automático del motor (D1).** Que `finish_patient_onboarding` invoque
`commit_routine_assignment` en la misma transacción. Hay que preservar lo que ya existe: el
`pg_advisory_xact_lock`, el rechazo por `onboarding_step <> 3` —que aquí pasa a cumplirse justo
antes— y el camino `no_match` → alerta sin rutina. Migración nueva; jamás editar una que ya esté
en `main`, y `lib/db/types.ts` regenerado en el mismo PR.

**3.2 — [código] Alertas por especialidad (D2).** Añadir el filtro por `kind` al reparto de
`notify_routine_assignment` y a los demás generadores de alertas: el fisioterapeuta recibe las de
dolor, el entrenador las de cumplimiento. Es el filtrado por especialidad que
[`adr/0007`](adr/0007-tres-roles-mas-especialidad.md) dejó pendiente. Migración nueva.

**[verif.]** `test:routines`, `test:rules:panel`, `test:auth`, más los cuatro checks.

### Fase 4 — Completar (KAN-13, KAN-6, KAN-8, KAN-14)

**4.1 — [código] Asignación de equipo (KAN-6).** El esquema **ya lo soporta**: `care_assignments`
tiene `kind` y un único índice parcial `(patient_id, kind) where ended_at is null`, así que un
paciente puede tener fisioterapeuta y entrenador a la vez —el propio `supabase/seed.sql` ya crea
ese caso. Falta:

- Mostrar **quién** en `/people` y en `/people/[id]`. Hoy `PeoplePanel` solo muestra *el tipo* de
  acompañamiento, y la ficha no consulta `care_assignments` en absoluto.
- **Cerrar y reasignar** (**D5**), más el `revalidatePath("/people")` que falta (**D6**).

> **Restricción de diseño.** La RLS de `profiles` y de `care_assignments` **no deja a un
> profesional ver al otro profesional** del mismo paciente. Mostrarle el «quién» exigiría una
> función `security definer`. Lo barato y restrictivo —que es lo que manda
> [`CLAUDE.md`](../CLAUDE.md) §1— es que el mapa completo lo vea **solo el admin**.

> **Colisión con KAN-1** («listar pacientes registrados por un entrenador»): es la misma pantalla.
> Hablarlo antes de abrir rama.

**4.2 — [código] Creación de rutinas (KAN-8).** Con las pestañas de la Fase 2 la cadena ya se ve
en un solo sitio. Queda quitar la fricción real: permitir crear la plantilla **con su primer día**
en el mismo formulario —`AddDayForm` ya asigna el número de día automáticamente—, lo que elimina
una de las dos fases obligatorias. Documentar en [`02`](02-modelo-de-datos.md) que un ejercicio va
en tantas plantillas como se quiera.

**4.3 — [código] Filtros de `/people` (KAN-14).** `PeopleFilter` es la excepción del sistema:
filtra en el DOM del cliente, sin URL, **sin paginar** —trae todos los perfiles, con el tope duro
de mil filas de PostgREST— y sin filtro de estado. Migrarlo a `createListParams`
([`lib/shared/list-params.ts`](../lib/shared/list-params.ts)) y a `listPeople` /
`listPatientProfiles`, **que ya existen** en
[`lib/auth/people-queries.ts`](../lib/auth/people-queries.ts) con `q`, `state` y `range`, y que ya
usan `/pro/routines`, `/pro/sessions` y `/pro/alerts`. Ojo con la deuda congelada 3.3 de
[`15`](15-pendiente-del-proyecto.md): el `SheetModal` no conserva su estado en la URL. Aquí se
cierra esa deuda o se vuelve a declarar.

---

## Lo que no entra, y por qué

- **Ordenación de listados** (14.7 y 14.8) y **buscador en la cabecera** (16.1 y 16.2). Siguen
  pendientes en [`15`](15-pendiente-del-proyecto.md) §B y **añaden superficie**: van después de
  adelgazar, no durante. Cuando se monte el buscador, su `<form>` tiene que quedar **después** del
  de cerrar sesión en el HTML del servidor ([`15`](15-pendiente-del-proyecto.md) 16.3).
- **D7 y D9.** Van con KAN-3 y en su propia rama.
- **Traducir las 827 indicaciones en inglés.** Decisión congelada a propósito
  ([`15`](15-pendiente-del-proyecto.md) §D).
- **Doblar las reglas dentro de la plantilla.** Evaluado y descartado; ver KAN-7 arriba. Reabrir
  si después de la Fase 2 el apartado sigue sintiéndose complejo.

---

## Verificación

Antes de cada PR, y a mano mientras la CI siga sin correr:

```bash
npm run typecheck && npm run lint && npm run test:design && npm run build
```

Más las suites de las pantallas que toque el cambio, contra un `next start` de producción en el
**3000** con Supabase local. Si el PR incluye migración, `npm run db:reset` limpio y
`lib/db/types.ts` regenerado en el mismo PR.

Cierre de cada fase:

- **Fase 1** — una rutina asignada de punta a punta, y las tres casillas de
  [`15`](15-pendiente-del-proyecto.md) C.1 registradas en [`07`](07-plan-de-verificacion.md).
- **Fase 2** — en Chrome a 1440×900 y a 375×667: el menú del admin muestra ocho entradas, la barra
  inferior del teléfono ya no esconde la mitad de la aplicación, y `/admin` y `/pro` muestran
  pantallas distintas de tres KPI. Medición de densidad de nuevo en
  [`12`](12-medicion-de-densidad.md).
- **Fase 3** — un paciente nuevo termina su registro y **recibe rutina sin que nadie pulse nada**;
  un profesional de `training` no recibe la alerta de dolor de un paciente que además lleva
  fisioterapeuta.
- **Fase 4** — desde `/people` se ve y se cambia quién atiende a cada paciente, y los filtros
  sobreviven a una recarga y al botón de atrás.

**Si una suite falla, no se adapta para que pase**: se describe el contrato roto y se habla
([`CLAUDE.md`](../CLAUDE.md) §12, [`11`](11-contratos-de-las-suites-http.md)).
