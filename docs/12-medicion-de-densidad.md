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
