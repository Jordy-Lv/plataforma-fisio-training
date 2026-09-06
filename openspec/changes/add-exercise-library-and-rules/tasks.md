## 1. Catálogo de ejercicios

- [x] 1.1 Crear el bucket `exercise-media` en Storage con las políticas de acceso y verificar que una imagen subida se sirve públicamente
- [x] 1.2 Escribir `scripts/seed-exercises.ts` que importe free-exercise-db y suba las imágenes; verificar que el catálogo queda poblado
- [x] 1.3 Hacer el script idempotente por `external_id` y verificar que ejecutarlo dos veces no duplica ejercicios
- [x] 1.4 Listado de ejercicios con búsqueda y filtros por grupo muscular, equipamiento y entorno; verificar en móvil
- [x] 1.5 Alta y edición de ejercicios propios (`is_custom = true`) con carga de imagen; verificar que un paciente no puede crearlos ni editarlos
- [x] 1.6 Edición del etiquetado clínico (contraindicaciones) validando contra el vocabulario de `body-parts.ts`; verificar que un valor inválido se rechaza

## 2. Plantillas de rutina

- [x] 2.1 CRUD de `routine_templates` con tipo, objetivo, nivel, entorno y días por semana; verificar que solo `admin` escribe
- [x] 2.2 Gestión de días de la plantilla y de sus ejercicios con orden explícito; verificar que el orden se conserva al recargar
- [x] 2.3 Validación de plantilla completa antes de activarla; verificar que una plantilla sin días no se puede activar
- [x] 2.4 Desactivación de plantillas advirtiendo qué reglas quedarían sin plantilla activa
- [x] 2.5 Sembrar al menos cuatro plantillas de ejemplo (entrenamiento y rehabilitación) y verificar que aparecen en el panel

## 3. Motor de reglas

- [x] 3.1 Definir `rules-schema.ts` (Zod) con todos los criterios de `docs/03-motor-de-reglas.md` y verificar que rechaza condiciones inválidas
- [x] 3.2 Implementar `evaluate-rules.ts` como función pura y verificar con una tabla de al menos 10 casos, incluidos empate por prioridad y ninguna coincidencia
- [x] 3.3 Implementar el filtro de contraindicaciones como paso independiente y verificar que elimina los ejercicios incompatibles
- [x] 3.4 Manejar el día que queda con menos de tres ejercicios: marcar para revisión y generar alerta; verificar que nunca se entrega un día vacío
- [x] 3.5 Acordar con el slice 3 la firma exacta de `evaluateRules` y dejarla documentada en el propio módulo

## 4. Panel de parametrización

- [x] 4.1 Listado de reglas ordenado por prioridad con indicación de activa/inactiva
- [x] 4.2 Formulario de regla por criterio (no editor de JSON) con validación Zod; verificar que guarda un `conditions` válido
- [x] 4.3 Reordenamiento por prioridad y verificar que cambia el orden de evaluación
- [x] 4.4 Activar y desactivar reglas; verificar que una regla inactiva no participa aunque tenga la prioridad más alta
- [x] 4.5 Mostrar advertencia visible cuando una regla almacenada no valida contra el esquema actual
- [x] 4.6 Restringir la escritura de reglas a `admin` y verificar que un `professional` solo puede consultarlas

## 5. Simulador

- [x] 5.1 Formulario de perfil ficticio reutilizando los esquemas del onboarding
- [x] 5.2 Mostrar regla ganadora, plantilla resultante y ejercicios excluidos por contraindicación
- [x] 5.3 Verificar que una simulación no crea ningún registro en la base de datos
- [x] 5.4 Sembrar seis reglas de ejemplo y verificar con el simulador que cubren los perfiles frecuentes

## 6. Cierre

- [x] 6.1 Ejecutar el camino 2 del plan de verificación, incluido el paso 5 (cambiar la regla cambia la asignación del siguiente paciente)
