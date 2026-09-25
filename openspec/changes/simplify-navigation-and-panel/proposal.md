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
  en la URL con paginación (**KAN-14**). *Nota del 2026-09-25: los filtros por URL de KAN-14
  no se hicieron (deuda 3.3 de `docs/15`, congelada); lo que se entregó es que Personas
  declara cuánta gente deja fuera del listado. Ver la tarea 4.4.*

## Capabilities

### Modified Capabilities

- `user-auth`: menú de ocho entradas por rol (KAN-11) y paneles separados de `/admin` y
  `/pro`, con el cumplimiento agregado en la base (KAN-5, KAN-12).
- `staff-and-patient-management`: cierre y reasignación de `care_assignments` (KAN-13),
  quién acompaña a cada paciente (KAN-6) y el aviso de cuánta gente queda fuera del
  listado de Personas (KAN-14).
- `clinical-alerts`: reparto de alertas por especialidad (KAN-10).
- `routine-templates`: alta de plantilla con su primer día (KAN-8).

KAN-7 y KAN-9 no llevan delta. KAN-9 (el motor dispara al terminar el registro) lo revirtió
`manual-routine-assignment` ([ADR-0009](../../../docs/adr/0009-asignacion-manual-de-rutinas.md)),
y KAN-7 es interfaz del motor de reglas, que se retira en `retire-rules-engine`. Los deltas
se escribieron el 2026-09-25, después de implementar el change, a partir del código vigente:
hasta entonces el change no pasaba `openspec validate --strict`.

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
