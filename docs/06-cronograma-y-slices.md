# 06 — Cronograma y slices

Dos semanas hasta una demo funcional que el cliente prueba. El cronograma está construido
sobre una idea: **el día 5 tiene que existir el camino completo de punta a punta**, aunque
sea feo. Registrar un paciente → que su profesional le asigne rutina → que la vea en el
celular. Si eso no existe el viernes, la segunda semana se va en integración y no en
funcionalidad.

## Los cuatro slices

Cada slice es un corte vertical: base de datos, lógica e interfaz de una capacidad
completa. No hay una persona "de backend" y otra "de frontend"; eso generaría
dependencias de bloqueo entre personas.

| Slice | Change de OpenSpec | Alcance |
|---|---|---|
| **1 — Auth y roles** | `add-auth-and-roles` | Autenticación, `profiles`, RLS base, alta y baja de personal y pacientes, onboarding del paciente (objetivo, entorno, equipamiento, condiciones) |
| **2 — Catálogo y plantillas** | `add-exercise-library-and-rules` | `exercises`, siembra de free-exercise-db y plantillas de rutina para selección del profesional |
| **3 — Rutinas y ejecución** | `add-routine-execution` | Asignación con snapshot, ajuste por el profesional, checklist móvil, registro de dolor y observaciones, generación de alertas |
| **4 — Progreso y negocio** | `add-progress-and-memberships` | Tamizaje con gráficas, asistencia, planes y servicios, membresías, job de vencimientos |

### Dependencias entre slices

```
Día 2: esquema completo en main
   │
   ├──► Slice 1 (auth) ──────► habilita sesiones reales para todos
   ├──► Slice 2 (catálogo) ──► produce las plantillas que consume el 3
   ├──► Slice 3 (rutinas) ───► consume plantillas del 2
   └──► Slice 4 (progreso) ──► independiente
```

Los slices 3 y 4 pueden avanzar antes de que el 1 esté listo usando el usuario de
desarrollo que deja el seed. **Ningún slice espera a otro para empezar**; el esquema
completo del día 2 es lo que lo permite.

---

## Semana 1

### Días 1–2 — Owner técnico, en solitario

Nadie más commitea. Al final del día 2, en `main`:

- [ ] Proyecto Next.js 15 + TypeScript `strict` + Tailwind + shadcn/ui
- [ ] Proyecto Supabase creado, CLI configurada, `supabase start` funcionando en local
- [ ] **Migración inicial con el esquema completo** de [`02-modelo-de-datos.md`](02-modelo-de-datos.md)
- [ ] Funciones `is_admin()`, `treats_patient()`, `current_role()` y RLS en todas las tablas
- [ ] `lib/supabase/` (cliente server y browser), middleware de sesión
- [ ] Layout base, tokens CSS con paleta neutra profesional
- [ ] `npm run db:types` funcionando y `lib/db/types.ts` commiteado
- [ ] CI en GitHub Actions: `typecheck`, `lint`, `build`
- [ ] `CLAUDE.md` en la raíz
- [ ] Los 4 changes de OpenSpec validados (`openspec validate --all --strict`)
- [ ] Despliegue vacío funcionando en Railway
- [ ] `.env.example` completo y valores de desarrollo repartidos al equipo

**Criterio de fin:** las otras tres personas clonan, siguen
[`08-onboarding-equipo.md`](08-onboarding-equipo.md) y tienen la app corriendo en menos de
30 minutos.

### Días 3–5 — Los cuatro slices en paralelo

| | Slice 1 | Slice 2 | Slice 3 | Slice 4 |
|---|---|---|---|---|
| **Día 3** | Login, registro, `profiles` | Siembra de ejercicios, listado | Modelo de asignación y snapshot | Tamizaje: alta y listado |
| **Día 4** | Alta de personal y pacientes (admin) | Plantillas: CRUD | Vista del paciente: ver su rutina | Asistencia |
| **Día 5** | Onboarding del paciente completo | Catálogo y plantillas | Asignación de rutina por el profesional + checklist móvil básico | Planes y servicios |

**Cierre del día 5 — el hito que no se negocia:** un paciente nuevo se registra, su
entrenador o fisioterapeuta elige y asigna una rutina, y el paciente la ve en el celular.

Si el viernes eso no funciona, se recorta alcance de la semana 2, no se estira el plazo.

## Semana 2

### Días 6–8 — Profundidad

- Checklist completo: series, repeticiones, peso reales, esfuerzo, **dolor 0–10**,
  ubicación y observaciones
- Ajuste de la rutina por el profesional (verificando que la plantilla no cambia)
- Generación de alertas: dolor persistente, ejercicios saltados
- Gráficas de tamizaje (Recharts) y progresión de carga
- Membresías con fechas y job de `pg_cron` para vencimientos
- Panel de administración con las alertas y el panorama del negocio
- Manifest y service worker de la PWA

### Día 9 — Identidad visual

Paleta y logo aplicados **sobre los tokens CSS ya existentes**. Es un cambio de variables,
no un rediseño de pantallas — por eso vale la pena que la marca se diseñe en paralelo
desde el día 1 y no bloquee nada.

También: revisión de textos en español, estados vacíos y mensajes de error.

### Día 10 — Cierre

- Datos de demostración realistas: pacientes con historia, sesiones con dolor reportado,
  tamizajes con dos o tres registros para que las gráficas tengan forma
- **Los 9 caminos de [`07-plan-de-verificacion.md`](07-plan-de-verificacion.md), en un
  teléfono real**
- Despliegue final y verificación de instalación como PWA en Android y iOS
- Guion de la demostración: qué se muestra, en qué orden, con qué usuario

---

## Reparto de personas

| Persona | Slice | Además |
|---|---|---|
| Owner técnico | Slice 1 + esquema | Revisión de todas las migraciones y políticas RLS |
| Persona 2 | Slice 2 | Siembra e imágenes en Storage |
| Persona 3 | Slice 3 | Es el slice más grande: si hay una cuarta persona con holgura, refuerza aquí |
| Persona 4 | Slice 4 | Datos de demostración del día 10 |

El slice 3 concentra el valor demostrable del producto: es donde se ve el dolor reportado,
el checklist y las alertas. Si algo se recorta, no se recorta ahí.

## Qué se recorta si vamos tarde

En este orden, y se avisa al cliente:

1. Panorama del negocio en el panel de administración (las alertas se quedan)
2. Gráfica de progresión de carga (la de tamizaje se queda)
3. Vitrina de servicios adicionales (los planes se quedan)
4. Alerta de baja asistencia (el registro de asistencia se queda)

**Nunca se recorta:** RLS, la asignación de rutinas por el profesional, el registro de dolor ni el checklist. Son
lo que el cliente pidió explícitamente y lo que diferencia esto de una hoja de cálculo.
