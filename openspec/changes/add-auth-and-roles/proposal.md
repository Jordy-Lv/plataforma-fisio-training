## Why

Sin identidad no hay nada más: cada rutina, cada sesión y cada alerta pertenece a una
persona concreta, y son datos de salud. Este change establece quién es cada quien, qué
puede ver y qué puede hacer, y lo hace en la base de datos —con RLS— y no en la interfaz.
Es el cimiento sobre el que trabajan los otros tres slices.

## What Changes

- Autenticación con correo y contraseña sobre Supabase Auth, con sesión persistente en la
  PWA.
- Tabla `profiles` con tres roles (`admin`, `professional`, `patient`) y especialidad
  (`training` | `physio`) para los profesionales.
- Funciones de autorización `is_admin()`, `current_role()` y `treats_patient()` y las
  políticas RLS base sobre las tablas de personas.
- Alta y baja **lógica** de personal y de pacientes desde el panel de administración.
- Vinculación paciente ↔ profesional en `care_assignments`, permitiendo que un paciente
  tenga entrenador y fisioterapeuta a la vez.
- Onboarding del paciente: objetivo, nivel, entorno, equipamiento, y sus condiciones o
  limitaciones activas.
- Redirección por rol tras iniciar sesión: cada rol entra a su propio panel.

## Capabilities

### New Capabilities

- `user-auth`: autenticación, sesión y el modelo de roles con su autorización a nivel de fila.
- `staff-and-patient-management`: alta, baja y vinculación de personal y pacientes.
- `patient-onboarding`: captura del perfil del paciente que alimenta el motor de reglas.

### Modified Capabilities

Ninguna: es el primer change del proyecto.

## Impact

- **Esquema:** `profiles`, `patient_details`, `patient_conditions`, `care_assignments`, y
  los enums `user_role`, `professional_specialty`, `patient_goal`, `fitness_level`,
  `training_environment`, `condition_severity`.
- **Código:** `app/(auth)/**`, `app/(admin)/users/**`, `lib/auth/**`, `lib/supabase/**`,
  `middleware.ts`.
- **Otros slices:** todos dependen de `profiles` y `care_assignments`. Cualquier cambio
  posterior a esas dos tablas requiere aviso al equipo antes del PR.
