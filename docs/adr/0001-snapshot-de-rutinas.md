# ADR-0001 — Snapshot de rutinas en lugar de referencia a plantilla

**Estado:** Aceptada · **Fecha:** 2026-09-05

## Contexto

El equipo profesional define rutinas base ("plantillas") por objetivo y por condición. Al
asignarle una a un paciente, el profesional necesita ajustarla a ese caso concreto:
cambiar series, quitar un ejercicio que le molesta, sustituir otro.

En la reunión quedó explícito cómo debe funcionar: la parametrización general la define el
equipo una sola vez, y la especificidad se aplica después, paciente por paciente.

Hay dos formas de modelarlo:

- **Referencia:** la rutina del paciente apunta a la plantilla y guarda solo las
  diferencias.
- **Snapshot:** al asignarla, se copian los ejercicios a tablas propias del paciente.

## Decisión

**Snapshot.** Al asignar una rutina se copian `template_days` y `template_items` a
`routine_days` y `routine_items`. El profesional edita la copia. `source_template_id` se
guarda solo para trazabilidad, nunca para leer contenido.

## Alternativas consideradas

**Referencia con tabla de diferencias.** Ahorra almacenamiento y permite propagar mejoras
de la plantilla a todos los pacientes automáticamente. Se descartó porque:

1. La propagación automática es un **riesgo clínico**, no una ventaja: cambiar una
   plantilla modificaría en silencio la rutina de pacientes que ya la están ejecutando,
   posiblemente contra el criterio del profesional que la ajustó.
2. El historial deja de ser fiel: al revisar una sesión de hace un mes, no se sabría qué
   ejercicio estaba prescrito realmente ese día.
3. La lógica de "plantilla más diferencias" hay que resolverla en cada consulta, en todas
   las vistas. Con snapshot, `routine_items` es la verdad, sin cálculo.

**Copiar solo al primer ajuste** (copy-on-write). Añade un estado intermedio —rutinas que
a veces son referencia y a veces copia— que hay que manejar en cada consulta. La
complejidad no compensa el almacenamiento ahorrado.

## Consecuencias

**A favor:**
- La plantilla nunca se contamina con ajustes individuales.
- El historial es fiel: lo que se ejecutó fue exactamente lo prescrito.
- Las consultas son directas, sin resolver herencia.

**En contra:**
- Los datos se duplican. A esta escala (cientos de pacientes, decenas de ejercicios cada
  uno) es irrelevante.
- Mejorar una plantilla no beneficia a las rutinas ya asignadas. **Es intencional**: si el
  negocio lo quiere después, será una acción explícita del profesional ("reasignar
  plantilla actualizada"), nunca automática.

## Verificación

Camino 3 de [`../07-plan-de-verificacion.md`](../07-plan-de-verificacion.md): tras
modificar la rutina de un paciente, `template_items` debe estar idéntica.
