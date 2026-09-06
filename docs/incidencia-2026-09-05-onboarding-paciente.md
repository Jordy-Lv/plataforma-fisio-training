# Incidencia — el onboarding del paciente cae en el error boundary

**Fecha:** 2026-09-05
**Entorno:** producción desplegada (Railway `web-production-fbc17`, Supabase cloud `izcevgayepwewfrfmcun`, plan Free)
**Slice:** `add-auth-and-roles` (onboarding del paciente, commit `4438477`) — **para que lo ejecute Codex**
**Diagnóstico por:** Claude (sesión de despliegue del slice 4). No toqué código de este slice.

---

## 1. Síntoma

Con una cuenta de paciente, en el formulario inicial (onboarding), tras el primer
paso, al pulsar «Guardar y continuar» aparece la pantalla de
`app/(patient)/error.tsx`:

> **No pudimos cargar tu acceso**
> Revisa tu conexión e inténtalo de nuevo. Si continúa, contacta al administrador.
> [Intentar de nuevo]

Se pierde lo que el paciente había rellenado.

## 2. Qué se descartó (verificado contra la nube, con un token de paciente real)

Reproduje **todo** el circuito contra `izcevgayepwewfrfmcun` con un JWT de paciente
real (RLS activa, mismo PostgREST que usa el servidor). Todo funciona:

| Comprobación | Resultado |
|---|---|
| Esquema de `patient_details` en la nube (las 10 columnas que lee `page.tsx` + `onboarding_step`) | ✅ correcto |
| RLS: el paciente lee/escribe su propio `patient_details` y lee su fila de `profiles` | ✅ |
| `SELECT profiles` (como en `getActiveProfile`) | ✅ 200 |
| `SELECT patient_details … maybeSingle()` antes y después del paso 1 | ✅ 200, 1 fila |
| `UPSERT patient_details` (paso 1) | ✅ 201 |
| `UPDATE patient_details` (paso 2) | ✅ 200 |
| RPC `finish_patient_onboarding(patient_id, conditions)` (paso 3) | ✅ 204, deja `onboarding_step = 3` |
| Auth: login por password, `GET /auth/v1/user`, JWKS | ✅ (los tokens son **ES256**, claves de firma asimétricas) |
| Middleware (`getClaims()` + chequeo de perfil + redirect de onboarding) | ✅ `/patient` → 307 → `/patient/onboarding` |
| GET `/patient/onboarding` renderizado con sesión de paciente en `onboarding_step` 1 | ✅ HTTP 200, formulario correcto |
| **Server Action `saveOnboardingStep` paso 1 (replay con la codificación real de progressive-enhancement)** | ✅ **HTTP 303 → `/patient/onboarding`** |
| GET tras ese redirect | ✅ HTTP 200, formulario del paso 2 |
| Fiabilidad: 15 lecturas seguidas de `profiles` | ✅ 15/15, 170–400 ms |
| Estado del proyecto Supabase | `ACTIVE_HEALTHY` |

**No hay bug de datos, de RLS, de migración ni de esquema.** El flujo completo
(paciente nuevo → paso 1 → continuar → re-render) reproduce **limpio** de punta a
punta. En los logs de runtime de Railway **no** queda rastro del error (Next en
producción no lo emite a stdout).

## 3. Causa raíz (lo que sí es un bug de código)

El error es un **fallo transitorio del backend** (una lectura de Supabase o
`auth.getUser()` que devuelve error o lanza) que el código convierte en un
**crash sin retorno** en vez de en un estado recuperable. Disparadores plausibles
en este entorno: arranque en frío del contenedor recién desplegado, instancia
Free de Supabase despertando, o latencia Railway `sfo` ↔ Supabase `us-east-2`.

Puntos frágiles concretos:

### 3.1 `lib/auth/session.ts` → `getActiveProfile()`
```ts
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) return null;                 // (a) solo cubre el RETORNO {error}
...
const { data, error } = await supabase.from("profiles").select(...).maybeSingle();
if (error)
  throw new Error("No se pudo consultar tu perfil. Inténtalo de nuevo.");   // (b) throw duro
```
- **(a)** Si `getUser()` **lanza** (fallo de red, error al refrescar el token
  rotado) en vez de devolver `{error}`, la excepción no se captura: sube por
  `requireRole` → sube por la Server Action → llega al error boundary del cliente.
- **(b)** Cualquier error transitorio de PostgREST (5xx, timeout, pool) hace
  `throw` sin reintento → error boundary.

### 3.2 `app/(patient)/patient/onboarding/page.tsx`
```ts
const { data, error } = await supabase.from("patient_details").select(...).maybeSingle();
if (error) throw new Error("No se pudo cargar tu perfil. Inténtalo de nuevo.");
```
Mismo patrón: un hipo transitorio en esta lectura tumba el render del segmento.

### 3.3 `lib/auth/onboarding-actions.ts` → `saveOnboardingStep()`
```ts
export async function saveOnboardingStep(_previous, form) {
  const profile = await requireRole("patient", { allowOnboarding: true });  // sin try/catch
```
`requireRole` puede lanzar (ver 3.1). Al no envolverlo, la Server Action **rechaza
sin manejar** → error boundary del cliente **y se pierde el formulario**. Los
errores de negocio sí se devuelven como `{ error }`; los de sesión/perfil no.

### 3.4 `lib/supabase/server.ts` → `setAll()`
```ts
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes("Cookies can only be modified")) {
    throw error;   // cualquier otro fallo al escribir cookie durante un refresh re-lanza
  }
}
```
Si `auth.getUser()` dispara un refresh de token dentro de un Server Component y
`cookieStore.set` falla por otro motivo, se re-lanza y cae en el boundary.

## 4. Qué debe hacer Codex

1. **`getActiveProfile()`**: envolver `supabase.auth.getUser()` en `try/catch`; un
   throw se trata como "sin sesión" → `return null` (que ya lleva a `/login`), o se
   propaga como un error tipado transitorio, nunca como excepción cruda.
2. **Reintento acotado** (p. ej. 2 intentos, backoff ~300 ms) alrededor de las
   lecturas de `profiles` (en `session.ts`) y de `patient_details` (en
   `onboarding/page.tsx`) antes de rendirse.
3. **`saveOnboardingStep`** (y `updatePatientProfile`, `saveCondition`): `try/catch`
   alrededor de `requireRole(...)`; ante un fallo de sesión devolver
   `{ error: "No pudimos verificar tu sesión. Vuelve a intentarlo." }` para que el
   formulario **conserve las respuestas** y muestre el reintento en línea.
4. **`app/(patient)/error.tsx`**: mensaje que deje claro que las respuestas no se
   perdieron y un auto-reintento (`reset()`) una vez al montar.
5. **Entorno** (no es código, pero sube la probabilidad del disparador): Supabase
   Free (arranques en frío, sin SLA) y Railway `sfo` ↔ Supabase `us-east-2`. Mover
   Supabase a la misma región / a un plan de pago reduce la frecuencia.

## 5. Cómo reproducir el circuito (sano) para probar el arreglo

Scripts usados en el diagnóstico (en el scratchpad de la sesión, no versionados):
`repro-onboarding.mjs`, `hit-onboarding.mjs`. Resumen del método:

1. `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` con un paciente demo
   (`laura.perez.demo@demo.local` / `demo1234`) → `access_token`.
2. Forjar la cookie `sb-izcevgayepwewfrfmcun-auth-token` = `base64-` +
   `base64url(JSON.stringify(session))` (trozos de 3180 si supera ese tamaño).
3. GET/POST contra `https://web-production-fbc17.up.railway.app/patient/onboarding`
   con esa cookie; la Server Action se dispara con los campos ocultos
   `$ACTION_REF_*`, `$ACTION_*:0`, `$ACTION_*:1`, `$ACTION_KEY` que trae el HTML.

Para forzar el fallo transitorio habría que inyectar un error en la capa de
Supabase (mock que lance/501 en la primera llamada) y comprobar que, con el
arreglo, el paso 1 ya no cae en el error boundary y no se pierde el formulario.
