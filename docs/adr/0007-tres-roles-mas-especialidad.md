# ADR-0007 — Tres roles con especialidad, no cuatro roles

**Estado:** Aceptada · **Fecha:** 2026-09-05

## Contexto

El cliente describe cuatro perfiles: jefe/administrador, entrenador, fisioterapeuta y
cliente/paciente. La pregunta de modelado es si eso son cuatro roles o tres.

## Decisión

Tres roles en `profiles.role` —`admin`, `professional`, `patient`— más una columna
`specialty` (`training` | `physio`) obligatoria cuando el rol es `professional`.

## Alternativas consideradas

**Cuatro roles (`admin`, `trainer`, `physio`, `patient`).** Se descartó porque entrenador y
fisioterapeuta **hacen exactamente las mismas operaciones** sobre distinto contenido: crear
pacientes, asignar rutinas, ajustarlas, registrar tamizajes, ver alertas de sus asignados.

Separarlos en dos roles obligaría a duplicar cada política de RLS —y son decenas— sin
ganar ninguna capacidad. Cada política nueva tendría que escribirse dos veces, y una de las
dos se olvidaría tarde o temprano. Con datos de salud, esa clase de olvido es la que
produce una fuga.

**Un sistema de permisos granular (roles + permisos + asignaciones).** Correcto para un
producto con muchos clientes y necesidades distintas. Aquí es un solo negocio con cuatro
perfiles conocidos y estables: sería complejidad sin comprador.

## Consecuencias

**A favor:**
- Cada política de RLS se escribe una vez y aplica a ambos tipos de profesional.
- `care_assignments.kind` ya distingue quién atiende a quién y en qué calidad, que es donde
  la diferencia realmente importa.
- Un mismo paciente puede tener entrenador y fisioterapeuta simultáneamente sin ningún
  caso especial.

**En contra:**
- La interfaz debe filtrar por `specialty` donde corresponda (un fisioterapeuta ve
  plantillas `physio` por defecto). Es filtrado de presentación, no de autorización.
- Al cliente hay que explicarle el mapeo: sus cuatro perfiles siguen existiendo tal cual en
  la aplicación; la diferencia es solo cómo están representados por dentro.
