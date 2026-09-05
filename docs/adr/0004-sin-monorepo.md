# ADR-0004 — Un solo proyecto Next.js, sin monorepo

**Estado:** Aceptada · **Fecha:** 2026-09-05

## Contexto

Tres vistas de rol muy distintas (administración, profesional, paciente), cuatro personas
trabajando en paralelo y dos semanas de plazo. Surge la pregunta de si conviene separar en
paquetes.

## Decisión

**Un solo proyecto Next.js**, con las vistas separadas por grupos de rutas del App Router
(`(admin)`, `(pro)`, `(patient)`) y la lógica separada por slice en `lib/<slice>/`.

## Alternativas consideradas

**Monorepo (Turborepo/pnpm workspaces) con `apps/` y `packages/`.** Se descartó porque a
esta escala no resuelve ningún problema real y sí crea varios:

- No hay un segundo consumidor de la lógica ni un paquete que publicar.
- Añade configuración de workspaces, de build y de resolución de tipos que hay que
  mantener y depurar.
- **Complica el arranque de cuatro personas el día 3**, que es exactamente cuando no
  podemos permitirnos fricción de herramientas.
- El aislamiento entre slices que buscaríamos se consigue con convención de carpetas y
  revisión de PRs, que es gratis.

**Tres aplicaciones Next.js separadas.** Triplicaría despliegues, sesiones y componentes
compartidos, para un producto que tiene una sola base de datos y una sola sesión.

## Consecuencias

**A favor:**
- `npm install && npm run dev` y estás trabajando.
- Componentes y tipos compartidos sin configuración.
- Un solo despliegue, un solo conjunto de variables de entorno.

**En contra:**
- El aislamiento entre slices depende de disciplina, no de la herramienta. Se compensa con
  el ownership de carpetas de [`../05-flujo-de-trabajo.md`](../05-flujo-de-trabajo.md).
- Si algún día hubiera que extraer una aplicación aparte, habría trabajo de separación. Es
  un problema que aparecería con un producto muy distinto al que estamos construyendo.
