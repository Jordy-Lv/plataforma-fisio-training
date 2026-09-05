## 1. Tamizaje

- [x] 1.1 Formulario de registro de tamizaje para el profesional y el administrador; verificar que un profesional no asignado no puede
- [x] 1.2 Columna generada de IMC; verificar que coincide con el cálculo esperado para varios pares de peso y talla
- [x] 1.3 Historial de tamizajes de un paciente ordenado por fecha
- [x] 1.4 Verificar por API que un paciente no puede crear ni modificar tamizajes

## 2. Gráficas

- [ ] 2.1 Agregación de datos de evolución en el servidor y gráfica de peso y medidas con Recharts
- [ ] 2.2 Estado con un solo tamizaje: valor más mensaje explicativo, sin gráfica vacía
- [ ] 2.3 Estado sin tamizajes con mensaje explicativo
- [ ] 2.4 Verificar en teléfono de 375 px que la gráfica no desborda horizontalmente
- [ ] 2.5 Gráfica de progresión de carga por ejercicio a partir de `session_logs`; verificar con datos del seed
- [ ] 2.6 Estado de progresión con un solo registro

## 3. Asistencia

- [ ] 3.1 Registro de asistencia por el profesional o el administrador; verificar el rechazo del duplicado en la misma fecha
- [ ] 3.2 Historial de asistencia por paciente y resumen del mes en curso
- [ ] 3.3 Vista del paciente con sus propias asistencias; verificar por API que no ve las de otro
- [ ] 3.4 Verificar que un paciente no puede registrar su propia asistencia

## 4. Planes y servicios

- [ ] 4.1 CRUD de planes con descripción, precio, periodicidad y qué incluye; verificar que solo `admin` escribe
- [ ] 4.2 CRUD de servicios adicionales por categoría
- [ ] 4.3 Vitrina visible para el paciente con planes y servicios activos; verificar en móvil
- [ ] 4.4 Desactivación de un plan; verificar que desaparece de la vitrina y las membresías existentes siguen funcionando

## 5. Membresías

- [ ] 5.1 Registro y edición de membresías con fechas, monto y estado; verificar que solo `admin` escribe
- [ ] 5.2 Vista del paciente con su plan y su fecha de vencimiento; verificar por API que no puede modificarla
- [ ] 5.3 Vista del profesional con el estado de la membresía de sus pacientes asignados
- [ ] 5.4 Panel de administración con las membresías próximas a vencer y vencidas

## 6. Job de vencimientos

- [ ] 6.1 Verificar que `pg_cron` se puede habilitar en el proyecto; si no, plantear la alternativa manual antes del día 5
- [ ] 6.2 Ruta interna protegida por secreto compartido; verificar que sin el secreto la petición se rechaza
- [ ] 6.3 Lógica de revisión: marcar próximas a vencer y vencidas, y generar los avisos
- [ ] 6.4 Hacerla idempotente y verificar que dos ejecuciones seguidas no duplican avisos
- [ ] 6.5 Plazo de aviso configurable; verificar que cambiarlo altera el resultado de la siguiente ejecución
- [ ] 6.6 Envío de correo de aviso en español; verificar que llega en el entorno local
- [ ] 6.7 Programar el job diario en `pg_cron` y verificar que se puede disparar a mano para la demostración

## 7. Cierre

- [ ] 7.1 Ejecutar los caminos 6 y 7 del plan de verificación y registrar el resultado
- [ ] 7.2 Preparar los datos de demostración: pacientes con tres o cuatro tamizajes, semanas de sesiones y membresías en distintos estados
