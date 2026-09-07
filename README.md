# Plataforma de Entrenamiento y Fisioterapia

Aplicación web (PWA) que centraliza en una sola herramienta la operación de un negocio
que combina **entrenamiento físico** y **fisioterapia**: registro de clientes, asignación
automática de rutinas por reglas, ejecución desde el celular con reporte de dolor,
tamizaje con gráficas de evolución, control de asistencia y control de mensualidades.

Hoy ese trabajo se hace con Excel, Drive, WhatsApp y papel. No hay forma de saber, de un
vistazo, quién está cumpliendo, quién reportó dolor o quién dejó de asistir.

> **Estado:** Etapa 1 — construcción de la demo funcional.
> La documentación de este repositorio es la fuente de verdad del alcance. Si algo no
> está en [`docs/00-contexto-y-alcance.md`](docs/00-contexto-y-alcance.md), no entra en
> la demo.

---

## Empezar aquí

| Si eres… | Lee en este orden |
|---|---|
| Nuevo en el equipo | [08-onboarding-equipo](docs/08-onboarding-equipo.md) → [00-contexto-y-alcance](docs/00-contexto-y-alcance.md) → [01-arquitectura](docs/01-arquitectura.md) |
| Quien va a escribir código | [CLAUDE.md](CLAUDE.md) → [02-modelo-de-datos](docs/02-modelo-de-datos.md) → [05-flujo-de-trabajo](docs/05-flujo-de-trabajo.md) |
| Quien va a revisar un PR | [CONTRIBUTING.md](CONTRIBUTING.md) → [04-roles-y-permisos](docs/04-roles-y-permisos.md) |
| Quien prueba la demo | [07-plan-de-verificacion](docs/07-plan-de-verificacion.md) |

## Documentación

- [`docs/00-contexto-y-alcance.md`](docs/00-contexto-y-alcance.md) — el problema, qué entra y qué **no** entra en la demo.
- [`docs/01-arquitectura.md`](docs/01-arquitectura.md) — stack, por qué cada pieza, estructura del repositorio.
- [`docs/02-modelo-de-datos.md`](docs/02-modelo-de-datos.md) — tablas, relaciones y convenciones de esquema.
- [`docs/03-motor-de-reglas.md`](docs/03-motor-de-reglas.md) — cómo se asigna una rutina automáticamente, sin IA.
- [`docs/04-roles-y-permisos.md`](docs/04-roles-y-permisos.md) — los roles y la matriz de acceso que implementa RLS.
- [`docs/05-flujo-de-trabajo.md`](docs/05-flujo-de-trabajo.md) — OpenSpec, ramas, PRs y el protocolo anti-colisión.
- [`docs/06-cronograma-y-slices.md`](docs/06-cronograma-y-slices.md) — las dos semanas, los 4 slices y quién es dueño de qué.
- [`docs/07-plan-de-verificacion.md`](docs/07-plan-de-verificacion.md) — los 9 caminos que deben pasar antes de mostrar la demo.
- [`docs/08-onboarding-equipo.md`](docs/08-onboarding-equipo.md) — levantar el proyecto en local, paso a paso.
- [`docs/09-verificacion-acceso.md`](docs/09-verificacion-acceso.md) — cómo se comprueba el acceso de cada rol contra la base local.
- [`docs/10-sistema-de-diseno.md`](docs/10-sistema-de-diseno.md) — tokens, componentes y reglas al pintar una pantalla.
- [`docs/11-contratos-de-las-suites-http.md`](docs/11-contratos-de-las-suites-http.md) — los marcadores del marcado que las suites de `scripts/` dan por contrato.
- [`docs/12-excepcion-antigravity-frontend.md`](docs/12-excepcion-antigravity-frontend.md) — excepción acotada: un compañero evalúa Antigravity rehaciendo el frontend en una rama aparte.
- [`docs/adr/`](docs/adr/) — decisiones de arquitectura con su justificación y sus alternativas descartadas.

## Stack

| Capa | Elección |
|---|---|
| App | Next.js 15 (App Router) + TypeScript `strict` |
| UI | Tailwind CSS + shadcn/ui |
| Datos / Auth / Storage | Supabase (Postgres + RLS) |
| Gráficas | Recharts |
| Validación | Zod |
| Jobs programados | `pg_cron` (dentro de Postgres) |
| Biblioteca de ejercicios | [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (MIT), auto-hospedada |
| Hosting | Railway |

El razonamiento detrás de cada elección está en [`docs/01-arquitectura.md`](docs/01-arquitectura.md)
y en los ADR correspondientes.

## Arranque rápido

Requisitos: Node 22 (ver `.nvmrc`) y Docker corriendo. La CLI de Supabase se instala
con las dependencias del proyecto.

```bash
npm install
npm run db:start             # levanta Postgres, Auth, API y correo locales
npm run db:env               # crea .env.local; conserva el archivo si ya existe
npm run dev
```

La base web y la infraestructura de sesión están implementadas. El esquema de negocio,
las políticas RLS, los usuarios demo y las pantallas de acceso siguen pendientes.
`npm run test:auth` verifica registro, login, lectura de sesión en servidor, recarga,
renovación de cookies y rechazo de credenciales manipuladas contra Supabase local.
`npm run db:stop` detiene los servicios y conserva la base local.

El detalle completo, incluidos los problemas típicos, está en
[`docs/08-onboarding-equipo.md`](docs/08-onboarding-equipo.md).

## Convenciones no negociables

1. **RLS activo en toda tabla con datos de personas.** Son datos de salud. Ver [`docs/04-roles-y-permisos.md`](docs/04-roles-y-permisos.md).
2. **Nunca se edita una migración ya fusionada a `main`.** Siempre una migración nueva.
3. **`lib/db/types.ts` es generado.** No se edita a mano.
4. **`main` nunca queda en rojo.** CI verde es requisito de merge.
5. **Cada slice es dueño de sus carpetas.** Tocar código compartido exige revisión del owner técnico.

Las convenciones de código que siguen tanto las personas como los agentes de IA están en
[`CLAUDE.md`](CLAUDE.md).

## Licencia

Software propietario. Todos los derechos reservados. No redistribuir.
