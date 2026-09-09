# Verificación del calendario

Fecha: 8 de septiembre de 2026. Rama: `feature/create-calendar-to-training`.

## Resultado

Resultado final: **29 suites y 284 pruebas aprobadas**, sin pruebas omitidas ni
pendientes. Incluyen autenticación, aislamiento RLS, catálogo, asignación,
sesiones, seguimiento, cron, diseño y calendario. La comprobación en teléfono
físico queda fuera del alcance de esta PR por indicación explícita del usuario.

Se ejecutó `bash scripts/verify.sh --full` en el entorno aislado tras reconstruir
la base con ambas migraciones del calendario. Aprobó las comprobaciones estáticas
y 28 suites; una expectativa antigua de `test:routines:snapshot` comparaba el
cierre con UTC. Se corrigió para comprobar la fecha de Bogotá y se volvió a
pasar esa suite: 9 pruebas aprobadas. El primer reintento necesitó restaurar la
adaptación del nombre de contenedor de la copia aislada; sus seis usuarios
temporales se retiraron por sus identificadores y la comprobación final de
residuos aprobó.

| Comprobación | Resultado |
| --- | --- |
| `npm run test:calendar:dates` | 3 pruebas aprobadas. |
| `npm run test:calendar` | 9 pruebas aprobadas: permisos, programación/cancelación, navegación y recorrido completo desde asignación hasta sesión completada. |
| Resto de suites `test:*` | 272 pruebas aprobadas, incluida la repetición de snapshot. |
| `npm run typecheck`, `npm run lint`, `npm run build` | Aprobados, sin errores ni advertencias de lint. |
| Reset aislado | Aprobado desde cero con las dos migraciones de calendario y las semillas. |
| Tipos de base de datos | Regenerados desde el entorno con ambas migraciones. |
| `npm run db:clean` | Aprobado antes y después; al final: 866 ejercicios importados, 0 personalizados, 0 alertas y 7 usuarios oficiales. |
| OpenSpec y diferencias | Validación estricta y `git diff --check` aprobados. |

## Corrección de fecha de asignación

El recorrido nuevo reprodujo un fallo después de las 19:00 en Colombia: la
copia de una plantilla usaba `current_date` en UTC y asignaba un inicio para
mañana, mientras el calendario programaba hoy según Bogotá. La programación
se rechazaba por estar fuera de vigencia.

La migración `20260909023000_routines_align_assignment_calendar_dates.sql`
configura America/Bogota únicamente durante `copy_routine_template`. Conserva
su implementación, ejecución con permisos del usuario y permisos existentes;
la zona del llamador se restaura al terminar. No modifica fechas históricas.

La prueba recorre día vacío → asignación por formulario → programación →
consulta del paciente → registro de tres ejercicios → cierre → avance de una
de una sesión en ambos calendarios. También fuerza una fecha de conexión
distinta de Bogotá y comprueba inicio, cierre y restauración de la zona. Pasó
tras la corrección. La migración está aplicada en la base local del usuario;
no se encontraron rutinas activas locales pendientes de corregir por este fallo.

## Entorno de las pruebas

Se empleó una copia temporal del código con Supabase `fisio-calendar-reset`
(API 55421, base 55422, Mailpit 55424 y SMTP 55425) y la aplicación en 3001.
En esa copia se adaptaron únicamente los puertos y el nombre del contenedor
que algunas pruebas existentes fijan directamente. El código de la aplicación
y las migraciones son los de la rama.

Se ejecutó el reset y luego las semillas de ejercicios, plantillas, reglas y
seguimiento. Las suites se ejecutaron de forma secuencial. La suite de correos
de membresías se repitió con `MAILPIT_URL` apuntando al entorno aislado; su
primera ejecución consultaba el buzón del entorno principal. La repetición
aprobó sus 7 pruebas. El detector de residuos se comprobó al finalizar, sin
usar su opción de borrado `--fix`.

La base de trabajo no se reinició. Se conserva la cuenta de prueba del usuario.
Ambas migraciones se aplicaron de forma aditiva en el entorno local.
Los resultados y registros locales están en `_local/calendar-pr-qa/`, excluidos
del repositorio.

## Recorridos y diseño

- Paciente: mes y semana, navegación por fechas, meta semanal debajo del
  calendario, descripción de rutina al pulsarla y regreso con la fecha/vista
  originales. Las rutinas futuras solo permiten consulta.
- Profesional: día vacío válido → programación con la fecha elegida → creación
  o asignación → regreso al calendario. Sin días activos se abre directamente
  la asignación. El paciente no recibe estos controles.
- Cambio manual mediante el selector de fecha: del 8 al 15 de septiembre →
  «Crear o asignar otra rutina» → regreso a la programación del día 15.
- Navegador a 375 × 900: sin desborde horizontal; `scrollWidth = innerWidth = 375`.
  Enlaces de rutina de 46,57 × 44 px; enlaces de días vacíos de 47,57 × 97 px.
  Selector y fecha de 293 × 48 px; botones de 293 × 44 px.
- Escritorio a 1280 × 960: cuadrícula, detalle y formulario sin desbordes.
- Sin colores literales ni dependencias nuevas. No se cambiaron componentes
  compartidos de UI, clientes Supabase ni tablas de perfiles/asignaciones.

## Limpieza para la PR

Se eliminaron campos e importaciones sin uso, se separó la cuadrícula del
contenido y se centralizaron los estados visuales y el intervalo de fechas.
La unión de sesiones evita recorrer repetidamente el historial. El acceso a
asignación conserva también la fecha editada en el formulario.

La revisión adicional corrigió la pérdida del contexto al abrir una rutina
desde la cuadrícula del profesional y al buscar ejercicios en su editor. Los
enlaces y formularios de búsqueda comparten los mismos parámetros de calendario;
cerrar el buscador conserva el regreso a la fecha y vista seleccionadas.

El verificador de residuos dejó de depender de cantidades fijas desactualizadas
(867 ejercicios y 3 alertas). Valida el origen importado de los ejercicios y los
usuarios/alertas de las semillas; las suites de semillas siguen comprobando el
contenido del catálogo. No se ejecutó ninguna limpieza sobre datos del usuario.

## Datos de ejemplo

Con Supabase local encendido, `npm run seed:calendar-demo` carga una semana
ficticia para Diego sin reemplazar una rutina activa creada por el usuario.
El script solo admite Supabase local y no forma parte del seed obligatorio.

- Paciente: `paciente@demo.local` / `demo1234`, en `/routine/calendar`.
- Entrenador: `entrenador@demo.local` / `demo1234`, en
  `/pro/routines/00000000-0000-4000-a000-000000000004/calendar`.
- Ejemplo del 8 de septiembre: lunes completado, miércoles y viernes
  programados; una de tres sesiones completadas.

## Alcance de la comprobación visual

El usuario excluyó explícitamente la prueba en teléfono físico del alcance de
esta PR. No se realizó ni se presenta como aprobada; se mantiene la evidencia
de navegador a 375 px y escritorio.
