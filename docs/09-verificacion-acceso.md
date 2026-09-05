# Verificación de las pantallas de acceso

Fecha: 5 de septiembre de 2026. Change: `add-auth-and-roles`, tareas 3.1–3.4.

## Preparación

Con Node 22 y Supabase local iniciado, las migraciones y el seed deben estar aplicados.
Configurar `.env.local` mediante `npm run db:env` y conservar
`NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Iniciar la aplicación con `npm run dev`.

Ejecutar, en otra terminal:

```sh
npm run test:auth
npm run test:auth:screens
bash scripts/verify.sh
```

La prueba de pantallas usa el servidor Next.js de `http://localhost:3000`, sus server
actions y Supabase local. Crea personas desechables con el prefijo `screens-`, las
elimina al terminar y nunca usa la clave de servicio. El correo de recuperación queda
en el buzón local Mailpit. No ejecutar un reset de base de datos durante las pruebas.

## Resultados

- Visitas anónimas a los tres paneles regresan al acceso.
- Validación en el servidor; correo inexistente y contraseña equivocada producen
  exactamente el mismo mensaje.
- Administrador, profesional y paciente llegan a su panel. Los intentos de entrar
  a otro panel regresan al panel propio. Tras cerrar sesión ya no pueden entrar.
- Un perfil inactivo no conserva cookies de acceso en la aplicación.
- Dar de baja un administrador, profesional o paciente con sesión abierta bloquea
  la siguiente petición, borra las cookies e invalida el token de renovación.
  Verificado con sesiones vigentes y forzando su renovación.
- Las peticiones POST de sesiones dadas de baja se rechazan antes de ejecutar acciones.
- Un enlace de recuperación enviado antes de la baja no permite conservar sesión
  ni acceder al cambio de contraseña después de ella.
- Un enlace inválido no permite acceder al formulario de cambio de contraseña.
- El correo llega a Mailpit; el enlace permite guardar una contraseña nueva;
  las contraseñas diferentes se rechazan; la anterior deja de funcionar y la nueva
  permite entrar. El enlace utilizado no se puede reutilizar.
- Recorrido interactivo verificado con `paciente@demo.local`: acceso, intento de
  abrir `/admin`, retorno a `/patient` y cierre de sesión.
- Vista de acceso inspeccionada en escritorio y a 375 px: sin desbordamiento
  horizontal y con controles de al menos 44 px. No se probó en teléfono físico.
- Tipado, lint, compilación y los cuatro cambios OpenSpec: correctos.

## Límites y continuación

La tarea 3.4 implementa el bloqueo en login, middleware y callback según la
aclaración del reparto de trabajo. Las pruebas de pantallas cubren nueve escenarios,
además de los seis escenarios existentes de sesión SSR.

El bloqueo es de la aplicación Next.js: no cambia el endpoint de autenticación de
Supabase ni sus políticas. Una llamada directa a Supabase todavía puede emitir un
token inicialmente. El middleware comprueba `profiles.is_active` antes de servir
contenido; los callbacks y el login cierran una sesión obtenida si el perfil está
inactivo. No se usa la clave de servicio ni se modifica la migración inicial.

Los paneles actuales son entradas protegidas con un estado inicial; no implementan
la gestión de personas, las rutinas ni el onboarding. Están en `app/(auth)/` para
mantener esta entrega dentro de autenticación. Al implementar cada panel se debe
mover su ruta al grupo del dominio correspondiente, evitando rutas duplicadas.

La recuperación usa el intercambio de código PKCE de Supabase. El correo debe
abrirse en el mismo navegador que lo solicitó. En un entorno publicado, configurar
`NEXT_PUBLIC_SITE_URL` y autorizar su ruta `/auth/callback` en Supabase.

Se añadió `zod` como dependencia directa para compartir las reglas de validación
entre formulario y servidor. El desarrollo usa `.next-dev` y la compilación usa
`.next`, para que una compilación simultánea no rompa el servidor de desarrollo.
