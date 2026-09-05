## Context

Este change se implementa sobre el esqueleto que el owner técnico deja en `main` el día 2,
incluida la migración con el esquema completo (ver
[`docs/02-modelo-de-datos.md`](../../../docs/02-modelo-de-datos.md)). Aquí se implementa la
autenticación, la autorización y las pantallas de gestión de personas.

La restricción que domina el diseño: son datos de salud y los otros tres slices asumen que
la autorización ya funciona. Si RLS queda mal aquí, queda mal en todo el producto.

## Goals / Non-Goals

**Goals:**
- Que la autorización viva en la base de datos y que el código de la aplicación no la
  reimplemente.
- Que cualquier tabla nueva de otro slice pueda apoyarse en tres funciones ya existentes:
  `is_admin()`, `current_role()`, `treats_patient()`.
- Que el onboarding produzca exactamente los datos que consume el motor de reglas.

**Non-Goals:**
- Inicio de sesión con proveedores externos (Google, Apple). Correo y contraseña bastan
  para la demo.
- Recuperación de contraseña con plantilla de correo personalizada: se usa la de Supabase.
- Perfiles con fotografía. `avatar_url` existe en el esquema, pero la carga se aplaza.

## Decisions

### `profiles` extiende `auth.users`, no la reemplaza

Supabase gestiona credenciales, tokens y recuperación en `auth.users`. `profiles` guarda lo
nuestro (rol, especialidad, nombre, teléfono, estado) con el mismo `id`. Un trigger
`on auth.users insert` crea la fila de `profiles`, para que no exista jamás un usuario
autenticado sin perfil.

Alternativa descartada: guardar el rol en `raw_user_meta_data` del token. Esa metadata es
modificable por el propio usuario en algunas configuraciones, y confiar en ella para
autorizar es una vulnerabilidad de escalada de privilegios.

### La autorización se expresa con tres funciones `security definer`

`is_admin()`, `current_role()` y `treats_patient(uuid)` encapsulan las consultas de
autorización. Las políticas de RLS las invocan en lugar de repetir subconsultas.

Por qué: cuando el slice 3 escriba la política de `session_logs`, va a escribir
`treats_patient(patient_id)` y no va a inventar un join sobre `care_assignments`. Es lo que
mantiene coherentes cuatro slices sin coordinación permanente.

`security definer` con `search_path` fijo es necesario para que la función pueda leer
`profiles` sin quedar atrapada en la propia RLS de `profiles`.

### Baja lógica en todas partes

`is_active` en `profiles`, `ended_at` en `care_assignments`. Nada se borra. Además de ser
lo correcto con datos clínicos, evita el problema de las claves foráneas huérfanas en
sesiones y observaciones históricas.

### El onboarding es un formulario por pasos, no uno solo

Objetivo → entorno y equipamiento → condiciones. El paciente lo llena desde el teléfono,
posiblemente por primera vez y sin ayuda. Un formulario único con quince campos en una
pantalla de 375 px se abandona.

El estado intermedio se guarda al avanzar cada paso: si cierra la aplicación, retoma donde
iba.

## Risks / Trade-offs

**Una política de RLS mal escrita expone datos de salud** → Toda migración con políticas la
revisa el owner técnico, y el camino 9 de
[`docs/07-plan-de-verificacion.md`](../../../docs/07-plan-de-verificacion.md) se ejecuta
contra la API directamente, no por la interfaz.

**Olvidar `with check` en una política de escritura** → Es el error más común y permite
suplantación. La lista de revisión del PR lo incluye explícitamente.

**El trigger que crea `profiles` falla y deja un usuario sin perfil** → El trigger es parte
de la migración inicial y se prueba con `npm run db:reset`; un usuario sin perfil no puede
iniciar sesión, lo que falla de forma visible en vez de silenciosa.

**Los otros slices empiezan antes de que auth esté terminado** → El seed crea usuarios de
prueba de los tres roles desde el día 2, para que nadie espere.
