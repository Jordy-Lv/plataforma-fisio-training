# ADR-0002 — Railway como hosting de la aplicación

**Estado:** Aceptada · **Fecha:** 2026-09-05

## Contexto

La aplicación es un proyecto Next.js que necesita hosting para la demo, el piloto y la
producción. Es un **producto comercial**: un cliente paga por usarlo.

## Decisión

**Railway.**

## Alternativas consideradas

**Vercel (plan Hobby).** Es la opción por defecto para Next.js y es gratuita, pero sus
términos de servicio **prohíben el uso comercial** en ese plan. No es utilizable aquí, ni
siquiera durante la demo: no es una zona gris, es una violación de términos que puede
terminar con el proyecto suspendido en medio de una demostración al cliente.

**Vercel (plan Pro).** Resuelve lo anterior, pero su costo por asiento es desproporcionado
para una aplicación con decenas de usuarios y sin necesidades de edge ni de escalado
automático agresivo.

**Render.** Comparable a Railway en modelo y precio. Válida; la preferencia por Railway es
por familiaridad del equipo y despliegue por push más directo. Si Railway diera problemas,
migrar a Render no requeriría cambios de código.

**VPS propio.** Más barato en la factura y mucho más caro en horas: configurar servidor,
TLS, despliegue continuo, monitoreo y respaldos son días que no tenemos en un plazo de dos
semanas.

## Consecuencias

**A favor:**
- Uso comercial permitido sin restricciones.
- Despliegue por push, con vistas previas por rama.
- Costo predecible y no ligado a número de asientos.
- Sin acoplamiento: la aplicación es un Next.js estándar, portable a cualquier proveedor.

**En contra:**
- Menos optimizaciones específicas de Next.js que Vercel (ISR, edge). No las necesitamos:
  casi todo el contenido es privado y por usuario, no cacheable.
- Hay que configurar el dominio y el TLS a mano una vez.

## Nota sobre costos

El dimensionamiento de infraestructura por número de clientes (20 / 40 / 80 / 100) es un
análisis aparte, pendiente de investigación, y **no vive en este repositorio**. Lo que sí
es una restricción técnica y queda registrada aquí: **el paso a producción exige un plan
de Supabase con respaldos automáticos**. El plan gratuito pausa el proyecto tras días sin
actividad y no incluye respaldos; es aceptable para demo y piloto, e inaceptable para
operar con datos de salud reales.
