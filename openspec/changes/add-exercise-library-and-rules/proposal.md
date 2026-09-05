## Why

El motor que propone rutinas automáticamente necesita dos cosas que hoy no existen: un
catálogo de ejercicios etiquetado (equipamiento, entorno, contraindicaciones) y un conjunto
de reglas que traduzca el criterio del equipo profesional en asignaciones consistentes.

Sin esto, cada rutina se arma a mano —que es exactamente el trabajo que la plataforma viene
a eliminar— y el motor del slice 3 no tiene de dónde copiar.

## What Changes

- Catálogo `exercises` con imagen o GIF, descripción, grupos musculares, equipamiento,
  entorno, dificultad y contraindicaciones.
- Siembra automática desde free-exercise-db (~800 ejercicios, MIT), con las imágenes
  alojadas en Supabase Storage.
- Creación y edición de ejercicios propios del negocio, distinguidos de los importados.
- Plantillas de rutina (`routine_templates`, `template_days`, `template_items`) definidas
  por el equipo, para entrenamiento y para rehabilitación.
- Motor de reglas `assignment_rules`: condiciones en `jsonb`, evaluadas por prioridad, la
  primera que coincide gana.
- Panel de parametrización para el equipo profesional, con reordenamiento por prioridad.
- **Simulador**: se introduce un perfil de paciente ficticio y se muestra qué regla ganaría
  y qué plantilla se asignaría.

## Capabilities

### New Capabilities

- `exercise-library`: el catálogo de ejercicios y su etiquetado clínico.
- `routine-templates`: las rutinas base que define el equipo profesional.
- `assignment-rules`: las reglas que deciden qué plantilla recibe cada paciente.

### Modified Capabilities

Ninguna.

## Impact

- **Esquema:** `exercises`, `routine_templates`, `template_days`, `template_items`,
  `assignment_rules`, más índices GIN sobre los arreglos de `exercises`.
- **Código:** `app/(admin)/exercises/**`, `app/(admin)/templates/**`,
  `app/(admin)/rules/**`, `lib/catalog/**`, `scripts/seed-exercises.ts`.
- **Almacenamiento:** bucket público `exercise-media` en Supabase Storage.
- **Otros slices:** el slice 3 consume `template_*` para copiar el snapshot y
  `evaluate-rules.ts` para decidir. El contrato de esa función se acuerda con el slice 3
  antes de implementarla.
