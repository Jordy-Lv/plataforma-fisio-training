## Context

Este slice produce lo que el slice 3 consume: las plantillas que se copian y la función que
decide cuál. El contrato entre ambos —la firma de `evaluate-rules.ts`— se acuerda antes de
implementarlo, porque es la única dependencia real entre los dos slices.

Ver [`docs/03-motor-de-reglas.md`](../../../docs/03-motor-de-reglas.md) para la descripción
funcional del motor.

## Goals / Non-Goals

**Goals:**
- Que el equipo profesional pueda cambiar el criterio de asignación sin desplegar código.
- Que la decisión sea siempre explicable: qué regla ganó y por qué.
- Que la lógica de decisión sea comprobable sin base de datos.

**Non-Goals:**
- Traducir los 800 ejercicios importados. Se traducen y etiquetan solo los que entren en
  plantillas.
- Editor visual de rutinas con arrastrar y soltar. Un formulario ordenado basta para la
  demo.
- Versionado de plantillas. Si se edita una plantilla, se edita; las rutinas ya asignadas
  son snapshots y no se ven afectadas.

## Decisions

### `conditions` en `jsonb`, no en columnas

Las condiciones de una regla se guardan como `jsonb` validado con Zod, no como una tabla de
criterios normalizada.

Por qué: los criterios van a cambiar durante la demo —el equipo profesional va a pedir
condicionar por algo en lo que hoy no pensamos— y con `jsonb` eso es un cambio de esquema
Zod, no una migración. La normalización aportaría integridad referencial sobre unos valores
que ya están validados en la entrada.

El riesgo del `jsonb` es que acepte basura: se mitiga validando **siempre** con
`rules-schema.ts` antes de escribir, y validando también al leer, porque una regla escrita
por una versión anterior del esquema podría no cumplir el actual.

### El JSON es almacenamiento, no interfaz

El panel presenta un formulario por criterio, no un editor de JSON. El equipo profesional
no es técnico y una llave mal cerrada dejaría el motor sin reglas.

### `evaluate-rules.ts` es una función pura

```ts
evaluateRules(profile: PatientProfile, rules: AssignmentRule[]): MatchResult | null
```

Sin acceso a base de datos, sin efectos. Recibe el perfil y las reglas ya cargadas,
devuelve la regla ganadora o `null`.

Por qué: es la pieza que hay que poder comprobar con una tabla de casos —lo que exige el
camino 2 del plan de verificación— y es también lo que permite implementar el simulador sin
duplicar lógica: el simulador llama a la misma función que la asignación real.

### El filtro de contraindicaciones es un paso aparte

No se mezcla con la evaluación de reglas. Primero se decide la plantilla, después se
depuran los ejercicios incompatibles con las condiciones del paciente.

Por qué: son dos criterios distintos. La regla expresa "a este perfil le corresponde este
tipo de trabajo"; el filtro expresa "a esta persona concreta este movimiento le hace daño".
Mezclarlos obligaría a escribir una regla por combinación de condiciones, que es
exactamente lo que no queremos.

### Las imágenes se copian a Supabase Storage

El script descarga las imágenes de free-exercise-db y las sube a un bucket propio; no se
enlazan desde el repositorio de origen.

Por qué: durante la demostración no puede haber una dependencia externa que falle. Además
permite reemplazarlas por material propio sin cambiar de mecanismo.

## Risks / Trade-offs

**El equipo no define suficientes reglas y la mayoría de pacientes cae en el caso genérico**
→ Se preparan seis reglas de ejemplo en el seed, cubriendo los perfiles más frecuentes, y
se revisan con el equipo profesional antes del día 8.

**Un `jsonb` inválido rompe la evaluación en silencio** → Se valida al escribir y al leer;
una regla que no valida se ignora y genera una advertencia visible en el panel, en lugar de
detener toda la evaluación.

**La siembra de 800 ejercicios con sus imágenes tarda o falla a medias** → El script es
idempotente por `external_id` y puede reejecutarse; se ejecuta el día 3, no el día 10.

**Los ejercicios importados no traen contraindicaciones** → Es trabajo del equipo
profesional sobre los que realmente use. Sin ese etiquetado, el filtro no protege a nadie:
hay que dejarlo explícito con ellos.

## Open Questions

- ¿Quiere el equipo profesional una regla genérica de red de seguridad (prioridad 99) o
  prefiere que un perfil sin coincidencia quede para revisión manual? Ambas están
  soportadas; es una decisión de criterio que se pregunta en la demostración y no cambia el
  diseño.
