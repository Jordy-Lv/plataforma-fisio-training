# Puesta en producción

Lista de lo que hay que configurar **fuera del código** para que la aplicación funcione con
pacientes reales, y cómo comprobarlo. Escrita el 2026-10-09.

**Decisión de partida (2026-10-09):** se sale a producción en la **capa gratuita de
Supabase**, a sabiendas de que el [ADR-0002](adr/0002-hosting-railway.md) pide un plan con
respaldos para datos de salud reales. Mientras dure, los respaldos son manuales (§8) y alguien
tiene que vigilar que el proyecto no se pause. Cuando el cliente pague el plan Pro, §8 se
sustituye por los respaldos automáticos.

Cada paso dice **quién** lo hace: casi todos necesitan acceso a un panel (Railway, Supabase,
Resend, GitHub) que no tiene el código.

---

## 1. Variables de entorno en Railway

Servicio `web`, entorno `production` del proyecto **`plataforma-fisio-training`** (no
`portafolio`, ver [docs/15](15-pendiente-del-proyecto.md) §A.2).

| Variable | Valor | Nota |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Se usa en el **build**: además de la app, la lee `next.config.ts` para la política de contenido. Si falta, las imágenes del catálogo no cargan. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave anónima | Es pública por diseño. |
| `SUPABASE_URL` | igual que la primera | Solo la usan los scripts. |
| `SUPABASE_SERVICE_ROLE_KEY` | clave de servicio | Solo la ruta del cron. Nunca con prefijo `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SITE_URL` | `https://<dominio>` | Sin barra final. Los enlaces de recuperación de contraseña se construyen con ella. |
| `SMTP_URL` | `smtps://resend:<API_KEY>@smtp.resend.com:465` | §3. |
| `MAIL_FROM` | `Fisio Training <avisos@<dominio-verificado>>` | **No** `onboarding@resend.dev` (§3). |
| `CRON_SECRET` | 32+ caracteres aleatorios | El mismo valor va en `private.job_config` (§4). Generarlo con `openssl rand -hex 32`. |

Cambiar una `NEXT_PUBLIC_*` exige volver a desplegar: queda incrustada en el build.

## 2. Supabase Auth (panel de Supabase → Authentication)

- **URL Configuration → Site URL:** el mismo valor que `NEXT_PUBLIC_SITE_URL`.
- **URL Configuration → Redirect URLs:** `https://<dominio>/auth/callback`. Sin esto, el
  enlace de «Olvidé mi contraseña» no vuelve a la aplicación.
- **Sign In / Providers → Allow new users to sign up: activado.** Parece contradictorio,
  pero `createPerson` da de alta con `signUp`. Quien intente registrarse por su cuenta lo
  rechaza la base de datos (migración `20261009120000_auth_close_open_signup`, ver
  [docs/04](04-roles-y-permisos.md) «El alta»).
- **Confirm email:** se puede dejar activado o no. Activado, la persona dada de alta tiene
  que confirmar el correo antes de entrar, y eso exige que §3 funcione.
- **Contraseña mínima:** 8, como en local (`supabase/config.toml`).
- **SMTP Settings:** activar SMTP propio con los datos de Resend (§3). El SMTP que trae
  Supabase por defecto solo envía a direcciones del equipo del proyecto y con un límite muy
  bajo por hora: un paciente real **no recibiría** el correo de recuperación.

## 3. Correo (Resend)

`onboarding@resend.dev` es el remitente de prueba de Resend: solo entrega al dueño de la
cuenta. Para que los avisos de vencimiento y la recuperación de contraseña lleguen:

1. En Resend → Domains, añadir el dominio del negocio y crear los registros DNS que pide
   (SPF, DKIM). Esperar a que quede «Verified».
2. Cambiar `MAIL_FROM` en Railway a una dirección de ese dominio.
3. Usar el mismo dominio y la misma API key en el SMTP de Supabase (§2).

Comprobación: «Olvidé mi contraseña» con una cuenta de prueba cuyo correo no sea el del dueño
de Resend.

## 4. El cron de vencimientos

La migración del job deja valores **de desarrollo** en `private.job_config`
(`host.docker.internal` y `local-dev-cron-secret`). En producción hay que cambiarlos una vez
desde el SQL Editor de Supabase:

```sql
update private.job_config
   set value = 'https://<dominio>/api/cron/memberships'
 where key = 'membership_cron_url';

update private.job_config
   set value = '<el mismo valor que CRON_SECRET en Railway>'
 where key = 'membership_cron_secret';
```

Corre todos los días a las 13:00 UTC (08:00 en Bogotá). Para comprobarlo al día siguiente:

```sql
select status, return_message, start_time
  from cron.job_run_details order by start_time desc limit 5;

-- Respuesta de la aplicación a la última llamada: 200 es éxito, 401 es secreto distinto.
select status_code, left(content::text, 120), created
  from net._http_response order by created desc limit 3;
```

La revisión de asistencia baja (`review-low-attendance`, 13:05 UTC) no llama a la
aplicación: no necesita nada de esto.

Si cambia el dominio, hay que repetir el primer `update`.

## 5. Base de datos

- **Migraciones.** Tras fusionar en `main` un PR con migración:
  `npx supabase migration list --linked` para ver qué falta y `npx supabase db push --linked`
  para aplicarlo. Siempre **antes** de desplegar el código que la necesita.
- **Nunca** correr `supabase/seed.sql` contra producción: crea cuentas con la contraseña
  `demo1234` (una de ellas admin) y reabre el registro público. Comprobación:

  ```sql
  select count(*) from auth.users where email like '%@demo.local';  -- debe ser 0
  select private.allow_open_signup();                                 -- debe ser false
  ```

  Si la primera da más de 0, borrar esas cuentas desde Authentication → Users.
- **Catálogo.** `seed:exercises` y `seed:templates` sí se pueden correr contra producción
  (no crean personas). `seed:progress-demo` y `seed:calendar-demo` **no**.

## 6. El primer admin

Con el registro cerrado, el panel de Supabase tampoco puede crear usuarios sin token. Para el
primer admin (o para recuperar el acceso si no queda ninguno activo), desde el SQL Editor:

```sql
-- 1. Abrir el registro un momento.
create or replace function private.allow_open_signup()
returns boolean language sql stable as $$ select true $$;
```

2. Authentication → Users → Add user, con «Auto Confirm User».

```sql
-- 3. Ascenderlo.
update public.profiles
   set role = 'admin', full_name = '<nombre>'
 where id = (select id from auth.users where email = '<correo>');

-- 4. Cerrar otra vez. No saltarse este paso.
create or replace function private.allow_open_signup()
returns boolean language sql stable as $$ select false $$;
```

El resto del personal y los pacientes se dan de alta desde `/people` en la aplicación.

## 7. Despliegue

Hoy se despliega con `railway up`, que sube **la carpeta local**, no `main`: el despliegue
del 2026-10-03 llevaba código que no estaba en `main`. Hasta automatizarlo, desplegar solo
así:

```bash
git checkout main && git pull && git status   # sin nada pendiente
railway status                                 # proyecto plataforma-fisio-training, entorno production
railway up
```

**Para automatizarlo (lo hace quien administre Railway y GitHub):**

1. Railway → servicio `web` → Settings → Source → conectar el repositorio
   `Jordy-Lv/plataforma-fisio-training`, rama `main`, y activar «Wait for CI».
2. GitHub → Settings → Branches → regla para `main`: exigir PR y los checks
   «Typecheck, lint y build» y «Validar specs» ([docs/15](15-pendiente-del-proyecto.md) §A.1).

`railway.json` queda deprecado el 2026-12-01 (§A.3 de docs/15).

## 8. Capa gratuita: lo que hay que hacer a mano

- **Pausa por inactividad.** Supabase pausa un proyecto gratuito tras una semana sin uso.
  Revisar el panel una vez por semana y antes de cada reunión con el cliente; si está
  pausado, «Restore» tarda unos minutos.
- **Respaldo semanal.** Desde un checkout del repositorio, con la sesión de Supabase CLI
  iniciada. Van a `_local/`, que está en `.gitignore`: **contienen datos de salud**, así
  que nunca se suben al repositorio ni a un servicio compartido sin cifrar.

  ```bash
  mkdir -p _local/respaldos/$(date +%F) && cd _local/respaldos/$(date +%F)
  npx supabase db dump --linked --role-only -f roles.sql
  npx supabase db dump --linked -f schema.sql
  npx supabase db dump --linked --data-only --use-copy -f data.sql
  ```

  La primera vez, comprobar que `data.sql` incluye `auth.users` y `public.profiles` antes
  de darlo por bueno. Las imágenes del bucket `exercise-media` no van en el volcado: las del
  catálogo se regeneran con `seed:exercises`, pero las de ejercicios propios solo existen
  ahí.

## 9. Comprobación después de cada despliegue

```bash
SITE=https://<dominio>
curl -sI $SITE/login | grep -iE "content-security|strict-transport|x-frame"   # tres cabeceras
curl -sI $SITE/login | grep -i x-powered-by                                    # nada
curl -s -o /dev/null -w "%{http_code}\n" -X POST $SITE/api/cron/memberships     # 401
curl -s -o /dev/null -w "%{http_code}\n" $SITE/ui/overlays                      # 404
```

Y a mano: entrar como admin, abrir `/exercises` y ver que cargan las imágenes (si no cargan,
revisar `NEXT_PUBLIC_SUPABASE_URL` en el build, §1).
