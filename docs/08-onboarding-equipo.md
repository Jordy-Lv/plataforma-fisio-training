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
| `npm run test:auth` | Prueba Auth y sesión SSR contra Supabase local encendido |
| `npm run test:rls` | Camino 9: aislamiento de datos entre pacientes, contra la API |
| `npm run db:types` | Regenera `lib/db/types.ts`; se commitea junto a la migración |
| `npm run seed:exercises` (pendiente) | Importará free-exercise-db a `exercises` + Storage |
| `bash scripts/verify.sh` | Corre todas las verificaciones de CI en local |

> **GitHub Actions está pendiente de habilitar en la cuenta.** Los workflows fallan al
> arrancar (`startup_failure`) incluso con un archivo trivial, lo que apunta a límites de
> minutos o de gasto en la configuración de facturación, no al proyecto. Hasta que se
> resuelva, `bash scripts/verify.sh` **es** el control de calidad: córrelo antes de cada
> PR. El workflow ya está escrito en `.github/workflows/ci.yml` y funcionará sin cambios en
> cuanto Actions arranque.

## 6. Verificar que todo quedó bien

Para la base actual: ejecuta `npm run test:auth` con Node 22 y Supabase encendido,
y después `bash scripts/verify.sh`. La prueba crea un usuario desechable y una aplicación
Next.js temporal que utiliza los clientes y el middleware reales; elimina ambos al
terminar. No publica rutas de diagnóstico en la aplicación ni usa una clave privilegiada.

Los siguientes recorridos quedan pendientes hasta implementar las pantallas y el seed:

1. `http://localhost:3000` carga sin errores en consola.
2. Entras con `paciente@demo.local` y ves una rutina asignada.
3. Entras con `fisio@demo.local` y ves a ese paciente en tu lista.
4. `npm run typecheck` y `npm run lint` pasan limpio.

Si los cuatro funcionan, estás listo.

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
