# 05 — Flujo de trabajo

Cuatro personas y cuatro agentes de IA sobre el mismo repositorio durante dos semanas. Sin
un protocolo explícito, el resultado previsible es: cuatro estilos de código distintos,
migraciones que se pisan y un `main` roto a mitad de semana.

Este documento evita eso. Lo de aquí es el proceso; las convenciones de código están en
[`CLAUDE.md`](../CLAUDE.md) y el detalle de PRs en [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## OpenSpec

El trabajo se organiza en **changes**: unidades de alcance con su propuesta, su diseño, sus
especificaciones y sus tareas. Los cuatro de la Etapa 1 ya están creados:

```
openspec/changes/
├── add-auth-and-roles/              Slice 1
├── add-exercise-library-and-rules/  Slice 2
├── add-routine-execution/           Slice 3
└── add-progress-and-memberships/    Slice 4
```

Cada uno contiene:

| Archivo | Qué es |
|---|---|
| `proposal.md` | Por qué existe este change y qué capacidades introduce |
| `design.md` | Cómo se implementa: decisiones técnicas y alternativas descartadas |
| `specs/<capability>/spec.md` | **Qué debe hacer el sistema**, en requisitos y escenarios verificables |
| `tasks.md` | La lista de tareas con casillas, en orden de dependencia |

### Comandos del día a día

```bash
openspec list                                  # changes activos
openspec show add-routine-execution            # leer un change completo
openspec status --change add-routine-execution # qué falta
openspec validate --all --strict               # validar antes del PR
openspec archive add-routine-execution         # al terminarlo
```

Con Claude Code: `/opsx:apply` para implementar un change, `/opsx:propose` para proponer
uno nuevo.

### La regla que importa

**Las specs mandan sobre el código.** Si al implementar descubres que el comportamiento
correcto es otro, actualiza la spec **en el mismo PR**. Una spec desactualizada es peor
que no tener spec: la gente confía en ella y toma decisiones equivocadas.

---

## Protocolo anti-colisión

Cinco reglas. Son las que hacen o rompen un equipo de cuatro trabajando con agentes.

### 1. Los días 1–2 los trabaja una sola persona

El owner técnico monta, en solitario: proyecto Next.js, Supabase, **el esquema completo en
una migración**, RLS base, layout, shadcn, CI y `CLAUDE.md`. **Nadie más commitea hasta
que eso esté en `main`.**

Paralelizar aquí produce cuatro versiones incompatibles del esquema, y reconciliarlas
cuesta más que los dos días que se intentaba ahorrar.

### 2. Ownership de carpetas

| Slice | Es dueño de |
|---|---|
| 1 — auth | `app/(auth)/**`, `lib/auth/**`, `profiles`, `patient_details`, `patient_conditions` |
| 2 — catálogo | `app/(admin)/exercises/**`, `app/(admin)/templates/**`, `lib/catalog/**`, `exercises`, `routine_templates` |
| 3 — rutinas | `app/(pro)/**`, `app/(patient)/routine/**`, `lib/routines/**`, `routines`, `sessions`, `session_logs`, `alerts` |
| 4 — progreso | `app/(patient)/progress/**`, `app/(admin)/memberships/**`, `lib/progress/**`, `screenings`, `attendance`, `plans`, `memberships` |

**Compartido — requiere revisión del owner técnico:**
`components/ui/**` · `lib/supabase/**` · `app/layout.tsx` · `app/globals.css` ·
`profiles` · `care_assignments` · `package.json`

Necesitar un cambio en zona compartida es normal. Hacerlo sin avisar, no.

### 3. Migraciones

- Nombre: `<timestamp>_<slice>_<descripcion>.sql`.
- **Nunca se edita una migración fusionada a `main`.** Siempre una nueva.
- Antes del PR: `git pull --rebase origin main` y `npm run db:reset` limpio.
- Si tu migración toca una tabla de otro slice, avísale a esa persona antes.
- Si dos migraciones colisionan, gana la que llegó primero; la otra se rehace.

### 4. `lib/db/types.ts` es generado

```bash
npm run db:types
```

No se edita a mano. Se regenera y se commitea **solo** en PRs que incluyen migración. Si
aparece modificado en un PR sin migración, es que alguien lo editó a mano.

### 5. `main` nunca en rojo

CI corre `typecheck`, `lint` y `build` en cada PR. Verde es requisito de merge, sin
excepciones por urgencia. Un `main` roto bloquea a las otras tres personas.

---

## Trabajar con agentes de IA

Cada persona trabaja con su agente sobre su slice. Lo que mantiene el código coherente:

1. **`CLAUDE.md` se lee en cada sesión.** Es lo que hace que cuatro agentes produzcan el
   mismo estilo. Si notas que tu agente se desvía, recuérdaselo explícitamente.
2. **Un change por sesión.** Dale al agente el `tasks.md` de su change y nada más. Un
   agente con acceso al alcance completo inventa trabajo.
3. **Revisa las migraciones línea por línea.** Es donde un agente causa el daño más caro y
   más difícil de revertir.
4. **Verifica que RLS quedó como dice [`04-roles-y-permisos.md`](04-roles-y-permisos.md).**
   Los agentes tienden a escribir políticas permisivas porque "funcionan" en la prueba
   feliz.
5. **Nada de código generado sin leer.** Firmas el PR con tu nombre.

## Comunicación

- **Antes de tocar zona compartida:** aviso al canal del equipo.
- **Al terminar un camino de verificación:** se reporta en el canal, con el número.
- **Bloqueado más de 2 horas:** se dice. En un plazo de dos semanas, medio día perdido en
  silencio es el 5 % del proyecto.
- **Cambio de alcance propuesto por el cliente:** no se implementa directo. Se registra,
  se evalúa contra [`00-contexto-y-alcance.md`](00-contexto-y-alcance.md) y se decide si
  entra en la demo o en la Etapa 2.
