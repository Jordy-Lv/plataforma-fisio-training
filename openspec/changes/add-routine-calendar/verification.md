# Verificación del calendario

Fecha: 8 de septiembre de 2026. Rama: `feature/create-calendar-to-training`.
Base integrada: `origin/main`, commit `fcee566`.

## Resultado

`bash scripts/verify.sh --full` terminó con código 0 sobre la integración final:
**29 suites y 284 pruebas aprobadas**, sin fallos, pruebas omitidas ni pendientes.
Incluye autenticación, aislamiento RLS, catálogo, asignación, sesiones,
seguimiento, cron, diseño y calendario. La prueba en teléfono físico queda fuera
del alcance de esta PR por indicación explícita del usuario.

| Comprobación | Resultado |
| --- | --- |
| `npm run test:calendar:dates` | 3 pruebas aprobadas. |
| `npm run test:calendar` | 9 pruebas aprobadas: permisos, programación/cancelación, navegación y recorrido completo desde asignación hasta sesión completada. |
| Resto de suites `test:*` | 272 pruebas aprobadas. |
| `npm run typecheck`, `npm run lint`, `npm run build` | Aprobados. |
| `npm run db:reset` aislado | Aprobado desde cero con las dos migraciones del calendario. |
| Tipos de base de datos | Regenerados; coinciden con la base reconstruida tras integrar `main`. |
| `npm run db:clean` | Aprobado antes y después: 868 ejercicios importados, 0 personalizados, 0 alertas y 7 usuarios oficiales. |
| OpenSpec y diferencias | Validación estricta y `git diff --check` aprobados. |

## Integración con main

Se conserva el editor de rutinas actual: buscador único y permanente, filtros,
paginación, pestañas del paciente y confirmación al reemplazar una rutina activa.
Los enlaces, filtros y formularios conservan `calendarDate` y `calendarView`.
Salir del modo de añadir o sustituir conserva el contexto y mantiene el buscador.

La suite comprueba ambos modos en mes y semana. Además, en el navegador se abrió
una rutina desde la cuadrícula, se buscó «remo» y se volvió al calendario sin
perder la fecha ni la vista. La integración también conserva el flujo actual de
registro, finalización e informe de sesiones del paciente.

## Fecha de asignación

El recorrido completo detectó que, después de las 19:00 en Colombia, la copia de
una plantilla usaba `current_date` en UTC y asignaba un inicio para mañana,
mientras el calendario programaba hoy según Bogotá. La programación se rechazaba
por estar fuera de vigencia.

La migración `20260909023000_routines_align_assignment_calendar_dates.sql`
configura `America/Bogota` únicamente durante `copy_routine_template`. Conserva
su implementación y permisos; la zona del llamador se restaura al terminar.
No modifica fechas históricas.

La prueba recorre día vacío → asignación por formulario → programación →
consulta del paciente → registro de tres ejercicios → cierre → avance de cero
a una sesión completada en ambos calendarios. También fuerza una fecha de
conexión distinta de Bogotá y comprueba inicio, cierre y restauración de la zona.
Todo el recorrido aprobó tras integrar `main`.

## Entorno de las pruebas

Se empleó una copia temporal del código con Supabase `fisio-calendar-reset`
(API 55421, base 55422, Mailpit 55424 y SMTP 55425) y la aplicación en 3001.
En esa copia se adaptaron únicamente los puertos y el nombre del contenedor
que algunas pruebas existentes fijan directamente. El código de la aplicación
y las migraciones son los de la rama.

Se ejecutó el reset y luego las semillas de ejercicios, plantillas, reglas y
seguimiento. Las suites se ejecutaron secuencialmente, con el buzón y servidor
SMTP aislados. El detector de residuos aprobó antes y después sin usar `--fix`.
Los resultados y registros locales están en `_local/calendar-pr-qa/`, excluidos
del repositorio.

La base de trabajo no se reinició y se conserva la cuenta de prueba del usuario.
Ambas migraciones se aplicaron de forma aditiva en el entorno local.

## Recorridos y diseño

- Paciente: mes y semana, navegación por fechas, meta semanal debajo del
  calendario, descripción de rutina al pulsarla y regreso con la fecha/vista
  originales. Las rutinas futuras solo permiten consulta. La ejecución,
  registro y finalización actuales se conservan.
- Profesional y administrador: día vacío válido → programación con la fecha
  elegida → creación/asignación → regreso al calendario. Sin días activos se
  abre directamente la asignación. El paciente no recibe estos controles.
- Cambio manual mediante el selector de fecha: del 8 al 15 de septiembre →
  «Crear o asignar otra rutina» → regreso a la programación del día 15.
- Navegador a 375 × 900: mes y semana sin desborde horizontal;
  `scrollWidth = innerWidth = 375`. Enlaces de rutina de 46,57 × 44 px;
  enlaces de días vacíos de 47,57 × 97 px; selector y fecha de 293 × 48 px;
  botones de 293 × 44 px. Tras integrar `main` se repitieron las vistas de mes,
  semana y editor, confirmando el ancho y los enlaces de rutina.
- Escritorio a 1280 × 960: cuadrícula sin desbordes tras integrar `main`.
- Sin colores literales ni dependencias nuevas. El cambio frente a `main` no
  modifica componentes compartidos de UI, clientes Supabase ni las tablas
  `profiles` y `care_assignments`.

## Limpieza para la PR

Se eliminaron campos e importaciones sin uso, se separó la cuadrícula del
contenido y se centralizaron los estados visuales y el intervalo de fechas.
La unión de sesiones evita recorrer repetidamente el historial. El acceso a
asignación conserva también la fecha editada en el formulario.

El verificador de residuos dejó de depender de cantidades fijas desactualizadas
(867 ejercicios y 3 alertas). Valida el origen importado de los ejercicios y los
usuarios/alertas de las semillas; las suites de semillas siguen comprobando el
contenido del catálogo. También se comprobó que rechaza un residuo temporal y
vuelve a aprobar al retirarlo. No se ejecutó una limpieza sobre datos del usuario.

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
