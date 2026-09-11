# Medición de densidad y recorrido

Las cifras de este documento **están medidas en Chrome**, no calculadas. Sirven para dos
cosas: justificar la fase 5 de `improve-frontend-ux` y poder comprobar después si el cambio
sirvió de algo. Cuando una sección de esa fase termine, vuelve aquí y añade la columna
«después».

**Cómo se midieron.** Sesión de administrador (`admin@demo.local`) contra el servidor de
desarrollo, ventana de Chrome a 1440×1077 (viewport de 900 px) y a 375×844, que Chrome
sirve como 606×667 porque no permite ventanas más estrechas. En cada ruta:

```js
document.documentElement.scrollHeight / innerHeight   // pantallas de recorrido
document.querySelector("main li").getBoundingClientRect().height   // alto de fila
```

La bandeja de alertas estaba vacía en la base local, así que se sembraron doce alertas de
tipo `pain` con tres sesiones de evidencia cada una —la forma que produce el motor de
alertas real— y se borraron al terminar. La tabla `alerts` vuelve a estar en 0.

---

## 1. Recorrido por pantalla, con los datos de la demo

| Ruta | Filas | Alto (1440×900) | Pantallas | Alto (606×667) | Pantallas |
|---|---|---|---|---|---|
| `/exercises` | 24 tarjetas | 4.507 px | 5,01 | 15.561 px | 23,33 |
| `/pro/alerts` | 12 alertas | 8.387 px | 9,32 | 8.623 px | 12,93 |
| `/admin` | 7 personas | 2.215 px | 2,46 | 3.790 px | 5,68 |
| `/memberships` | 4 membresías | 2.209 px | 2,45 | — | — |
| `/templates` | 4 plantillas | 1.117 px | 1,24 | — | — |
| `/screenings` | 5 pacientes | 900 px | 1,00 | — | — |
| `/attendance` | 5 pacientes | 900 px | 1,00 | — | — |
| `/pro/routines` | 5 pacientes | 900 px | 1,00 | — | — |

`/exercises` empeora al estrechar la ventana porque la rejilla cae a una columna por debajo
de `sm` (640 px) y la tarjeta conserva su imagen 4:3, que crece con el ancho disponible: la
tarjeta pasa de 429 px de alto a 597. En un teléfono real de 375 px la tarjeta vuelve a
bajar, a unos 430 px, y el listado queda en torno a 17 pantallas.

## 1 bis. Pantallas de detalle

Los listados no son lo más largo de la aplicación. Lo son las pantallas de edición.

| Ruta | Alto | Pantallas | `<form>` en la página |
|---|---|---|---|
| `/templates/[id]` | 8.313 px | 9,24 | **59** |
| `/pro/routines/[patientId]` | 5.041 px | 5,60 | 17 |
| `/evolution/[patientId]` | 1.195 px | 1,33 | 0 |
| `/people/[id]` | 900 px | 1,00 | 1 |

Cincuenta y nueve formularios en una sola pantalla: construir una plantilla es hoy la
pantalla más pesada de la aplicación, y cada ejercicio añadido la recarga entera. La
sección 12 del change ataca la recarga; la altura sigue siendo suya.

`/people/[id]` es el caso contrario y más revelador: **cabe en una pantalla y no tiene ni un
solo enlace de salida**. Se entra al perfil de un paciente y desde ahí no se puede ir a su
rutina, ni a sus sesiones, ni a su evolución, ni a su asistencia. Es exactamente el agujero
que llena la banda de pestañas de las secciones 5 y 6.

## 1 ter. Pantallas de edición: los formularios plegados (2026-09-07)

Yordy revisó `/pro/routines/[patientId]` en Safari y el veredicto fue «demasiado scroll,
demasiados formularios». Las tres pantallas de edición abrían con **el formulario completo de
cada ejercicio desplegado a la vez**: cuatro campos numéricos, una nota y dos botones por
ejercicio, por día. La rutina de demostración tiene dieciséis ejercicios.

La solución es la misma que ya se aplicó en `/patient/profile` (tarea 17.3): la prescripción
actual se lee en una línea y el formulario para cambiarla espera detrás de un `<details>`
cerrado. Un `<details>` cerrado emite igual su contenido en el HTML del servidor, así que
ninguna suite se rompe (`test:routines:items` 9/9, `test:templates` 19/19,
`test:routines:sessions` 18/18, medidos contra la app viva).

| Pantalla | Antes | Después (pendiente medir en Chrome) |
|---|---|---|
| `/templates/[id]` (2 días) | 8.313 px · 9,24 pantallas · 59 `<form>` | ~1 línea por ejercicio + `<details>` |
| `/pro/routines/[patientId]` (16 ejercicios) | 5.041 px · 5,60 pantallas · 17 `<form>` | ~1 línea por ejercicio + `<details>` |
| Alerta en `/pro/alerts` (3 sesiones) | 658 px (420 de evidencia) | 1ª sesión visible + `<details>` «Ver las otras N» |

Los `<form>` no desaparecen ni cambian de orden: el de quitar un ejercicio sigue siendo el
primero del ítem y fuera del `<details>`; el de marcar una alerta como leída sigue tras la
evidencia. **Falta la medición en Chrome del antes y el después** (tareas 14.9 y 17.8).

## 2. Alto de una fila

Es la cifra que gobierna todo lo demás: multiplicada por el número de filas da el recorrido
de la pantalla a cualquier escala.

| Fila | Alto | Caben por pantalla de 900 px | Buscador |
|---|---|---|---|
| Alerta clínica | 658 px | 1,4 | No |
| Tarjeta de ejercicio | 429 px | 6,3 (3 por fila) | Sí |
| Plantilla | 222 px | 4,1 | Sí |
| Membresía | 202 px | 4,5 | No |
| Persona en `/admin` | 146 px | 6,2 | No |
| Paciente en `/screenings` y `/attendance` | 102 px | 8,8 | No |
| Paciente en `/pro/routines` | 66 px | 13,6 (2 por fila) | No |

De los 658 px de una alerta, **420 son evidencia desplegada**: la pantalla dibuja las tres
sesiones que motivaron el aviso, cada una con su nivel de dolor, su nota y su enlace. La
tarjeta de ejercicio dedica 254 de sus 429 px a la imagen, el 59 %.

La última fila es la referencia: `/pro/routines` resuelve un paciente en 66 px y se lee
igual de bien. La densidad no es una carencia del sistema de diseño; es una decisión que
solo se tomó en una pantalla.

## 3. Proyección a 200 pacientes y un año de alertas

Alto de fila medido × 200, más la cabecera real de cada pantalla.

| Ruta | Alto | Pantallas |
|---|---|---|
| `/pro/alerts` | 136.000 px | 151 |
| `/memberships` | 43.600 px | 48 |
| `/admin` | 33.500 px | 37 |
| `/screenings`, `/attendance` | 23.600 px | 26 |
| `/pro/routines` | 8.450 px | 9,4 |

Ninguna de estas pantallas tiene hoy buscador ni paginación. Las secciones 1 a 4 de
`improve-frontend-ux` se los añaden, con lo que el recorrido baja al de una página; la fase
5 baja además el alto de cada fila y el coste de abrir un detalle.

## 4. Recorrido de navegación

Saltos de página desde el panel del profesional hasta cada dato de un paciente, contados
sobre las rutas actuales.

| Para ver de un paciente… | Ruta | Saltos |
|---|---|---|
| Su rutina | `/pro/routines` → `/pro/routines/[id]` | 2 |
| Sus sesiones | `/pro/sessions?patient=[id]` | 2 |
| Sus alertas | `/pro/alerts` + búsqueda visual | 1 + recorrer |
| Su tamizaje | `/screenings` → `/screenings/[id]` | 2 |
| Su asistencia | `/attendance` → `/attendance/[id]` | 2 |
| Su membresía | `/memberships` | 1 + recorrer |
| Su perfil y condiciones | `/admin` → `/people/[id]` | 2 |
| **Su evolución** | `/screenings` → `/screenings/[id]` → `/evolution/[id]` | 3 |

`/evolution/[patientId]` no tiene entrada de menú: sus dos únicos enlaces entrantes están al
final de `app/(progress)/attendance/[patientId]/page.tsx` y de
`app/(progress)/screenings/[patientId]/page.tsx`.

## 5. La vista del paciente

Medida con `laura.perez.demo@demo.local`, la paciente que tiene rutina activa, 10 sesiones,
4 tamizajes y 2 membresías. Ventana de 500×667.

| Vista | Alto | Pantallas |
|---|---|---|
| `/patient` | 767 px | 1,15 |
| `/attendance/me` | 667 px | 1,00 |
| `/memberships/me` | 667 px | 1,00 |
| `/routine` (2 días, 18 ejercicios) | 2.481 px | 3,72 |
| `/patient/profile` (3 formularios, 43 campos) | 2.131 px | 3,19 |

### La sesión en curso

Un día de cuatro ejercicios. **Corrige una suposición anterior:** los formularios de registro
**no** están abiertos a la vez. Cada ejercicio los guarda dentro de un `<details>` cerrado,
igual que el «Ver cómo se hace». El problema no es que esté todo abierto.

| Estado | Alto | Pantallas |
|---|---|---|
| Los cuatro plegados | 1.493 px | 2,24 |
| Un ejercicio abierto | 2.461 px | 3,69 |
| Los cuatro abiertos | 5.365 px | 8,04 |

**Un solo formulario de registro mide 968 px**: metro y medio de pantalla de teléfono para
un ejercicio. Al abrirlo hay que desplazarse *dentro* del ejercicio para llegar al botón de
guardar, con la serie esperando. Ahí es donde hay que trabajar, no en el plegado, que ya
está bien resuelto.

La pantalla transfiere **758 KB** y monta **1.486 elementos `<option>`** en el DOM: es el
catálogo de 868 ejercicios viajando al teléfono para llenar el selector de sustitución. Lo
acota la tarea 8.6 del change.

## 5 bis. Vista de lista del catálogo: antes y después

Primera mejora de la fase 5 (tarea 14.3), medida el 2026-09-07. La vista de tarjetas se
conserva intacta y sigue siendo la de partida; la de lista se elige con el conmutador y su
estado viaja en la URL.

| | Tarjetas | Lista |
|---|---|---|
| Alto de una fila | 429 px (254 de imagen) | **65 px** (miniatura de 48) |
| Ejercicios por página | 24 | 60 |
| Alto de página a 1440×900 | 4.601 px · 5,11 pantallas | 4.636 px · 5,15 pantallas |
| Alto de página a 500×667 | 14.498 px · 21,74 pantallas | 5.020 px · 7,53 pantallas |
| **Coste por ejercicio a 500 px** | **604 px** | **66 px** |

La lectura correcta no es el alto de página —la lista trae dos veces y media más ejercicios
en el mismo espacio— sino **el coste por ejercicio: nueve veces menor en pantalla estrecha**.

Puestos a comparar lo mismo con lo mismo, **los mismos 24 ejercicios**:

| Ancho | Tarjetas | Lista | Diferencia |
|---|---|---|---|
| 1440 px | 4.601 px · 5,11 pantallas | ~2.300 px · 2,55 pantallas | la mitad |
| 500 px | 14.498 px · 21,74 pantallas | ~2.600 px · 3,90 pantallas | **5,6 veces menos** |

Recorrer el catálogo entero (868 ejercicios) pasa de 37 páginas a 15.

**Cómo se midió sin sesión en el navegador.** La pestaña de Chrome no tenía sesión de
personal. En vez de bloquearse, se pidió cada pantalla con el cliente HTTP de las propias
suites, se guardó su HTML en `public/` quitando **solo** los `<script src>` —los scripts en
línea hay que conservarlos: Next transmite la pantalla en trozos y son ellos los que sacan el
contenido real del `<div hidden>` en el que llega— y se midió ese archivo, servido desde el
mismo origen para que el CSS resolviera. Los dos archivos se borraron al terminar. Es una
técnica reutilizable cada vez que haga falta medir una pantalla con guarda de rol.

## 5 ter. Perfil del paciente: antes y después

Segunda mejora de la fase 5 (tarea 17.3), medida el 2026-09-07 sobre la misma paciente
(`laura.perez.demo@demo.local`) y la misma ventana de 500×667, con la única diferencia del
plegado. La tarjeta «Perfil de entrenamiento» abría con los cuatro grupos de opciones del
formulario —dieciocho controles— aunque solo se entrara a comprobar el objetivo. Ahora abre
con cuatro pares etiqueta/valor y el formulario espera detrás de «Editar mi perfil».

| | Alto | Pantallas |
|---|---|---|
| Antes (formulario desplegado) | 2.625 px | 3,94 |
| **Después (resumen)** | **1.177 px** | **1,76** |

**Un 55 % menos**, y lo que se ve al entrar pasa de ser un formulario a ser la respuesta a la
pregunta que traía el paciente.

El formulario **no se movió de sitio ni cambió de orden**: sigue siendo el primero de la
pantalla con `name="goal"`. Un `<details>` cerrado emite igualmente su contenido en el HTML
del servidor, que es lo que separa esta solución de un diálogo (ADR-0008).
`npm run test:people` sigue en 10/10.

## 5 quater. Portada del paciente: antes y después

Tercera mejora de la fase 5 (tarea 17.5), medida el 2026-09-07 con la misma paciente
(`laura.perez.demo@demo.local`) y la misma ventana, que en esta sesión Chrome sirvió como
500×723. La portada eran cuatro tarjetas con los mismos cuatro destinos de la barra
inferior; ahora es la semana con el día de hoy marcado, la racha y la sesión en curso.

| | Contenido de `<main>` | Alto de página | Pantallas |
|---|---|---|---|
| Antes (4 tarjetas de destino) | 748 px | 815 px | 1,13 |
| **Después (semana, racha, sesión)** | **574 px** | **723 px** | **1,00** |

Un 23 % menos de contenido y, sobre todo, **deja de haber desplazamiento**: la portada
entera cabe sin mover el dedo. Los cuatro destinos no se perdieron —siguen en la barra
inferior del teléfono y en la lateral del escritorio, que es de donde estaban copiados—, así
que lo que se quitó era literalmente un duplicado.

Lo que ocupa ese espacio ahora responde a algo que antes no se podía saber sin entrar a
mirar: en qué día de la semana está el paciente, en cuáles entrenó, cuántas semanas
seguidas lleva y si dejó una sesión a medias.

**La racha se cuenta por semanas, no por días.** Quien entrena tres veces por semana —que es
lo normal— nunca pasaría de una racha de un día, y una cifra que siempre vale 1 no informa
de nada. La semana en curso no rompe la racha mientras no termine.

La pantalla conserva **un solo `<form>`**, el de cerrar sesión del shell, que es lo que
`verify-auth-screens` envía al pedir `/patient`. La tira de la semana es un Server Component
sin formulario ni estado.

## 6. Dos fallos encontrados al medir, ya corregidos

Ninguno es de diseño. Los dos bloqueaban la demostración y se arreglaron en el sitio.

**1. Los pacientes de demostración no podían pasar del alta.**
`scripts/seed-progress-demo.ts` creaba a Laura y a Marcos con su rutina, sus sesiones, sus
tamizajes y sus membresías, pero **nunca escribía su fila de `patient_details`**. Al iniciar
sesión, `getActiveProfile` los mandaba a `/patient/onboarding` y todo lo sembrado quedaba
inalcanzable: la vista del paciente no se podía enseñar. El seed ahora termina el alta
(`onboarding_step = 3`) con un objetivo, un nivel, un entorno y un equipamiento coherentes
con la rutina de cada uno.

**2. `listUsers` fallaba y con él todo el seed.**
El síntoma —«Database error finding users»— se venía atribuyendo al contenedor de auth. No
era el contenedor: el usuario residual `repro-onb@demo.local`, dejado por la reproducción de
la incidencia de onboarding, se insertó a mano con columnas NULL que GoTrue lee como
cadenas y fechas no nulas:

```
Scan error on column index 3, name "confirmation_token": converting NULL to string
Scan error on column index 5, name "created_at": unsupported Scan, storing nil into *time.Time
```

Cualquier llamada a `/auth/v1/admin/users` devolvía 500, así que `seed:progress-demo` no
había llegado a completarse nunca desde entonces. Se rellenaron las columnas NULL de esa
fila —no se borró: no tiene contraseña ni ningún dato colgando, y sigue sirviendo de
fixture—. Conviene decidir si se elimina.

> **Cómo reconocerlo otra vez.** Si un script que usa la API de administración falla con
> «Database error finding users», mira los logs del contenedor
> (`docker logs supabase_auth_plataforma-fisio-training | grep Scan`) antes de reiniciar
> nada. Casi siempre es una fila de `auth.users` insertada por SQL sin sus columnas de
> texto a `''`.

## 7. Lo que falta por medir

**Un teléfono real de 375 px.** Chrome no sirve ventanas más estrechas que 500 px, y la
rejilla del catálogo cambia de columnas justo en ese tramo. Es la tarea 13.5 del change y el
día 10 del plan de verificación.

## 3 bis. La misma proyección con la fase 1 puesta (2026-09-07)

Cerradas las secciones 1 a 4, las nueve listas del personal tienen filtro y ocho paginan.
Esta tabla repite la proyección del punto 3 —doscientos pacientes, un año de alertas— con
el tope por página que impone cada listado, usando las mismas alturas de fila medidas en el
punto 2.

| Ruta | Filas por página | Antes | Después | Pantallas |
|---|---|---|---|---|
| `/pro/alerts` | 20 | 136.000 px · 151 | ≈ 5.100 px | 5,7 |
| `/memberships` | 24 | 43.600 px · 48 | ≈ 5.100 px | 5,7 |
| `/screenings`, `/attendance` | 24 | 23.600 px · 26 | ≈ 2.550 px | 2,8 |
| `/pro/routines` | 24 (2 por fila) | 8.450 px · 9,4 | ≈ 900 px | 1,0 |
| `/templates` | 24 (2 por fila) | — | ≈ 2.800 px | 3,1 |
| `/pro/sessions` | 20 | sin tope (`.limit(50)` fijo) | acotado y con total | — |
| `/offer` | sin tope, a propósito | — | — | — |

Lo que cambia no es solo la altura: **antes ninguna de estas pantallas tenía un tope**. Con
doscientos pacientes, `/pro/alerts` medía ciento cincuenta y una pantallas y no había forma
de acortarla; ahora son veinte alertas por página con cuatro filtros encima. `/pro/sessions`
traía las cincuenta últimas sesiones sin decirlo: ahora trae veinte, dice cuántas hay en
total y deja acotarlas por estado y por fechas.

**Lo que falta medir aquí.** Las cifras de «después» son la proyección del punto 3 aplicada
al tope de página, no una medición nueva en Chrome, y hay dos filas que cambiaron de alto y
habría que volver a medir: la alerta clínica —la evidencia se pliega desde 14.5, de ~658 px
a ~240— y el paciente de `/pro/routines`, que ganó la insignia de estado de la rutina y el
enlace «Ver ficha». La medición hay que tomarla en una ventana de Chrome real: el navegador
integrado suspende el cálculo de estilo cuando emula un viewport mayor que su propio panel y
devuelve todas las alturas a cero.

## 3 ter. Los formularios largos y los historiales (2026-09-07)

Puntos 3, 4 y 5 del orden de ejecución del [doc 14](14-auditoria-de-vistas.md): los
historiales de un paciente, los formularios que seguían abiertos y la banda de pestañas.

**Cómo se midió.** Recuento sobre el HTML del servidor, con sesión de `admin@demo.local` y
el paciente «Laura Pérez (demo)», contra el build de producción en el 3000; primero con la
rama tal como estaba y después con los cambios puestos (`git stash` de por medio, dos
compilaciones). `plegado` cuenta los `<summary>`: uno por bloque que espera a que lo abran.

| Ruta | kB | `<form>` | campos | casillas | plegado | `<li>` |
|---|---|---|---|---|---|---|
| `/attendance/[id]` | 30 → 31 | 2 | 2 → 3 | 0 | 0 | 21 → 27 |
| `/screenings/[id]` | 37 | 2 | 11 | 0 | **0 → 1** | 17 → 23 |
| `/plans` | 106 | 24 | 56 | 0 | **10 → 12** | 37 |
| `/memberships` | 61 | 9 | 39 | 0 | **4 → 5** | 17 |
| `/exercises/new` | 41 | 2 | 4 | 39 | **0 → 1** | 13 |
| `/rules/new` | 40 | 2 | 5 | 32 | **0 → 1** | 13 |
| `/people/[id]` | 36 → 38 | 3 | 3 | 19 | 2 | 13 → 19 |

**Cómo se lee.** El peso del documento casi no cambia y no debe cambiar: un `<details>`
cerrado **emite igual su contenido**, que es justo lo que permite plegar sin romper las
dieciocho suites. Lo que cambia es cuánto hay delante del usuario al entrar:

| Pantalla | Lo que deja de verse al entrar |
|---|---|
| `/screenings/[id]` | 9 campos de 11: la grasa corporal y las ocho medidas de cinta métrica. Quedan la fecha, el peso, la talla y las observaciones |
| `/exercises/new` | 12 casillas de contraindicación y el selector de nivel; los tres etiquetados obligatorios pasan a dos columnas |
| `/rules/new` | Los dos campos de edad; los seis criterios pasan a dos columnas |
| `/plans` | Los dos formularios de alta —plan y servicio—, que estaban abiertos al final de cada sección |
| `/memberships` | El formulario de alta del final |

Los seis `<li>` que ganan `/attendance/[id]`, `/screenings/[id]` y `/people/[id]` son la
banda de pestañas del paciente: seis enlaces, ningún `<form>`.

**Lo que sigue sin medirse en píxeles.** Igual que en el punto 3 bis: el navegador
integrado suspende el cálculo de estilo y devuelve todas las alturas a cero
(`visibilityState: "hidden"`, ventana de 0×0), y no hay ninguna ventana de Chrome real
conectada a esta sesión. El recuento de arriba sí es una medición; el alto en píxeles de
estas siete pantallas queda pendiente (tarea 18.4).

## 3 quater. El detalle en diálogo y el registro de sesión (2026-09-08)

Puntos 6 y 7 del orden de ejecución del [doc 14](14-auditoria-de-vistas.md): leer un detalle
sin cambiar de pantalla, y acortar el registro de un ejercicio.

**Cómo se midió.** Peso del HTML del servidor pedido por HTTP con el cliente de las propias
suites, contra `next dev` recién arrancado en dos pasadas —la rama tal cual y con los cambios
puestos, con `git stash` de por medio y el servidor reiniciado entre ambas, porque el
compilador incremental contamina la medida—. Las alturas en píxeles, en el navegador
integrado a 375×812; hay que forzar un repintado antes de leerlas (una captura basta) o
devuelve ceros.

### Peso del documento

| Ruta | Antes | Después | |
|---|---|---|---|
| `/exercises` (24 tarjetas) | 298,9 kB | **195,8 kB** | −34 % |
| `/exercises?vista=lista` (60 filas) | 533,8 kB | **295,8 kB** | −45 % |
| `/routine/sessions/[id]` (4 ejercicios) | 402,1 kB | **234,2 kB** | −42 % |
| `/pro/sessions?patient=…` (16 sesiones) | 154,6 kB | 170,3 kB | +10 % |
| `/pro/alerts` (1 alerta, 3 sesiones) | 128,1 kB | 151,8 kB | +19 % |

**El catálogo adelgaza al abrir la ficha en un diálogo, que es lo contrario de lo que
parece.** La razón no es la ficha: es que la fila y la tarjeta pasaron de renderizarse en el
servidor a construirse en el cliente a partir del ejercicio. Las props de un componente de
cliente viajan serializadas en el documento, y **el árbol de React de una tarjeta pesa unas
veinte veces más que los datos con los que se construye**. La primera versión pasaba la fila
ya pintada como `children` y llevó `/exercises` a 623 kB; pasando el dato, a 195.

Lo mismo explica las dos subidas: son datos que antes no viajaban —los informes de las
sesiones de la página—, y compran leer una sesión sin abandonar la lista. Un kilobyte por
sesión.

### La sesión en curso, a 375 px

Un día de cuatro ejercicios, el mismo del punto 5.

| Estado | Antes | Después |
|---|---|---|
| Al entrar en la pantalla | 1.493 px (los cuatro plegados) | 2.482 px (el primer pendiente **abierto**) |
| Los cuatro abiertos | 5.365 px | **4.276 px** |
| **Un formulario de registro** | **968 px** | **598 px** |
| El mismo, con zona, motivo y sustitución | — | 1.122 px |
| `<option>` en el documento | 1.486 | **637** |

Las tres cosas que lo acortan:

1. **Zona del dolor, motivo y sustitución esperan plegados.** No son opcionales siempre —Zod
   exige la zona con dolor o al saltar, el motivo al saltar—, así que el bloque **se abre
   solo** en cuanto pasan a hacer falta, y también cuando la validación falla. Sin JavaScript
   está a un toque. Es la regla del punto 4 llevada un paso más allá: no «obligatorio u
   opcional», sino *cuándo* es obligatorio.
2. **El catálogo de sustitución llega acotado.** `replacementExercises` recibe los grupos
   musculares del día y filtra en la base con `overlaps`, con tope de 200. Las 868 filas del
   catálogo eran 1.486 `<option>` viajando al teléfono a mitad de entrenamiento.
3. **La zona del dolor arranca en las cinco del grupo muscular** del ejercicio, no en las
   doce. La lista completa sigue a un toque.

La pantalla es más alta al entrar porque ahora trae dos cosas que antes no: la banda de
avance (197 px, fija) y el primer ejercicio pendiente ya abierto. Ese es el intercambio: se
entra viendo lo que se viene a hacer, en vez de una lista de cuatro bloques cerrados.

**Lo que no se puede medir en píxeles aquí.** El desplazamiento que uno se ahorra. Antes,
cerrar la sesión estaba al final de la pantalla —2.500 px abajo— y no había forma de saltar
al tercer ejercicio sin recorrer el segundo. Ahora las dos cosas están en la banda.

### `/routine`, con los días plegados (punto 7a)

Mismo teléfono, la misma rutina de dos días con cuatro ejercicios cada uno, y el mismo
historial de sesiones debajo (1.022 px en las dos medidas).

| | Antes | Después |
|---|---|---|
| El bloque de la rutina | 1.382 px | **482 px** |
| La pantalla entera | 2.787 px | **2.057 px** |
| Peso del documento | 163,4 kB | **121,8 kB** |
| Con los dos días abiertos | — | 3.049 px |

**La rutina cabe ahora en media pantalla de teléfono.** Cada día es un bloque con lo que hace
falta para decidir —título, cuántos ejercicios y el botón de empezar— y la lista de ejercicios
detrás de «Ver los ejercicios». Antes había que recorrer nueve ejercicios para llegar al
botón del segundo día.

Los 2.057 px de la pantalla entera incluyen algo que antes no estaba: la tarjeta de la sesión
a medias, arriba del todo. Quien dejó una sesión abierta la reanuda desde la primera línea, en
vez de descubrir al pulsar «Iniciar» que ya tenía una empezada.

## 4 bis. El menú, de trece entradas a ocho (2026-09-10)

Ticket **KAN-11**, fase 2.1 y 2.2 del [plan de mejora](16-plan-de-mejora.md). Es la medición
«después» del punto 4: no cambia ninguna ruta, cambia cuántas se enseñan a la vez.

**Cómo se midió.** Sesión de cada rol abierta por HTTP con el cliente de las propias suites
(`scripts/helpers/auth-http.mjs`) contra un `next start` de producción en el 3000, contando
los `<a>` del `<nav aria-label="Secciones">` del HTML del servidor. Las plazas de la barra
del teléfono, en el navegador integrado a 375×812.

| Rol | Entradas antes | Entradas después | En la barra del teléfono |
|---|---|---|---|
| Admin | 13 en 5 grupos | **8** | 5 + «Menú» (antes 4 + «Menú») |
| Profesional | 12 en 5 grupos | **8** | 5 + «Menú» (antes 4 + «Menú») |
| Paciente | 6 en 1 grupo | 6 | **6, todas** (antes 4 + «Menú») |

La barra pasó de cinco plazas a seis. A 375 px cada objetivo mide 62 px de ancho, por encima
de los 44 px mínimos, y ningún rótulo parte en dos líneas.

**Lo que dejó de esconderse.** El admin veía 4 de 13 (31 %); ahora ve 5 de 8 (63 %). El
paciente veía 4 de 6 y ahora ve las 6. Y el panel de «Menú» lista las ocho secciones **con
sus apartados**, así que es el mapa completo de la aplicación en una pantalla, no una segunda
lista que hay que recorrer.

Tres grupos colapsaron en una entrada con pestañas dentro:

| Entrada | Apartados | Quién los ve |
|---|---|---|
| Catálogo | Ejercicios · Plantillas · Asignación | «Asignación» solo el admin |
| Seguimiento | Tamizaje · Asistencia | los dos |
| Negocio | Planes · Membresías · Vitrina | «Planes» solo el admin |

**Saltos entre pantallas hermanas: de 2 a 1.** Antes, ir de `/exercises` a `/rules` eran dos
saltos —abrir el menú, elegir el grupo, elegir la entrada— y en el teléfono tres, porque
«Reglas» vivía detrás de «Menú». Ahora las hermanas están en la banda de pestañas de la
propia pantalla, a un toque, que es lo que ya hacía `PatientTabs` con las seis vistas de un
paciente y ahora comparte marcado con ellas (`components/shell/TabBar.tsx`).

**Ningún enlace del menú rebota.** Comprobado por HTTP: las trece rutas del admin y las once
del profesional devuelven 200 con la sesión de ese rol. Antes, `/plans` le devolvía al
profesional una redirección desde el botón «Planes y servicios» del panorama del negocio
(defecto **D3**).

## 4 ter. `/admin` y `/pro` dejan de ser la misma pantalla (2026-09-10)

Ticket **KAN-5**, fase 2.3 del [plan de mejora](16-plan-de-mejora.md). Hasta aquí las dos
rutas renderizaban `StaffHome` con los **mismos siete KPI**; lo único que cambiaba eran los
títulos y un par de frases. Eran dos preguntas distintas metidas en una pantalla: «¿cómo va
el negocio?» y «¿qué tengo que atender hoy?».

**Cómo se midió.** Sesión de cada rol contra un `next start` de producción en el 3000.
`document.documentElement.scrollHeight / innerHeight` en el navegador integrado a 1440×900;
el peso, sobre el HTML del servidor pedido con el cliente de las propias suites.

| | Antes (las dos) | `/admin` después | `/pro` después |
|---|---|---|---|
| KPI en pantalla | **7** | **3** | **3** |
| Qué responde | las dos preguntas a la vez | el mes del negocio | el trabajo de hoy |
| Pantallas de recorrido | 2,46 (§1) | **1,00** | **1,00** |
| Peso del documento | — | 50,0 kB | 42,5 kB |

```
/admin  Clientes activos · Cumplimiento · Asistencia
/pro    Mis alertas · Sesiones de hoy · Tamizajes pendientes
```

**Las dos caben en una pantalla sin desplazarse**, que es lo que pide el criterio de KAN-5:
comunicar el estado en pocos segundos.

**Lo que salió, y a dónde fue.** «Membresías por vencer» era el séptimo KPI y estaba en las
dos pantallas. Es del administrador —la matriz de [`04`](04-roles-y-permisos.md) lo decide
así— y vive en `/memberships`, a un toque desde la fila de enlaces del panorama y desde el
menú. El profesional deja de ver el cumplimiento y la asistencia del negocio del mes: no son
suyos y no le dicen qué hacer ahora.

**Consultas por pantalla.** `/pro` deja de pedir `business_overview` y `/admin` deja de pedir
el panel de trabajo. El profesional pasa de siete consultas a cuatro; el administrador, de
siete a tres.
