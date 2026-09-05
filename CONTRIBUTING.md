# Cómo se trabaja en este repositorio

Cuatro personas y sus agentes tocando el mismo proyecto durante dos semanas. Lo que
sigue no es burocracia: es lo que evita que terminemos con cuatro versiones
incompatibles del esquema de base de datos.

Las convenciones de código están en [`CLAUDE.md`](CLAUDE.md). Este documento cubre el
proceso.

---

## 1. Antes de escribir código

Todo trabajo pertenece a un **change de OpenSpec**. Los cuatro changes de la Etapa 1 ya
existen en `openspec/changes/`:

| Change | Dueño (slice) |
|---|---|
| `add-auth-and-roles` | Slice 1 |
| `add-exercise-library-and-rules` | Slice 2 |
| `add-routine-execution` | Slice 3 |
| `add-progress-and-memberships` | Slice 4 |

Antes de empezar:

```bash
openspec show add-routine-execution        # lee proposal, design y specs
openspec status --change add-routine-execution
```

Si lo que vas a hacer **no está en el `tasks.md` de tu change**, no lo hagas todavía:
propón primero el cambio de alcance en el canal del equipo. Ampliar el alcance por
iniciativa propia es la forma más rápida de no llegar al día 10.

## 2. Ramas

```
<slice>/<descripcion-corta>
```

Ejemplos: `routines/checklist-movil`, `catalog/seed-ejercicios`, `auth/rls-profiles`.

Se ramifica siempre desde `main` actualizado. `main` está protegida: no se commitea
directo, ni siquiera para un typo.

## 3. Commits

Formato [Conventional Commits](https://www.conventionalcommits.org/), en español:

```
feat(routines): registrar nivel de dolor por ejercicio
fix(auth): corregir política RLS que ocultaba pacientes propios
chore(db): regenerar tipos tras migración de membresías
docs(arquitectura): documentar decisión de snapshot de rutinas
```

Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
Ámbitos: `auth`, `catalog`, `routines`, `progress`, `db`, `ui`, `ci`.

Un commit hace una cosa. Si el mensaje necesita una "y", probablemente son dos commits.

## 4. Pull requests

- **Pequeños.** Un PR de más de ~400 líneas de diff no se revisa bien; se aprueba por
  cansancio. Divide.
- Se abren contra `main`, con la plantilla completa
  (`.github/pull_request_template.md`).
- **Una aprobación** para código dentro de tu slice.
- **Aprobación del owner técnico** para: migraciones, `components/ui/**`,
  `lib/supabase/**`, políticas RLS, dependencias nuevas, o cualquier cambio a
  `profiles` / `care_assignments`.
- CI verde es requisito. Nada entra en rojo, ni "porque el fallo no tiene que ver".

### Qué mira quien revisa

1. ¿Hay RLS en las tablas nuevas y las políticas dicen lo que dice
   [`docs/04-roles-y-permisos.md`](docs/04-roles-y-permisos.md)?
2. ¿Se validó la entrada en el servidor con Zod, y no solo en el formulario?
3. ¿Aparece `SUPABASE_SERVICE_ROLE_KEY` fuera del cron y el seed? → rechazo inmediato.
4. ¿Hay colores literales en lugar de tokens CSS?
5. ¿La migración es nueva, o se editó una ya fusionada? → rechazo inmediato.
6. ¿Los tres estados (cargando, vacío, error) están resueltos?

## 5. Migraciones — el punto de mayor riesgo

El esquema completo se crea **una sola vez, el día 2, por el owner técnico**. A partir de
ahí:

- Una migración nueva por cambio, nunca una edición de una existente.
- Antes de abrir el PR: `git pull --rebase origin main` y `npm run db:reset` en limpio.
- Si tu migración toca una tabla de otro slice, avísale a esa persona **antes** del PR.
- Los tipos regenerados (`lib/db/types.ts`) van en el mismo PR que la migración.

Si dos migraciones colisionan, gana la que llegó primero a `main`; la segunda se rehace.

## 6. Al terminar una tarea

1. Marca la casilla en `openspec/changes/<change>/tasks.md`.
2. Si el comportamiento acabó siendo distinto al de la spec, **actualiza la spec en el
   mismo PR**. Una spec desactualizada es peor que no tenerla.
3. Cuando el change esté completo: `openspec archive <change>`.

## 7. Definición de "terminado"

Una tarea está terminada cuando:

- [ ] El código pasa `typecheck`, `lint` y `build`.
- [ ] El camino correspondiente de [`docs/07-plan-de-verificacion.md`](docs/07-plan-de-verificacion.md) pasa a mano.
- [ ] Si toca datos de personas, se probó que **otro usuario no puede verlos**.
- [ ] Está fusionado a `main` y desplegado.

"Funciona en mi máquina" no está en esa lista.
