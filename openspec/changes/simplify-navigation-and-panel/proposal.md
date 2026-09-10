## Why

El negocio dice que la aplicación **se siente cargada y hay demasiadas cosas que no aportan
valor**. La validación de esa queja contra el código está en
[`docs/16-plan-de-mejora.md`](../../../docs/16-plan-de-mejora.md): el problema es de
superficie, no de funcionalidad —42 pantallas, 13 entradas de menú al admin, `/admin` y
`/pro` siendo la misma pantalla—, y por el camino aparecieron nueve defectos, dos de ellos
incumplimientos del alcance de la Etapa 1.

Este change ejecuta ese plan. Cada tarea corresponde a un ticket del proyecto `KAN` de Jira,
que sigue siendo la fuente de verdad del estado; aquí se marca la casilla al cerrarla, como
pide [`CLAUDE.md`](../../../CLAUDE.md) §12.

## What Changes

- Menú plano de ocho entradas con pestañas dentro de tres secciones (**KAN-11**).
- `/admin` y `/pro` dejan de ser la misma pantalla, de siete KPI a tres cada una (**KAN-5**).
- El porcentaje de cumplimiento se calcula en la base y deja de falsearse en silencio (**KAN-12**).
- Las reglas se llaman «Asignación» y el formulario baja de siete criterios a cuatro (**KAN-7**).
- El motor de reglas se dispara solo al terminar el registro del paciente (**KAN-9**).
- Las alertas se reparten mirando la especialidad del profesional (**KAN-10**).
- Se puede cerrar y reasignar el acompañamiento de un paciente (**KAN-13**), y verlo desde
  Personas (**KAN-6**).
- Crear una plantilla deja de exigir dos fases (**KAN-8**), y los filtros de Personas viajan
  en la URL con paginación (**KAN-14**).

## Capabilities

### Modified Capabilities

- `auth-and-roles`: cierre y reasignación de `care_assignments`, y su vista en Personas.
- `exercise-library-and-rules`: presentación del apartado de asignación y alta de plantilla.
- `routine-execution`: disparo automático del motor y reparto de alertas por especialidad.
- `progress-and-memberships`: agregación del cumplimiento en la base.

### New Capabilities

Ninguna. Nada de esto añade alcance: cierra lo que
[`docs/00-contexto-y-alcance.md`](../../../docs/00-contexto-y-alcance.md) ya prometía.

## Impact

- Compartido, avisar antes del PR ([`CLAUDE.md`](../../../CLAUDE.md) §3):
  `components/shell/**` y el esquema core (`care_assignments`).
- Migraciones nuevas en KAN-9, KAN-10, KAN-12 y KAN-13, con `lib/db/types.ts` regenerado en
  el mismo PR.
- **La CI no corre** ([`docs/15`](../../../docs/15-pendiente-del-proyecto.md) A.1): los cuatro
  checks y las suites de las pantallas tocadas se pasan a mano antes de cada PR.
