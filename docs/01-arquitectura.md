# 01 — Arquitectura

## Principio rector

Dos semanas, cuatro personas, datos de salud. Cada decisión de arquitectura se toma
optimizando **tiempo hasta una demo correcta**, no elegancia ni escalabilidad futura. Lo
que se puede aplazar sin deuda estructural, se aplaza; lo que sería caro corregir después
—el modelo de datos y el modelo de permisos— se hace bien desde el primer día.

## Vista general

```
┌──────────────────────────────────────────────────────────┐
│  Navegador / PWA instalada                               │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐    │
│  │  (admin)   │  │   (pro)    │  │    (patient)     │    │
│  │ escritorio │  │ escritorio │  │  móvil primero   │    │
│  └────────────┘  └────────────┘  └──────────────────┘    │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼─────────────────────────────────┐
│  Next.js 15 — App Router  (Railway)                      │
│  · Server Components: lectura de datos                   │
│  · Server Actions: escritura, validadas con Zod          │
│  · Route Handlers: solo cron y webhooks                  │
└────────────────────────┬─────────────────────────────────┘
                         │ supabase-js (sesión del usuario)
┌────────────────────────▼─────────────────────────────────┐
│  Supabase                                                │
│  ┌────────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐  │
│  │ Postgres   │ │   Auth   │ │ Storage │ │  pg_cron   │  │
│  │ + RLS      │ │          │ │ (media) │ │ (avisos)   │  │
│  └────────────┘ └──────────┘ └─────────┘ └────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**La autorización vive en la base de datos, no en la aplicación.** RLS es la única
frontera que un error de programación en el frontend no puede saltarse. El código de la
aplicación no reimplementa las reglas de acceso: confía en que una consulta que no debe
devolver filas, no las devuelve.

## Stack y por qué

| Capa | Elección | Por qué esta y no otra |
|---|---|---|
| **App** | Next.js 15 (App Router) + TypeScript `strict` | Las tres vistas de rol viven en un solo proyecto y comparten componentes y tipos. Los Server Components eliminan la mayor parte del código de fetching y de estados de carga. La PWA sale sin trabajo adicional. Alternativa descartada: React + API separada — dos despliegues y dos capas de tipos para el mismo resultado. |
| **UI** | Tailwind CSS + shadcn/ui | shadcn copia los componentes al repositorio: son editables y accesibles, y no dependemos de la hoja de ruta de una librería. Los tokens CSS permiten aplicar la identidad visual en la semana 2 tocando un solo archivo. |
| **Datos / Auth / Storage** | Supabase (Postgres) | Los datos son relacionales por naturaleza: pacientes, rutinas, ejercicios, sesiones, asistencia, membresías, todo conectado. Postgres es la herramienta hecha para eso, y RLS resuelve la autorización a nivel de fila. Auth, Storage y cron en el mismo servicio evitan integrar cuatro proveedores en dos semanas. |
| **Hosting** | Railway | Despliegue por push, costo predecible y sin restricciones de uso comercial. Alternativa descartada: el plan Hobby de Vercel **prohíbe el uso comercial**, y su plan Pro es desproporcionado para esta escala. Ver [ADR-0002](adr/0002-hosting-railway.md). |
| **Gráficas** | Recharts | Suficiente para evolución de tamizaje y progresión de carga. Declarativa, integra con React sin envoltorios. |
| **Validación** | Zod | Un esquema por caso de uso, usado por el formulario y por la server action. Una sola fuente de verdad para las reglas. |
| **Jobs programados** | `pg_cron` | Ya viene con Postgres. Un job diario marca membresías por vencer y genera alertas. Alternativa descartada: un worker aparte — otro servicio que desplegar y vigilar para ejecutar una consulta al día. |
| **Biblioteca de ejercicios** | free-exercise-db (auto-hospedada) | ~800 ejercicios con imágenes, licencia MIT, JSON estático. Se siembra en nuestra base y las imágenes van a Supabase Storage: sin API de terceros, sin límites de uso, sin costo, sin dependencia externa en la demo. Ver [ADR-0005](adr/0005-biblioteca-de-ejercicios.md). |

## Decisiones estructurales

### Un solo proyecto Next.js, sin monorepo

No hay un segundo consumidor de la lógica ni un paquete que publicar. Un monorepo
añadiría configuración de workspaces y de build por un beneficio que a esta escala no
existe, y complicaría el arranque de cuatro personas el primer día.
→ [ADR-0004](adr/0004-sin-monorepo.md)

### Snapshot de rutina, no referencia

Al asignar una rutina, sus ejercicios se **copian** de la plantilla a las tablas del
paciente. El profesional edita la copia. La plantilla no cambia.

Es exactamente lo que pidió el equipo profesional: la parametrización se define una vez
a nivel general, y la especificidad se aplica después, por paciente. Con referencias, el
ajuste hecho para un paciente contaminaría a todos los demás.
→ [ADR-0001](adr/0001-snapshot-de-rutinas.md)

### Asignación decidida por el profesional

El entrenador o fisioterapeuta elige una plantilla, revisa y ajusta la copia para el
paciente, y confirma la asignación. La plataforma conserva el snapshot y aplica las
validaciones de acceso y contraindicaciones; no decide automáticamente qué plantilla
corresponde a una persona. → [ADR-0009](adr/0009-asignacion-manual-de-rutinas.md) y
[`03-motor-de-reglas.md`](03-motor-de-reglas.md)

### Sin tiempo real en la Etapa 1

Supabase Realtime está disponible, pero nadie observa el panel mientras un paciente
entrena. Lo que el negocio necesita es que la información **quede registrada y genere una
alerta**, no que aparezca en pantalla al segundo. Las alertas se generan en la escritura
(trigger) y se leen al cargar el panel.
→ [ADR-0006](adr/0006-sin-realtime-en-demo.md)

## Estructura del repositorio

```
plataforma-fisio-training/
├── CLAUDE.md                    Convenciones que siguen personas y agentes
├── CONTRIBUTING.md              Proceso: ramas, PRs, migraciones
├── docs/                        Esta documentación
│   └── adr/                     Decisiones de arquitectura
├── openspec/                    Specs y changes por slice
├── app/
│   ├── (auth)/                  Login, registro, recuperación
│   ├── (admin)/                 Usuarios, plantillas, reglas, planes, alertas
│   ├── (pro)/                   Mis pacientes, rutinas, tamizaje
│   ├── (patient)/               Mi rutina, checklist, progreso, mi plan
│   └── api/                     Solo cron y webhooks
├── components/
│   ├── ui/                      shadcn — compartido
│   └── <dominio>/               Componentes propios por dominio
├── lib/
│   ├── supabase/                Clientes server/browser — compartido
│   ├── db/types.ts              Generado desde el esquema
│   ├── auth/                    Slice 1
│   ├── catalog/                 Slice 2
│   ├── routines/                Slice 3
│   └── progress/                Slice 4
├── supabase/
│   ├── migrations/              Esquema versionado
│   └── seed.sql                 Datos de demostración
└── scripts/
    └── seed-exercises.ts        Importa free-exercise-db
```

La correspondencia entre carpetas y personas está en
[`06-cronograma-y-slices.md`](06-cronograma-y-slices.md).

## Qué está preparado para la Etapa 3

Aplazar no es ignorar. Estas decisiones dejan la puerta abierta sin costo hoy:

- **Pagos:** `memberships` ya guarda plan, monto y fechas. Integrar Wompi es agregar
  `payments` y un webhook; no toca lo existente.
- **Medios propios:** `exercises.media_url` es una URL. Cambiar Supabase Storage por otro
  proveedor es cambiar el valor de la columna, sin migración.
- **Push:** las alertas ya se generan y se persisten. FCM sería un canal de entrega
  adicional sobre `alerts`, no una funcionalidad nueva.
- **App nativa:** una PWA bien construida es lo que Capacitor empaqueta. No hay reescritura.
