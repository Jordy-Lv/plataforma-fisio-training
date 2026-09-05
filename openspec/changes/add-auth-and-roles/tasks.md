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

- [ ] 4.1 Panel de administración: listado de personal con su especialidad y estado; verificar que solo un `admin` accede
- [ ] 4.2 Alta de profesional (formulario + server action) y verificar que el nuevo profesional puede iniciar sesión
- [ ] 4.3 Alta de paciente por un profesional, creando la asignación de cuidado; verificar que el paciente aparece en su lista y no en la de otro profesional
- [ ] 4.4 Baja lógica de personal y de pacientes con confirmación; verificar que el historial sigue consultable
- [ ] 4.5 Asignar un segundo profesional de distinta especialidad y verificar que se rechaza un segundo del mismo tipo

## 5. Onboarding del paciente

- [ ] 5.1 Definir el vocabulario de partes del cuerpo en `lib/catalog/body-parts.ts` y los esquemas Zod del perfil
- [ ] 5.2 Paso 1 — objetivo y nivel; verificar que se guarda al avanzar
- [ ] 5.3 Paso 2 — entorno y equipamiento; verificar en móvil de 375 px que se usa con el pulgar
- [ ] 5.4 Paso 3 — condiciones y limitaciones; verificar que una parte del cuerpo fuera del vocabulario es rechazada
- [ ] 5.5 Bloquear el resto de la aplicación hasta completar el onboarding y verificar que un paciente ya registrado no lo repite
- [ ] 5.6 Edición posterior del perfil y de las condiciones; verificar que un profesional no asignado no puede editarlas

## 6. Cierre

- [x] 6.1 Ampliar el seed con los cuatro usuarios de prueba de `docs/08-onboarding-equipo.md` y verificar que los cuatro inician sesión
- [ ] 6.2 Ejecutar el camino 1 completo del plan de verificación y registrar el resultado
