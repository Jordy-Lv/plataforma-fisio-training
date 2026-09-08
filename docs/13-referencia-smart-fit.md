# El estándar de manejo: qué copiar de Smart Fit y qué no

Referencia tomada de la app de Smart Fit (versión 4.9.12, iOS, septiembre de 2026) sobre seis
capturas: portada, Rutinas/Smart, Rutinas/Explorar, Salud/Resumen y Cuenta. Sirve para fijar
qué se entiende por «cómodo» en este proyecto, con ejemplos que el cliente reconoce.

No se copia el aspecto —la identidad de AmadorTrainer ya está decidida y es propia—, se copian
**las decisiones de manejo**. Da la casualidad de que las dos apps son oscuras con acento
ámbar, así que la comparación es especialmente directa.

---

## 1. Los seis patrones que hay que adoptar

### 1.1 Las colecciones crecen a lo ancho, no a lo largo

Es el patrón que más comodidad aporta y el que más nos separa. Smart Fit no apila nunca una
colección en vertical: «Impulsa tus resultados», «Entrenamientos HIT» y «Rutinas
recomendadas» son **carruseles horizontales** con la siguiente tarjeta asomando por el borde
derecho, que es lo que le dice al ojo que hay más. Tres colecciones enteras caben en dos
pantallas.

Nuestro catálogo hace justo lo contrario: 24 tarjetas apiladas son **15.561 px, 23 pantallas**
(`docs/12-medicion-de-densidad.md`). La página vertical se reserva para la lista que se
recorre buscando algo; las colecciones que se ojean van en horizontal.

### 1.2 Pestañas dentro de la sección, no rutas nuevas

«Smart · Explorar · Guardados» en Rutinas. «Resumen · Body» en Salud. Cambiar de pestaña no
cambia de pantalla ni pierde el sitio: la cabecera, el título y la barra inferior se quedan
donde están.

Es exactamente la banda de pestañas del paciente de las secciones 5 y 6 del change. La
referencia la confirma y añade un detalle: **la pestaña activa se marca con un subrayado
ámbar de dos píxeles, no con un fondo**. Un fondo pesa demasiado para algo que se cambia
constantemente.

### 1.3 La lista de destinos es una fila de 56–64 px con icono y chevron

La pantalla «Cuenta» mete **siete destinos** —Invitado, Datos de pago, Datos personales,
Preguntas frecuentes, Documentos, Apariencia, Conexiones externas— más cuatro datos de perfil
en una sola pantalla. Icono a la izquierda, etiqueta, chevron a la derecha, separador de un
píxel entre filas. Sin tarjetas, sin sombras, sin bordes redondeados por fila.

Es la `ExerciseRow` que ya se construyó. La referencia valida la medida y añade el chevron
como señal de «esto lleva a otro sitio».

### 1.4 Un perfil se lee; editarlo es entrar a otro sitio

Smart Fit abre la cuenta con **el dato en texto plano**: Objetivo, Historial de entrenamiento,
Conocimiento sobre el entrenamiento, Frecuencia. Cuatro pares etiqueta/valor, ni un campo de
formulario. Para cambiar algo se entra a «Datos personales».

Nuestro `/patient/profile` hace lo contrario: **43 campos en 3 formularios, 3,19 pantallas**,
todos abiertos, aunque el paciente solo entrara a comprobar cuál era su objetivo. Es el
cambio de mayor rendimiento de toda la vista del paciente.

### 1.5 La portada da contexto temporal antes que menú

La primera fila de Smart Fit es la semana —D 6, **Hoy 7**, M 8, M 9, J 10, V 11, S 12— con la
racha de semanas a la izquierda. Antes de cualquier contenido, el paciente sabe en qué día
está y si ha entrenado.

Nuestro `/patient` es hoy **un duplicado de la barra inferior**: cuatro tarjetas que repiten
los mismos cuatro destinos que ya están abajo. La propia propuesta lo señala (tarea 9.4) y la
referencia dice con qué llenarlo.

### 1.6 La cabecera de sección lleva sus acciones en píldoras a la derecha

«Rutinas» a la izquierda; «Calendario» y el menú de tres puntos a la derecha, en píldoras de
borde fino. Y cada colección lleva su «Ver todos» a la derecha del título, alineado con él.
Nuestro `PageHeader` ya acepta `actions`, así que es aplicarlo, no construirlo.

---

## 2. Lo que **no** hay que copiar

- **El contenido bloqueado tras un desenfoque con botón «Desbloquear».** En Salud, la
  evolución corporal aparece borrosa hasta contratar. Es un patrón de venta; aquí son datos
  clínicos del propio paciente y ocultarlos sería indefendible.
- **La foto de catálogo como protagonista.** En Smart Fit la imagen es marketing y ocupa media
  tarjeta. En un catálogo clínico la imagen sí informa —cómo se ejecuta el movimiento—, pero
  **al abrir el ejercicio, no al buscarlo en una lista de 868**.
- **La cabecera que se cuela bajo la barra de estado.** En la captura de Cuenta desplazada, el
  título del usuario queda por detrás del reloj del sistema. Nuestro `AppShell` ya usa
  `sticky` con fondo y `backdrop-blur`, que es la solución correcta.
- **La pantalla vacía con el vacío centrado a media altura.** Smart Fit deja media pantalla en
  negro antes del mensaje. Nuestro `EmptyState` lo pone arriba, junto al contenido, que se lee
  antes.

---

## 3. Dónde estamos contra ese estándar

| Patrón | Smart Fit | AmadorTrainer hoy |
|---|---|---|
| Barra inferior fija de 5 destinos | Sí, idéntica en todas las pantallas | Sí en el paciente; el personal usa 4 + «Más» |
| Pestañas dentro de la sección | Sí | No — planificado en las secciones 5 y 6 |
| Colecciones en carrusel | Sí | No — todo apilado en vertical |
| Fila densa con icono y chevron | 7 destinos en 1 pantalla | Hecho en `/exercises` (vista de lista); falta el chevron |
| Perfil de lectura, edición aparte | 4 datos en texto plano | 43 campos de formulario, 3,19 pantallas |
| Contexto temporal en la portada | Semana con «Hoy» y racha | Portada duplica la barra inferior |
| Acciones de cabecera en píldoras | Sí | `PageHeader` lo soporta, poco usado |

---

## 4. Qué mide bien esta comparación

Smart Fit resuelve **siete destinos y cuatro datos de perfil en una pantalla**. Nosotros
gastamos **3,19 pantallas en un perfil** y **23 en un catálogo**. Esa es la distancia, y no se
cierra con paleta ni con tipografía: se cierra con altura de fila, revelado progresivo y
colecciones que crecen a lo ancho.
