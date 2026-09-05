# 07 — Plan de verificación

Nueve caminos. Se recorren **en un teléfono real**, no solo en el emulador del navegador,
antes de mostrarle nada al cliente. Cada uno se marca cuando pasa completo; a medias no
cuenta.

El camino 9 no es opcional bajo ninguna circunstancia.

---

## 1. Alta y onboarding

**Objetivo:** que el circuito de creación de personas funcione de extremo a extremo.

1. Entrar como `admin` y crear un profesional con especialidad `physio`.
2. Entrar como ese profesional y crear un paciente.
3. Entrar como el paciente y completar el onboarding: objetivo, entorno (`home`),
   equipamiento (`bands`) y una condición activa (`knee`, severidad `moderate`).

**Pasa si:** las tres sesiones funcionan con credenciales propias y el paciente aparece en
la lista del profesional que lo creó — y solo en la de ese profesional.

## 2. Motor de reglas

**Objetivo:** demostrar que la asignación está parametrizada y no escrita a mano.

1. Al terminar el onboarding, el paciente recibe una rutina automáticamente.
2. Revisar la rutina asignada: coherente con `home` + `bands` + su objetivo.
3. **Ningún ejercicio de la rutina tiene `knee` en `contraindications`.**
4. Entrar como `admin`, cambiar la plantilla asociada a esa regla.
5. Crear un segundo paciente con el mismo perfil: recibe la **nueva** plantilla.

**Pasa si:** los pasos 3 y 5 se cumplen. El 5 es la prueba de que el motor es
configurable; sin él, no hay motor.

## 3. Snapshot de rutina

**Objetivo:** que ajustar la rutina de un paciente no contamine a los demás.

1. Como profesional, abrir la rutina del paciente y modificarla: cambiar series de un
   ejercicio, eliminar otro, añadir uno nuevo.
2. Consultar en la base de datos `template_items` de la plantilla de origen.
3. Crear un tercer paciente que caiga en la misma regla.

**Pasa si:** `template_items` está **idéntica** a antes del paso 1, y el tercer paciente
recibe la plantilla original, sin los ajustes del primero.

## 4. Ejecución desde el celular

**Objetivo:** el flujo que el paciente usa a diario, en su teléfono.

1. Desde el móvil, entrar como paciente y abrir la rutina del día.
2. Abrir un ejercicio: se ve la imagen o GIF y la descripción.
3. Marcar el primer ejercicio como hecho, registrando series, repeticiones y peso reales.
4. **Saltar el segundo** con la observación "me generó dolor en la rodilla" y nivel de
   dolor 8, ubicación `knee`.
5. Registrar esfuerzo percibido en un tercero.
6. Cerrar la sesión.

**Pasa si:** en `session_logs` quedan las tres filas con su `status`, y la del paso 4
tiene `pain_level = 8`, `pain_location = 'knee'` y la observación completa. Y si todo se
pudo hacer con el pulgar, sin zoom.

## 5. Alertas

**Objetivo:** que la información reportada se convierta en algo accionable.

1. Repetir el paso 4 del camino anterior en **tres sesiones** distintas: mismo ejercicio,
   dolor alto.
2. Entrar como el profesional a cargo.
3. Entrar como `admin`.
4. Entrar como **otro** profesional que no tiene asignado a ese paciente.

**Pasa si:** la alerta de dolor persistente aparece en 2 y 3, con el contexto (ejercicio,
sesiones, nivel), y **no aparece** en 4.

## 6. Tamizaje y gráficas

**Objetivo:** sustituir la hoja de Excel con la que se hacía el seguimiento.

1. Como profesional, registrar un tamizaje (peso, talla, medidas).
2. Verificar que con un solo registro se muestra el valor y un mensaje explicando que
   falta un segundo tamizaje — no una gráfica vacía ni un error.
3. Registrar un segundo tamizaje con fecha posterior y valores distintos.

**Pasa si:** la gráfica de evolución se dibuja con los dos puntos y se ve correctamente en
pantalla de teléfono, sin desbordar horizontalmente.

## 7. Membresías y vencimientos

**Objetivo:** el control administrativo que pidió el cliente.

1. Como `admin`, crear una membresía que venza en 3 días.
2. Ejecutar el job de `pg_cron` manualmente.
3. Revisar el panel de administración y la vista del paciente.

**Pasa si:** la membresía pasa a `expiring_soon`, se genera la alerta
`membership_expiring`, el aviso se ve en el panel y el paciente ve el aviso en su vista.
Si el correo está configurado, llega el correo.

## 8. PWA

**Objetivo:** que se instale como un ícono en el teléfono, sin tiendas de aplicaciones.

1. Abrir la aplicación en Chrome Android → "Añadir a pantalla de inicio".
2. Abrir en Safari iOS → "Añadir a pantalla de inicio".
3. Abrir desde el ícono en ambos.

**Pasa si:** el ícono y el nombre son correctos, arranca en modo aplicación (sin barra de
direcciones), la sesión se mantiene, y ninguna vista del paciente desborda a lo ancho.

## 9. Aislamiento de datos (RLS) — **obligatorio**

**Objetivo:** demostrar que un paciente no puede ver los datos de otro. Son datos de
salud; una fuga aquí termina el contrato.

Estas pruebas se hacen **contra la API de Supabase directamente**, con el token de sesión
del usuario, no a través de la interfaz. La interfaz puede estar ocultando un botón
mientras la fila sigue siendo accesible.

1. Con la sesión de un paciente, consultar `session_logs` de otro paciente.
2. Con la sesión de un paciente, consultar `patient_details` de otro paciente.
3. Con la sesión de un profesional, consultar un paciente **no asignado**.
4. Con la sesión de un paciente, intentar `update` sobre un `routine_item` propio.
5. Con la sesión de un paciente, consultar `alerts`.
6. Con la sesión de un paciente, intentar `insert` en `sessions` con el `patient_id` de
   otro.

**Pasa si los seis devuelven vacío o error.** Un solo caso que devuelva datos detiene la
demo hasta que se corrija.

---

## Registro de la ejecución

Se recorre completo el día 10 y se anota resultado y fecha. Si un camino falla, se corrige
y **se vuelve a recorrer entero**, no solo el paso que falló.

| # | Camino | Estado | Fecha | Notas |
|---|---|---|---|---|
| 1 | Alta y onboarding | ⬜ | | |
| 2 | Motor de reglas | ⬜ | | |
| 3 | Snapshot de rutina | ⬜ | | |
| 4 | Ejecución desde el celular | ⬜ | | |
| 5 | Alertas | ⬜ | | |
| 6 | Tamizaje y gráficas | ⬜ | | |
| 7 | Membresías y vencimientos | ⬜ | | |
| 8 | PWA | ⬜ | | |
| 9 | **Aislamiento de datos (RLS)** | ⬜ | | |
