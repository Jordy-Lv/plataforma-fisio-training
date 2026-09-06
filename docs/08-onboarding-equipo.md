# 08 — Onboarding del equipo

Objetivo: de clonar el repositorio a tener la aplicación corriendo con datos, en menos de
30 minutos. Si tardas más, no es culpa tuya: avisa para corregir este documento.

## 0. Antes de empezar — leer

En este orden, unos 25 minutos:

1. [`00-contexto-y-alcance.md`](00-contexto-y-alcance.md) — qué se construye y, sobre
   todo, qué **no**.
2. [`CLAUDE.md`](../CLAUDE.md) — las convenciones. Es corto y es obligatorio.
3. El change de OpenSpec de tu slice: `openspec show <tu-change>`.

## 1. Requisitos

| Herramienta | Versión | Comprobar |
|---|---|---|
| Node.js | 22 (ver `.nvmrc`) | `node --version` |
| npm | 10+ | `npm --version` |
| Docker Desktop o Colima | corriendo | `docker ps` |
| Supabase CLI | fijada en `package.json` | `npx supabase --version` |
| OpenSpec CLI | 1.10+ | `openspec --version` |

```bash
nvm use                       # toma la versión de .nvmrc
npm install -g openspec
```

Docker tiene que estar **corriendo**, no solo instalado: Supabase local levanta Postgres
en contenedores.

## 2. Clonar y configurar

```bash
git clone git@github.com:Jordy-Lv/plataforma-fisio-training.git
cd plataforma-fisio-training
npm install
npm run db:start
npm run db:env
```

Para desarrollo local, `npm run db:env` lee la URL y la `anon key` del proyecto local y
crea `.env.local` sin imprimir claves ni incluir una clave privilegiada. Si el archivo ya
existe, conserva su contenido. Para configurarlo manualmente, copia `.env.example` y
consulta `npm run db:status`. Las credenciales del
proyecto compartido en la nube las reparte el owner técnico — **no se piden por chat
público ni se commitean**.

## 3. Levantar

```bash
npm run db:start        # puede repetirse si el entorno ya está encendido
npm run dev             # http://localhost:3000
```

El arranque actual incluye Postgres, Auth, la API y un buzón local en
`http://127.0.0.1:54324`. Storage, Studio, Realtime, Analytics y Edge Runtime están
desactivados para reducir consumo. Storage se habilitará al implementar la biblioteca de
ejercicios; Realtime queda fuera de la demo según el ADR 0006.

Solo en este entorno local el registro con correo no exige confirmación. Esta
configuración no se ha aplicado a ningún proyecto remoto.

**Estado actual:** el esquema completo, las funciones de autorización, RLS en las 21
tablas y la semilla de personas ya están en la base; la infraestructura de sesión y las
pantallas de acceso funcionan. Queda pendiente el contenido de cada slice: catálogo de
ejercicios, plantillas, reglas, rutinas y seguimiento.

`npm run db:reset` borra y recrea la base local. Es destructivo por diseño y se usa a
diario; si tienes datos locales que quieres conservar, no lo corras.

## 4. Usuarios de prueba

Los crea `npm run db:reset`. Contraseña para todos: `demo1234`.

| Correo | Rol |
|---|---|
| `admin@demo.local` | `admin` |
| `entrenador@demo.local` | `professional` / `training` |
| `fisio@demo.local` | `professional` / `physio` |
| `paciente@demo.local` | `patient`, con entrenador y fisioterapeuta asignados |
| `paciente2@demo.local` | `patient` sin profesional asignado — existe para poder verificar el aislamiento del camino 9 |

Estos usuarios existen **solo en local y en el entorno de demostración**. Nunca en
producción.

## 5. Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción — tiene que pasar antes de cada PR |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:start` | Enciende Supabase local |
| `npm run db:stop` | Apaga los contenedores y conserva los datos |
| `npm run db:status` | Muestra servicios y credenciales locales; no compartir su salida |
| `npm run db:env` | Crea `.env.local` si no existe |
| `npm run db:reset` | Recrea la base local y aplica la semilla de personas |
| `npm run db:clean` | Comprueba si la base local está limpia (867\|0\|3\|7); con `-- --fix` elimina fixtures huérfanos |
| `npm run test:auth` | Prueba Auth y sesión SSR contra Supabase local encendido |
| `npm run test:rls` | Camino 9: aislamiento de datos entre pacientes, contra la API |
| `npm run test:storage` | Bucket `exercise-media`: lectura pública y escritura solo del equipo |
| `npm run db:types` | Regenera `lib/db/types.ts`; se commitea junto a la migración |
| `npm run seed:exercises` | Importa free-exercise-db a `exercises` y sube las imágenes al bucket `exercise-media`. Necesita red; es idempotente y se puede repetir. Requiere Node ≥ 22.18, que ejecuta TypeScript sin transpilar |
| `bash scripts/verify.sh` | Control de calidad local. Modo rápido por defecto; con `--full` corre todas las suites funcionales |

### Los dos modos de `verify.sh`

`scripts/verify.sh` es el punto de control central de calidad del repositorio. Opera en dos modos según el momento del flujo de trabajo:

1. **Modo rápido (`bash scripts/verify.sh`)**:
   - **Cuándo usarlo:** Antes de cada commit en local.
   - **Qué hace:** Ejecuta `openspec validate --all --strict`, `npm run typecheck`, `npm run lint` y `npm run build`. Tarda apenas unos segundos y no requiere base de datos ni servidor en ejecución.
2. **Modo completo (`bash scripts/verify.sh --full`)**:
   - **Cuándo usarlo:** Obligatoriamente antes de abrir o fusionar un Pull Request.
   - **Qué hace:** Ejecuta todo el modo rápido y, tras comprobar los requisitos previos (Supabase local encendido, `npm run dev` activo en el puerto 3000 y base limpia), ejecuta dinámicamente las suites funcionales (`test:*` de `package.json`) contra la aplicación real y valida que la base quede limpia al terminar.

### Detector y saneador de base de datos sucia (`check-db-clean.mjs`)

Las pruebas funcionales crean fixtures temporales (usuarios, ejercicios, rutinas y alertas) y los eliminan en sus bloques de limpieza (`t.after`). Sin embargo, **si una suite se interrumpe a mitad** (por timeout, cancelación con `Ctrl+C` o error imprevisto), la basura permanece en la base de datos local y contamina las comprobaciones de conteo de otras pruebas.

> **Caso real que costó horas de depuración:**
> Una prueba interrumpida dejó 6 usuarios `sesiones-%@demo.local`, 2 ejercicios de prueba y ~36 alertas. Entre esos usuarios había un ADMIN huérfano. Cuando se ejecutó el job de membresías, generó una alerta por cada admin activo, provocando que `test:memberships:cron` contara 4 alertas en vez de 2 y fallara. A su vez, los 2 ejercicios residuales alteraron el catálogo y `test:catalog` falló. **Ninguno de los dos fallos era un bug de código**, sino contaminación por fixtures no limpiados.

Para diagnosticar y resolver esto:

- **Diagnosticar:** `npm run db:clean` (o `node scripts/check-db-clean.mjs`).
  - **Salida limpia (código 0):** `✓ Base de datos limpia. Conteos: 867 ejercicios | 0 personalizados | 3 alertas | 7 usuarios oficiales.`
    - *867 ejercicios:* Semilla base de `scripts/seed-exercises.ts`.
    - *0 personalizados (`is_custom = true`):* No hay ejercicios residuales creados a mano.
    - *3 alertas:* Generadas por `scripts/seed-progress-demo.ts` para el paciente demo Marcos Rojas (admin, Beto entrenador y Carla fisio).
    - *7 usuarios oficiales:* 5 de `supabase/seed.sql` (`admin`, `entrenador`, `fisio`, `paciente`, `paciente2`) y 2 de `scripts/seed-progress-demo.ts` (`laura.perez.demo`, `marcos.rojas.demo`).
  - **Salida sucia (código 1):** Muestra el desglose de desviaciones y lista con detalle cada usuario, rutina, alerta o ejercicio huérfano detectado.
- **Limpiar:** `npm run db:clean -- --fix` (o `node scripts/check-db-clean.mjs --fix`).
  - Elimina los huérfanos en el orden referencial correcto: primero las rutinas del paciente huérfano, luego el usuario de `auth.users` (lo que borra perfiles, asignaciones y alertas en cascada), y finalmente ejercicios personalizados y alertas residuales.
  - **Seguridad:** Los 7 usuarios oficiales de las semillas están estrictamente protegidos en una lista blanca inviolable; el script nunca los borra e imprime qué va a eliminar antes de proceder.

> **Estado de GitHub Actions en la cuenta:** Los workflows fallan al arrancar en la plataforma de GitHub
> (`startup_failure`) incluso con un archivo mínimo, lo que apunta a límites de facturación o cuota de la cuenta.
> El archivo `.github/workflows/ci.yml` incluye el job estático (`verify` y `openspec`) y el job funcional completo
> (`functional-tests`, con Supabase local, siembra y dev server). Mientras Actions no arranque en GitHub,
> `bash scripts/verify.sh --full` **es** el control de calidad oficial del equipo y debe correrse en local antes de cada PR.

## 6. Verificar que todo quedó bien

Para validar que tu entorno está completamente operativo:

1. Inicia Supabase local (`npm run db:start`) y comprueba que la base esté limpia (`npm run db:clean`).
2. En una terminal, arranca el servidor de desarrollo (`npm run dev`) en `http://localhost:3000`.
3. En otra terminal, ejecuta la verificación rápida:
   ```bash
   bash scripts/verify.sh
   ```
4. Antes de abrir un PR, ejecuta la verificación completa:
   ```bash
   bash scripts/verify.sh --full
   ```
   Esta orden ejecuta todas las suites funcionales (autenticación, pantallas SSR, RLS, aislamiento de datos, catálogo, plantillas, reglas clínicas, rutinas, ejecución de sesiones, tamizajes, asistencias, membresías y cron) y comprueba que la base de datos termine exactamente en su estado limpio base (867|0|3|7).

Si `scripts/verify.sh --full` termina con «Todo en verde», tu entorno y tus cambios están listos para revisión.

## 7. Tu primer día de trabajo

```bash
git checkout main && git pull
git checkout -b <slice>/<descripcion>       # ej: routines/checklist-movil
openspec show <tu-change>                   # relee el alcance
openspec status --change <tu-change>        # qué falta
```

Trabaja la primera tarea de `tasks.md`, marca su casilla, abre un PR pequeño. Un primer PR
pequeño que se fusiona el día 3 vale más que uno grande el día 5: valida que el proceso
completo funciona antes de que haya presión.

---

## Problemas frecuentes

**`supabase start` falla con error de puerto.**
Algo ocupa el 54322 o el 54323. `npx supabase stop --no-backup` y vuelve a intentar; si
persiste, revisa contenedores huérfanos con `docker ps -a`.

**`npm run db:reset` falla en una migración.**
Alguien fusionó una migración que no aplica sobre base vacía. No la edites: avisa en el
canal del equipo y que se corrija con una migración nueva.

**TypeScript se queja de una tabla que sí existe.**
Faltan los tipos: `npm run db:types`. Si sigue, alguien fusionó una migración sin
regenerar tipos.

**Una consulta devuelve un arreglo vacío sin error.**
Casi siempre es RLS haciendo su trabajo: el usuario con el que probaste no tiene acceso a
esas filas. Revisa [`04-roles-y-permisos.md`](04-roles-y-permisos.md) antes de sospechar
de la consulta. **No "arregles" esto relajando la política.**

**Cambié algo en Supabase Studio y no aparece en el repositorio.**
Los cambios hechos desde Studio no generan migración. Todo cambio de esquema se hace
escribiendo un archivo en `supabase/migrations/`.
