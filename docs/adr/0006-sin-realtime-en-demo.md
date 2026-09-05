# ADR-0006 — Sin tiempo real en la Etapa 1

**Estado:** Aceptada · **Fecha:** 2026-09-05

## Contexto

El documento de resumen entregado al cliente menciona que el panel del profesional se
actualiza al instante cuando el paciente marca un ejercicio. Supabase incluye Realtime, así
que técnicamente está disponible sin contratar nada adicional.

## Decisión

**No usar Realtime en la Etapa 1.** Las alertas se generan al escribir (mediante trigger o
en la propia server action) y se leen al cargar el panel.

## Alternativas consideradas

**Suscripciones de Realtime en el panel del profesional.** Se descartó porque el beneficio
observable es nulo en el contexto real de uso:

- **Nadie mira el panel mientras un paciente entrena.** El paciente entrena a las 6 de la
  mañana; el profesional revisa por la tarde.
- Lo que el negocio necesita es que la información **quede registrada y genere una
  alerta**, no que aparezca en pantalla en el mismo segundo.
- Implica manejar suscripciones, reconexión, limpieza al desmontar y RLS sobre el canal.
  Es superficie de error nueva en un plazo de dos semanas.

**Sondeo periódico.** Los mismos inconvenientes sin las ventajas.

## Consecuencias

**A favor:**
- Menos código, menos estado en el cliente, menos formas de fallar en la demostración.
- Las alertas siguen funcionando: es lo que el cliente pidió realmente.

**En contra:**
- Hay que refrescar para ver actividad recién ocurrida.
- El documento del cliente promete tiempo real. **Esta diferencia debe confirmarse por
  escrito con el cliente antes del día 3**, junto con el resto del alcance de
  [`../00-contexto-y-alcance.md`](../00-contexto-y-alcance.md).

## Cuándo reconsiderarlo

Si aparece un caso de uso real —por ejemplo, entrenamiento presencial donde el profesional
sigue la sesión desde una tablet mientras ocurre— Realtime se activa sobre el modelo
existente sin cambios de esquema. La decisión de hoy no cierra esa puerta.
