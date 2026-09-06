## 1. Base de autenticación

- [x] 1.1 Configurar Supabase Auth con correo y contraseña y verificar que `supabase start` local permite registrar e iniciar sesión
- [x] 1.2 Implementar `lib/supabase/server.ts` y `lib/supabase/browser.ts` y verificar que una página server-side lee la sesión
- [x] 1.3 Implementar el middleware de refresco de sesión y verificar que la sesión sobrevive a recargar la página
- [x] 1.4 Crear el trigger que inserta en `profiles` al crear un usuario y verificar con `npm run db:reset` que ningún usuario queda sin perfil

## 2. Autorización

- [x] 2.1 Implementar las funciones `current_role()`, `is_admin()` y `treats_patient()` y verificar cada una con consultas directas en `psql`
- [x] 2.2 Escribir las políticas RLS de `profiles`, `patient_details`, `patient_conditions` y `care_assignments` según la matriz de `docs/04-roles-y-permisos.md`
- [x] 2.3 Verificar los seis casos del camino 9 del plan de verificación contra la API, no por la interfaz
- [x] 2.4 Añadir la restricción `check` de especialidad y verificar que rechaza profesional sin especialidad y paciente con especialidad

## 3. Pantallas de sesión

- [x] 3.1 Pantalla de inicio de sesión con validación Zod y mensajes en español; verificar que un correo inexistente y una contraseña mala dan el mismo mensaje
- [x] 3.2 Redirección por rol tras iniciar sesión y verificar que un `patient` que navega a `/admin` termina en `/patient`
- [x] 3.3 Cierre de sesión y recuperación de contraseña; verificar que llega el correo en el entorno local de Supabase
- [x] 3.4 Bloquear el acceso de personas con `is_active = false` en login, middleware y callback; verificar que no se conserva una sesión de aplicación

## 4. Gestión de personas

- [x] 4.1 Panel de administración: listado de personal con su especialidad y estado; verificar que solo un `admin` accede
- [x] 4.2 Alta de profesional (formulario + server action) y verificar que el nuevo profesional puede iniciar sesión
- [x] 4.3 Alta de paciente por un profesional, creando la asignación de cuidado; verificar que el paciente aparece en su lista y no en la de otro profesional
- [x] 4.4 Baja lógica de personal y de pacientes con confirmación; verificar que el historial sigue consultable
- [x] 4.5 Asignar un segundo profesional de distinta especialidad y verificar que se rechaza un segundo del mismo tipo

## 5. Onboarding del paciente

- [x] 5.1 Definir el vocabulario de partes del cuerpo en `lib/catalog/body-parts.ts` y los esquemas Zod del perfil
- [x] 5.2 Paso 1 — objetivo y nivel; verificar que se guarda al avanzar
- [x] 5.3 Paso 2 — entorno y equipamiento; verificar en móvil de 375 px que se usa con el pulgar
- [x] 5.4 Paso 3 — condiciones y limitaciones; verificar que una parte del cuerpo fuera del vocabulario es rechazada
- [x] 5.5 Bloquear el resto de la aplicación hasta completar el onboarding y verificar que un paciente ya registrado no lo repite
- [x] 5.6 Edición posterior del perfil y de las condiciones; verificar que un profesional no asignado no puede editarlas

## 6. Cierre

- [x] 6.1 Ampliar el seed con los cuatro usuarios de prueba de `docs/08-onboarding-equipo.md` y verificar que los cuatro inician sesión
- [x] 6.2 Ejecutar el camino 1 completo del plan de verificación y registrar el resultado

## Evidencia de cierre — 2026-09-05

La comprobación de 375 px se realizó en el navegador integrado (375 × 812),
según lo solicitado para esta revisión. No sustituye el recorrido en un teléfono
físico antes de la demo.

| Tarea | Evidencia contrastada |
|---|---|
| 4.1 | `test:people`: «Camino 1 completo por formularios y acciones del servidor» comprueba el panel; `test:auth:screens`: «Cada rol entra a su panel y no puede entrar al de otro» verifica el acceso. Revisión adicional en navegador: Beto aparece con Entrenamiento y Carla con Fisioterapia, ambos con estado Activo. |
| 4.2 | `test:people`: «Admin crea profesional, quien inicia sesión y crea paciente con vínculo automático» y el camino 1 por formularios, con credenciales propias. |
| 4.3 | Los mismos subtests comprueban creación, vínculo automático, presencia en la lista y ausencia para un profesional no asignado. |
| 4.4 | «Baja de paciente impide acceso y conserva historial para su profesional», «Baja de profesional exige confirmar el número vigente y cierra sus vínculos» y confirmación por formulario en el camino 1. |
| 4.5 | «Segundo profesional distinto permitido; duplicado y especialidad falsa rechazados». |
| 5.1 | Vocabulario y esquemas contrastados con «Condiciones inválidas fallan en servidor y API; el cierre es atómico e idempotente». |
| 5.2 | «Paciente nuevo queda bloqueado y retoma cada paso guardado»: consulta de objetivo, nivel y `onboarding_step` después del envío. |
| 5.3 | Navegador a 375 × 812: documento de 375 px, opciones de 56 px mediante sus etiquetas, continuar de 48 px y regresar de 44 px; selección de casa y bandas. La persistencia del paso se comprueba además en `test:people`. |
| 5.4 | «Condiciones inválidas fallan en servidor y API; el cierre es atómico e idempotente»: rechaza zona ajena al vocabulario sin escritura parcial. |
| 5.5 | «Paciente nuevo queda bloqueado y retoma cada paso guardado» y el subtest de cierre comprueban bloqueo inicial y redirección al panel después de completar. |
| 5.6 | «Perfil y condición editables por asignado; otro profesional no puede leer ni escribir» y edición posterior por acciones HTTP en el camino 1. |
| 6.2 | «Camino 1 completo por formularios y acciones del servidor», registrado también en `docs/07-plan-de-verificacion.md`. |

Robustez: `npm run test:auth:resilience` comprueba 14 casos con módulos reales de
sesión, acciones y formularios, React 19 y un DOM de `jsdom`; Supabase y los
adaptadores de Next se sustituyen para inyectar el fallo. Verifica excepciones de
Auth, lecturas que fallan una vez, límite de dos intentos, conservación de objetivo,
nivel y notas, reenvío de los mismos valores y un solo reintento automático del
error boundary. Resultado con el código anterior recuperado de Git en una copia
temporal: 0/14; con el arreglo: 14/14. No se revirtieron archivos del árbol compartido.

`jsdom` se añade solo como dependencia de desarrollo para observar el reinicio real
de formularios de React; devolver `{ error }` por sí solo no conserva los campos.
El formulario cancela el evento nativo de reinicio, sin persistir borradores
en almacenamiento local. La edición posterior comprueba una sesión activa sin imponer un
rol único: paciente y equipo conservan el acceso que decide RLS.
