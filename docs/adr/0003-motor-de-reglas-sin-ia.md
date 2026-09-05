# ADR-0003 — Motor de asignación por reglas, sin IA

**Estado:** Aceptada · **Fecha:** 2026-09-05

## Contexto

Cuando un paciente se registra —con su objetivo, nivel, entorno, equipamiento y sus
condiciones físicas— la plataforma debe proponerle una rutina base sin que un profesional
la arme desde cero.

En la reunión se planteó explícitamente la disyuntiva: ¿inteligencia artificial o
parámetros? El equipo profesional respondió que el criterio lo aportan ellos, y que la
plataforma debe aplicarlo, no sustituirlo.

## Decisión

**Reglas parametrizadas evaluadas por prioridad**, editables por el equipo desde el panel
de administración. La primera regla cuyas condiciones coinciden con el perfil del paciente
determina la plantilla. Un segundo filtro elimina los ejercicios contraindicados por las
condiciones activas del paciente.

Detalle en [`../03-motor-de-reglas.md`](../03-motor-de-reglas.md).

## Alternativas consideradas

**Un LLM que genere la rutina.** Descartada por cuatro razones, en orden de peso:

1. **Responsabilidad clínica.** Son personas con lesiones. Si un modelo prescribe un
   ejercicio que agrava una condición, no hay forma de explicar por qué lo hizo ni de
   garantizar que no vuelva a ocurrir.
2. **No auditable.** El equipo profesional no puede revisar ni corregir el criterio.
3. **Costo por asignación**, recurrente e impredecible, sobre un producto de precio
   ajustado.
4. **Latencia y dependencia** de un proveedor externo en el momento del registro.

**Reglas escritas en código.** Más rápido de programar, pero cada ajuste de criterio
—que en la demo va a haber varios— exigiría un despliegue. Además impide el simulador,
que es lo que hace creíble el motor frente al cliente.

**Árbol de decisión entrenado con datos históricos.** No hay datos históricos: hoy todo
está en Excel y WhatsApp.

## Consecuencias

**A favor:**
- Explicable: siempre se puede decir qué regla se aplicó y por qué.
- Editable por el equipo profesional sin desarrollador de por medio.
- Determinista, sin costo por uso ni dependencia externa.
- Comprobable con una función pura y una tabla de casos.

**En contra:**
- Alguien tiene que definir el conjunto inicial de reglas. Es trabajo del equipo
  profesional, y es exactamente el que aporta el valor.
- No generaliza a perfiles imprevistos. Se maneja con una regla de red de seguridad o
  dejando al paciente sin rutina automática y alertando al profesional — **nunca
  asignando algo aproximado**.

## Puerta abierta

Si en la Etapa 3 se quiere asistencia de IA, el lugar natural es **sugerirle reglas al
equipo** a partir de los datos ya acumulados, para que las revise y apruebe. La decisión
final sigue siendo humana y el motor sigue siendo determinista.
