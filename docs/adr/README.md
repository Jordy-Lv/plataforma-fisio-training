# Decisiones de arquitectura (ADR)

Un ADR registra una decisión técnica junto con su contexto, sus alternativas y sus
consecuencias. Existe para que dentro de tres meses nadie —ni una persona nueva, ni un
agente— revierta una decisión sin entender por qué se tomó.

Formato: contexto, decisión, alternativas consideradas, consecuencias.
Un ADR aceptado no se edita: se supera con uno nuevo que lo referencia.

| # | Decisión | Estado |
|---|---|---|
| [0001](0001-snapshot-de-rutinas.md) | Snapshot de rutinas en lugar de referencia a plantilla | Aceptada |
| [0002](0002-hosting-railway.md) | Railway como hosting de la aplicación | Aceptada |
| [0003](0003-motor-de-reglas-sin-ia.md) | Motor de asignación por reglas, sin IA | Superada por ADR-0009 |
| [0004](0004-sin-monorepo.md) | Un solo proyecto Next.js, sin monorepo | Aceptada |
| [0005](0005-biblioteca-de-ejercicios.md) | free-exercise-db auto-hospedada | Aceptada |
| [0006](0006-sin-realtime-en-demo.md) | Sin tiempo real en la Etapa 1 | Aceptada |
| [0007](0007-tres-roles-mas-especialidad.md) | Tres roles con especialidad, no cuatro roles | Aceptada |
| [0008](0008-formularios-dentro-de-dialogos.md) | Qué formularios pueden vivir dentro de un diálogo | Propuesta |
| [0009](0009-asignacion-manual-de-rutinas.md) | Asignación de rutinas decidida por el profesional | Aceptada; supera ADR-0003 |
