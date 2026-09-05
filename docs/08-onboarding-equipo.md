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
| Docker Desktop | corriendo | `docker ps` |
| Supabase CLI | última | `supabase --version` |
| OpenSpec CLI | 1.10+ | `openspec --version` |

```bash
nvm use                       # toma la versión de .nvmrc
brew install supabase/tap/supabase
npm install -g openspec
```

Docker tiene que estar **corriendo**, no solo instalado: Supabase local levanta Postgres
en contenedores.

## 2. Clonar y configurar

```bash
git clone git@github.com:Jordy-Lv/plataforma-fisio-training.git
cd plataforma-fisio-training
npm install
cp .env.example .env.local
```

Para desarrollo local con Supabase en tu máquina, `supabase start` imprime la URL y la
`anon key` al terminar: esos son los valores que van en `.env.local`. Las credenciales del
proyecto compartido en la nube las reparte el owner técnico — **no se piden por chat
público ni se commitean**.

## 3. Levantar

```bash
npx supabase start      # Postgres + Auth + Storage locales (tarda la primera vez)
npm run db:reset        # aplica migraciones y siembra datos de ejemplo
npm run dev             # http://localhost:3000
```

`npm run db:reset` borra y recrea la base local. Es destructivo por diseño y se usa a
diario; si tienes datos locales que quieres conservar, no lo corras.

## 4. Usuarios de prueba

Los crea el seed. Contraseña para todos: `demo1234`.

| Correo | Rol |
|---|---|
| `admin@demo.local` | `admin` |
| `entrenador@demo.local` | `professional` / `training` |
| `fisio@demo.local` | `professional` / `physio` |
| `paciente@demo.local` | `patient` (con rutina, sesiones y tamizajes) |

Estos usuarios existen **solo en local y en el entorno de demostración**. Nunca en
producción.

## 5. Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción — tiene que pasar antes de cada PR |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:reset` | Recrea la base local y siembra |
| `npm run db:types` | Regenera `lib/db/types.ts` desde el esquema |
| `npm run seed:exercises` | Importa free-exercise-db a `exercises` + Storage |
| `npx supabase stop` | Apaga los contenedores |

## 6. Verificar que todo quedó bien

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
