# ADR-0010 — Restricción de especialidad en la asignación y confirmación de rutinas

**Estado:** Aceptada · **Fecha:** 2026-09-25 · **Supera parcialmente:** ADR-0007

## Contexto

[ADR-0007](0007-tres-roles-mas-especialidad.md) modeló al entrenador y al fisioterapeuta
como un solo rol, `professional`, con una columna `specialty`, y dejó escrito que filtrar por
especialidad «es filtrado de presentación, no de autorización».

[ADR-0009](0009-asignacion-manual-de-rutinas.md) pasa la elección de la rutina al
profesional: elige una plantilla de su especialidad, ajusta la copia y confirma. Con el
motor de reglas, la plantilla la escogía el sistema. Ahora la escoge una persona, y que un
entrenador asigne una plantilla de rehabilitación (o al revés) deja de ser un problema de
presentación: es una prescripción fuera de su competencia. Un filtro solo en la interfaz se
salta con una llamada directa a la API.

## Decisión

- Un profesional **solo puede seleccionar y confirmar** plantillas cuyo `kind` coincida con
  su `profiles.specialty`, y solo para pacientes con los que tenga una `care_assignments`
  vigente (`ended_at is null`) de ese mismo tipo. La base de datos lo comprueba en las
  funciones que crean el borrador y confirman la asignación; la interfaz solo evita ofrecer
  lo que el servidor rechazaría.
- El rol `admin` queda exento y puede asignar plantillas de las dos especialidades.
- La **edición puntual** de una rutina ya creada (`routine_items`: series, repeticiones,
  peso, descanso, quitar, añadir o sustituir un ejercicio) sigue autorizada para cualquier
  profesional que atienda al paciente (`treats_patient()`), como hasta ahora. Se conserva el
  principio de colaboración de ADR-0007: entrenador y fisioterapeuta comparten paciente y
  pueden corregirse.

## Alternativas consideradas

**Mantener la especialidad como filtro de presentación.** Descartada: bastaría una llamada
RPC para asignar una plantilla del otro tipo, y ADR-0009 hace del profesional el
responsable clínico de esa elección.

**Restringir también la edición por especialidad.** Descartada por ahora: obligaría a
reescribir las políticas de `routine_days` y `routine_items` y rompería la colaboración
entre profesionales que ADR-0007 buscaba, sin un caso real que lo pida.

## Consecuencias

- La frase de ADR-0007 «es filtrado de presentación, no de autorización» deja de valer
  **para la selección y confirmación de plantillas**. Sigue valiendo para la lectura y para
  la edición de rutinas ya asignadas.
- Las funciones de asignación necesitan la especialidad del actor y el tipo de su
  asignación de cuidado; no hace falta ninguna columna nueva: `profiles.specialty` y
  `care_assignments.kind` ya existen.
- El administrador necesita elegir en la interfaz de qué tipo es la rutina que prepara.
- El detalle de implementación está en el change de OpenSpec `manual-routine-assignment`.
