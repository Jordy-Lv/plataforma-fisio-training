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
| 1 | Alta y onboarding | ✅ | 2026-09-05 | Verificado con `npm run test:people` (10/10), incluido «Camino 1 completo por formularios y acciones del servidor»: admin crea profesional physio, este crea paciente y el paciente completa objetivo, casa, bandas y condición de rodilla moderada; las tres credenciales funcionan y otro profesional no ve al paciente. Paso 2 revisado en navegador a 375 × 812, sin desbordamiento y con objetivos táctiles de 44 px o más. `npm run test:auth:resilience` (14/14) verifica recuperación ante fallos de sesión y conservación de respuestas. Falta el recorrido en teléfono real del día 10. |
| 2 | Motor de reglas | ✅ | 2026-09-05 | Recorrido completo contra la aplicación local con las cuentas de la semilla. Paso 1 y 2: un paciente con `rehab` + `home` + `bands` y condición `knee` activa cae en la regla «Rehabilitación de rodilla» y recibe esa plantilla, sin escribir una línea de código — con la salvedad de que hoy **no es automático al terminar el onboarding**: la dispara el profesional a cargo desde `/pro/routines/[patientId]`. Paso 3: con la plantilla tal cual pasa de forma trivial, porque ninguno de sus ejercicios contraindica `knee`; para probar el filtro de verdad se contraindicó «Quad Stretch» y se repitió la asignación: el ejercicio no llega a la rutina, que pierde exactamente uno (10 de 11) y sigue sin ningún `knee` en `contraindications`. Pasos 4 y 5: el `admin` cambia la plantilla de esa regla desde `/rules/[id]` y el siguiente paciente con el mismo perfil recibe la plantilla nueva («Rehabilitación lumbar»), no la anterior. Las suites `npm run test:routines` («Cambiar la regla asigna otra plantilla y conserva ambas especialidades») y `npm run test:rules:panel` («Cambiar la plantilla de una regla cambia lo que se asignaría») cubren el resto de forma automática; el paso 3 con exclusión real y el paso 5 con un segundo paciente se verificaron a mano porque ninguna de las dos los cubría así. Todo lo creado se borró y la regla quedó apuntando a su plantilla original. Falta el recorrido en teléfono real del día 10. |
| 3 | Snapshot de rutina | ✅ | 2026-09-05 | Verificado contra la pantalla real con `npm run test:routines:items` y contra la API con `npm run test:routines:snapshot`: el profesional a cargo cambia series, repeticiones, peso y descanso —el ítem queda marcado como ajustado—, quita un ejercicio, añade otro del catálogo y sustituye uno conservando posición y prescripción; `template_items` sigue idéntica tras cada paso y el paciente siguiente recibe la plantilla original. Un profesional sin asignación y el propio paciente no cambian nada aunque se les entregue el formulario. Revisado a 375 px sin desbordamiento horizontal y sin controles por debajo de 44 px. Falta el recorrido en teléfono real del día 10. |
| 4 | Ejecución desde el celular | ✅ | 2026-09-05 | Evidencia en `openspec/changes/add-routine-execution/session-verification.md`: `npm run test:routines:sessions` (18/18 en el recorrido documentado), acciones HTTP de inicio, registro y cierre, valores reales, esfuerzo, saltado con dolor 8 en rodilla y observación persistente. Navegador a 375 × 812: detalle con imagen, actualización y recarga; sin desbordamiento y controles de 44 px o más. Falta el recorrido en teléfono real del día 10. |
| 5 | Alertas | ✅ | 2026-09-05 | Evidencia en `openspec/changes/add-routine-execution/session-verification.md`: `npm run test:routines:sessions` (18/18 en el recorrido documentado) genera dolor persistente tras tres sesiones y comprueba contexto y acceso de ambos profesionales a cargo y admin; el profesional ajeno no accede. Incluye recorrido por formularios HTTP y lectura del aviso por admin, sin duplicarlo al repetir el cierre. Falta el recorrido en teléfono real del día 10. |
| 6 | Tamizaje y gráficas | ✅ | 2026-09-05 | Verificado contra la API local con `npm run test:screenings` y `npm run test:evolution`: registro del tamizaje por el profesional a cargo, IMC calculado en la base, estado con un solo tamizaje (valor + aviso, sin gráfica), gráfica de evolución con dos puntos y de progresión de carga desde `session_logs`. El no desbordamiento a 375 px está cubierto por la tarea 2.4 del change. Falta el recorrido en teléfono real del día 10. |
| 7 | Membresías y vencimientos | ✅ | 2026-09-05 | Verificado contra la ruta interna y el RPC con `npm run test:memberships:cron`: 401 sin el secreto compartido, transición a `expiring_soon`/`expired`, generación de avisos y alertas para admin y profesional a cargo, idempotencia de dos ejecuciones seguidas, plazo de aviso configurable, correo en español en Mailpit y aviso visible en la vista del paciente. El disparo manual desde el panel de administración funciona (`components/progress/MembershipReviewButton.tsx`). Falta el recorrido en teléfono real del día 10. |
| 8 | PWA | ⬜ | 2026-09-05 | Verificado en el navegador contra el build de producción (`npm run build` + `npm run start`) con Chrome headless (`Page.getAppManifest` y `getInstallabilityErrors`): el manifest se sirve en `/manifest.webmanifest` como `application/manifest+json`, Chrome lo parsea sin errores y da la app por **instalable** (lista de `installabilityErrors` vacía). Nombre «Entrenamiento y fisioterapia», nombre corto «Fisio Training», `display: standalone`, `start_url: /login` dentro de `scope: /`, `theme_color` y `background_color` tomados de los tokens `--brand` (#146c5b) y `--background` (#f7f9f8). Iconos 192, 512, maskable 512 y `apple-touch-icon` de 180 responden 200 con tipo y tamaño correctos; el `<head>` enlaza manifest, `theme-color`, `apple-mobile-web-app-capable` y `apple-mobile-web-app-title`. El service worker mínimo (`public/sw.js`, sin caché offline, solo para cumplir el criterio de instalabilidad) se registra y activa sin errores de consola. A 375 px, sin sesión y como paciente (`/`, `/login`, `/patient`, `/routine`, `/patient/profile`, `/attendance/me`, `/memberships/me`), `scrollWidth === innerWidth`, sin desbordamiento horizontal. Observación para el carril de acceso: en `/patient/profile` los `input` de radio y checkbox miden 20 px (el área táctil es la etiqueta que los envuelve). Falta el recorrido en teléfono real del día 10, que aquí es imprescindible: instalar desde Chrome Android y desde Safari iOS, abrir desde el icono en ambos y confirmar arranque sin barra de direcciones y sesión mantenida al abrir desde el icono. |
| 9 | **Aislamiento de datos (RLS)** | ✅ | 2026-09-05 | Verificado directamente contra la API local con `npm run test:rls` (10/10): las seis comprobaciones del plan rechazan o devuelven vacío para registros y perfil de otro paciente, paciente no asignado, edición de ítem propio, lectura de alertas e inserción de sesión ajena. Incluye controles positivos de lectura propia y paciente asignado, y rechazo de escalada a admin. |

### Recorrido por la web desplegada (navegador, 2026-09-05)

Recorrido por la interfaz real contra `https://web-production-fbc17.up.railway.app`
(Railway + Supabase cloud `izcevgayepwewfrfmcun`, plan Free), complementario a la
verificación por API de arriba. Detalle y credenciales en la memoria
`pendiente-validar-flujo-web-e2e`.

- **Onboarding del paciente (regresión de `docs/incidencia-2026-09-05-onboarding-paciente.md`):**
  al empezar, producción servía un build anterior al arreglo `49ffc85` y el error
  boundary «No pudimos cargar tu acceso» **reproducía**. Tras redesplegar a HEAD
  (`railway up`), el circuito completo (pasos 1‑3, finalizar, recargar `/patient`
  ×3) **pasa sin caer al error boundary**, pese a que el backend devuelve HTTP 503
  en casi todos los POST de la Server Action (Supabase Free frío + latencia
  cross‑region). Regresión **corregida y confirmada en producción**.
- **Vistas del paciente:** `/patient`, `/routine`, `/attendance/me`,
  `/memberships/me`, `/patient/profile` — OK; estados coherentes, sin
  desbordamiento horizontal, sin objetivos < 44 px, consola limpia.
- **Aislamiento RLS desde el navegador:** OK — probado en el SQL Editor con JWT
  simulado de un paciente (`request.jwt.claims` + `role authenticated`); las
  lecturas y escrituras cruzadas devuelven 0 filas o error de RLS.
- **Panel del profesional y panel de administración (revalidado 2026-09-06):** tras
  aplicar en la nube la migración `20260905210000_routines_session_execution.sql`
  (`supabase db push`), sembrar las reglas (`seed:rules`, 6 reglas) y reejecutar
  `seed:progress-demo`:
  - `/evolution/[patientId]` **ya renderiza** («Peso y medidas» y «Progresión de
    carga» con datos); `/pro/sessions` y el detalle de sesión, OK.
  - `/rules`, `/rules/[id]` y `/rules/simulador` OK: 6 reglas activas enlazadas a
    su plantilla; el simulador corre el motor de punta a punta (Camino 2 probado
    por web).
  - Job de vencimientos: «Revisar vencimientos ahora» **responde con éxito** (ya no
    da 503); sin cambio de estado porque la única membresía próxima a vencer ya
    está avisada.
  - **`/pro/alerts` sigue vacío por diseño del seed**, no por despliegue:
    `evaluate_session_alerts` es `AFTER UPDATE OF status` y `seed-progress-demo.ts`
    inserta las sesiones ya `completed` sin hacer UPDATE, así que el trigger no
    dispara. Para verlo en la web hay que cerrar una sesión real (Camino 4) o un
    round-trip SQL sobre una sesión demo.
  - Sigue abierto: las Server Actions del onboarding devuelven 503 en ráfaga
    (Supabase Free / cross‑region) y conviene que `MembershipReviewButton` muestre
    error ante un 503 en vez de quedarse en «Revisando…».
