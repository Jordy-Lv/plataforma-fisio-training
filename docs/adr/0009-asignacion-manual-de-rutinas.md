# ADR-0009 — Asignación de rutinas decidida por el profesional

**Estado:** Aceptada · **Fecha:** 2026-09-24 · **Supera:** ADR-0003

## Contexto

La decisión anterior proponía una rutina automáticamente según reglas evaluadas contra el
perfil del paciente. El flujo requerido es que el entrenador o fisioterapeuta elija la
rutina de cada paciente. El profesional conoce el caso, debe revisar las condiciones y es
responsable de ajustar la rutina antes de asignarla.

## Decisión

El entrenador o fisioterapeuta selecciona una plantilla de su especialidad, revisa y ajusta
la copia individual, y confirma la asignación. El sistema no elige ni propone una plantilla
por perfil y no asigna una rutina al terminar el onboarding.

La asignación conserva el snapshot definido en ADR-0001. Los controles de autorización y
contraindicaciones siguen aplicándose durante el flujo.

## Consecuencias

- El paciente puede completar el registro sin recibir una rutina; espera a que su profesional
  la asigne.
- El profesional debe poder encontrar las plantillas disponibles para su especialidad desde
  el contexto del paciente.
- La selección, revisión, ajuste y confirmación deben ser pasos claros de la interfaz.
- El panel de reglas, el simulador y la selección automática por prioridad dejan de ser parte
  del flujo requerido.
- La implementación actual aún depende de `assignment_rules` y de una regla ganadora. Se
  necesita un cambio de código y de esquema para retirar esa dependencia; esta decisión no
  afirma que ya esté implementado.

## Transición

ADR-0003 se conserva como registro histórico de la decisión anterior. Su documentación de
detalle no debe usarse como alcance vigente. Los requisitos del nuevo flujo y la nota sobre
la implementación actual están descritos en
[`../03-motor-de-reglas.md`](../03-motor-de-reglas.md) y
[`../00-contexto-y-alcance.md`](../00-contexto-y-alcance.md).
