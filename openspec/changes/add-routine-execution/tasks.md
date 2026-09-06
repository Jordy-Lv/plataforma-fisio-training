## 1. Asignación con snapshot

- [x] 1.1 Acordar con el slice 2 la firma de `evaluateRules` y dejarla fijada por escrito
- [x] 1.2 Implementar la función de Postgres que copia plantilla → rutina en una transacción; verificar que un fallo a medias no deja rutina parcial
- [x] 1.3 Server action de asignación: evaluar reglas, copiar, aplicar el filtro de contraindicaciones y registrar qué se excluyó
- [x] 1.4 Verificar que asignar la misma plantilla a tres pacientes deja `template_items` idéntica
- [x] 1.5 Manejar el caso sin coincidencia de reglas: sin rutina, con alerta al profesional; verificar el mensaje en la vista del paciente
- [x] 1.6 Cerrar la rutina anterior del mismo tipo al asignar una nueva; verificar que el historial de sesiones se conserva

## 2. Ajuste por el profesional

- [x] 2.1 Vista de la rutina de un paciente para el profesional a cargo; verificar que un profesional no asignado no accede
- [x] 2.2 Editar series, repeticiones, peso objetivo y descanso, marcando el ítem como modificado
- [x] 2.3 Eliminar, añadir y sustituir ejercicios desde el catálogo
- [x] 2.4 Verificar el camino 3 del plan de verificación: tras ajustar, `template_items` no cambió
- [x] 2.5 Verificar por API que un paciente no puede escribir en `routine_items`

## 3. Vista del paciente

- [x] 3.1 Vista de la rutina del día en modo checklist, a 375 px; verificar objetivos táctiles de 44 px
- [x] 3.2 Detalle del ejercicio con imagen o GIF y descripción, volviendo sin perder lo marcado
- [x] 3.3 Estado sin rutina asignada con mensaje explicativo, no una lista vacía
- [x] 3.4 Mostrar las dos rutinas cuando el paciente tiene entrenamiento y rehabilitación activas

## 4. Registro de la sesión

- [x] 4.1 Iniciar sesión de entrenamiento y persistir cada marca en el momento; verificar que cerrar la aplicación no pierde lo marcado
- [x] 4.2 Registrar series, repeticiones y peso reales, distinguibles de los prescritos
- [x] 4.3 Marcar como saltado exigiendo motivo en el mismo paso: nivel de dolor, zona y observación
- [x] 4.4 Registrar esfuerzo percibido y sustitución de ejercicio
- [x] 4.5 Validar rango de dolor 0–10 y vocabulario de zonas en base de datos y con Zod; verificar que ambos rechazan valores inválidos
- [x] 4.6 Cerrar la sesión y verificar que el profesional a cargo la ve

## 5. Alertas

- [x] 5.1 Crear la tabla de umbrales configurables con sus valores por defecto
- [x] 5.2 Evaluar y generar alertas al cerrar la sesión: dolor persistente y ejercicios saltados
- [x] 5.3 Dirigir la alerta a todos los profesionales con asignación vigente y al administrador
- [x] 5.4 Bandeja de alertas del profesional con contexto y severidad; marcar como leída
- [x] 5.5 Bandeja del administrador con todas las alertas
- [x] 5.6 Verificar por API que un paciente no lee alertas y que un profesional no asignado no ve las de ese paciente
- [x] 5.7 Verificar el camino 5 del plan de verificación de extremo a extremo

## 6. Cierre

- [ ] 6.1 Ejecutar los caminos 3, 4 y 5 del plan de verificación en un teléfono real y registrar el resultado

Evidencia de las secciones 3–5: [session-verification.md](session-verification.md).
La prueba de teléfono físico (6.1) sigue pendiente; allí también se documentan
los contratos pendientes con retirada de ejercicios y gráfica de progresión.
