# AGENTS.md — Convenciones del proyecto

Este archivo lo leen los agentes de IA en cada sesión y lo lee cualquier persona antes de
escribir su primera línea de código. Su propósito es que cuatro personas trabajando en
paralelo, cada una apoyada por un agente, produzcan código que parezca escrito por una
sola. **Si una convención de aquí choca con lo que sugiere tu agente, gana este archivo.**

---

## 1. Qué es este proyecto

Aplicación web (PWA) para un negocio de entrenamiento físico y fisioterapia. Tres roles:
`admin`, `professional` (con especialidad `training` o `physio`) y `patient`. El alcance
exacto de la demo está en `docs/00-contexto-y-alcance.md` — **no implementes nada que no
esté ahí**, aunque parezca una mejora obvia.

Son **datos de salud**. Una fuga de datos entre pacientes termina el contrato. Cualquier
duda sobre acceso se resuelve por el lado restrictivo.

## 2. Idioma

- **Código, identificadores, nombres de tabla y de columna: inglés.** `patient_conditions`, `painLevel`, `getAssignedRoutine`.
- **Texto visible por el usuario, comentarios y documentación: español**, con acentos correctos.
- **Mensajes de commit: español.**

Nunca mezcles: no existe `getRutinaAsignada` ni `nivel_dolor`.

## 3. Estructura

```
app/
  (auth)/        login, registro, recuperación
  (admin)/       panel de administración
  (pro)/         panel del profesional
  (patient)/     vistas móviles del paciente
  api/           solo rutas que no pueden ser server actions (webhooks, cron)
components/
  ui/            shadcn — COMPARTIDO, requiere revisión del owner técnico
  <dominio>/     componentes propios de un dominio
lib/
  supabase/      clientes server/browser — COMPARTIDO
  db/types.ts    GENERADO, nunca editar a mano
  auth/          slice 1
  catalog/       slice 2 — ejercicios, plantillas, reglas
  routines/      slice 3 — asignación, ejecución, alertas
  progress/      slice 4 — tamizaje, asistencia, membresías
supabase/migrations/
scripts/
```

Cada slice es dueño de su carpeta `app/(grupo)/**` y su `lib/<slice>/**`. Para tocar
`components/ui/**`, `lib/supabase/**` o el esquema core (`profiles`, `care_assignments`):
avisa al equipo **antes** de abrir el PR.

## 4. Convenciones de nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos de componente | `PascalCase.tsx` | `RoutineChecklist.tsx` |
| Archivos de utilidades y hooks | `kebab-case.ts` | `assign-routine.ts` |
| Tablas y columnas | `snake_case`, tabla en plural | `session_logs`, `pain_level` |
| Enums de Postgres | `snake_case` singular | `user_role`, `session_status` |
| Server actions | verbo + sustantivo | `createPatient`, `logSessionItem` |
| Booleanos | `is` / `has` | `isActive`, `hasContraindication` |
| Fechas y horas | sufijo `_at` (timestamptz) o `_on` (date) | `created_at`, `expires_on` |

## 5. Acceso a datos

**Server Components por defecto.** `"use client"` solo cuando hay estado, efecto o
manejador de eventos — y entonces, en el componente más pequeño posible, no en la página.

Las escrituras van por **server actions**, no por rutas de API. Toda server action sigue
esta forma, sin excepciones:

```ts
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  patientId: z.string().uuid(),
  painLevel: z.number().int().min(0).max(10),
});

export async function logPain(input: unknown) {
  // 1. Validar SIEMPRE la entrada, aunque el formulario ya valide.
  const data = schema.parse(input);

  // 2. Cliente con la sesión del usuario. Nunca la service role key aquí.
  const supabase = await createClient();

  // 3. Escribir. RLS es la autorización; no la repliques en TypeScript,
  //    pero tampoco asumas que el usuario tiene permiso.
  const { error } = await supabase.from("session_logs").insert(data);
  if (error) throw new Error(`No se pudo registrar el dolor: ${error.message}`);

  // 4. Revalidar lo que cambió.
  revalidatePath(`/patient/sessions`);
}
```

**Reglas duras:**

- `SUPABASE_SERVICE_ROLE_KEY` se usa **solo** en el job de cron y en el seed. Si aparece
  en cualquier otro lugar, el PR se rechaza.
- Nada de `select("*")` en listados: enumera las columnas que necesitas.
- Nada de consultas dentro de un `map` (N+1). Usa un `in` o un join.
- El cliente del navegador nunca recibe la fila completa de otro usuario.

## 6. Seguridad y RLS

Toda tabla con datos de personas nace con `enable row level security` **en la misma
migración que la crea**. Una tabla sin políticas queda inaccesible, que es el
comportamiento correcto por defecto.

Patrón de política (detalles y matriz completa en `docs/04-roles-y-permisos.md`):

```sql
-- El paciente ve solo lo suyo.
create policy "patient reads own sessions"
  on public.sessions for select
  using (patient_id = auth.uid());

-- El profesional ve solo a quien tiene asignado.
create policy "professional reads assigned patients sessions"
  on public.sessions for select
  using (exists (
    select 1 from public.care_assignments ca
    where ca.patient_id = sessions.patient_id
      and ca.professional_id = auth.uid()
      and ca.ended_at is null
  ));
```

El rol nunca se lee de un campo del cliente ni de la metadata del JWT editable por el
usuario: se lee de `public.profiles` mediante una función `security definer` estable.

## 7. Migraciones

- Nombre: `supabase/migrations/<timestamp>_<slice>_<descripcion>.sql`
  (ej. `20260908120000_routines_add_session_logs.sql`).
- **Jamás edites una migración que ya está en `main`.** Corrige con una nueva.
- Toda migración debe poder aplicarse sobre una base vacía: `npm run db:reset` tiene que
  pasar limpio antes de abrir el PR.
- Si tu PR incluye migración, incluye también `lib/db/types.ts` regenerado en el mismo PR.

## 8. Formularios y validación

Un esquema de Zod por caso de uso, exportado desde `lib/<slice>/schemas.ts`, usado a la
vez por el formulario en el cliente y por la server action en el servidor. No dupliques
reglas de validación en dos lugares.

Los mensajes de error que ve el usuario van en español y son accionables:
"El nivel de dolor debe estar entre 0 y 10", no "Invalid input".

## 9. UI

- Componentes de shadcn/ui antes que componentes propios; componentes propios antes que
  una dependencia nueva. **Agregar una dependencia requiere justificación en el PR.**
- Los colores salen de tokens CSS en `app/globals.css`. **Nunca escribas un color literal**
  (`bg-[#1a1a1a]`, `text-blue-500`) en un componente: la identidad visual se aplica en la
  semana 2 cambiando tokens, y un literal rompe eso.
- Móvil primero. La vista del paciente se diseña a 375 px de ancho y se prueba en un
  teléfono real, no solo en el emulador del navegador.
- Objetivos táctiles de 44 px como mínimo. El paciente usa esto sudando, entre series.

## 10. Errores y estados

Toda vista que carga datos define sus tres estados: cargando, vacío y error. El estado
vacío explica qué hacer ("Aún no tienes una rutina asignada. Tu profesional la asignará
tras la evaluación inicial"), no dice solo "Sin datos".

Nunca tragues un error en silencio. Si no puedes manejarlo, propágalo.

## 11. Antes de abrir un PR

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm run build
npm run db:reset    # si tocaste migraciones
```

Los cuatro tienen que pasar. CI los repite y bloquea el merge si fallan.

## 12. Para agentes de IA — límites

- **No inventes alcance.** Si algo no está en `docs/00-contexto-y-alcance.md` ni en el
  `openspec/changes/<change>/` que estás implementando, pregunta antes de construirlo.
- **No toques carpetas de otro slice.** Si tu tarea parece requerirlo, deténte y dilo.
- **No crees migraciones "de paso"** para arreglar algo que viste al lado.
- **No agregues dependencias** sin decirlo explícitamente en el resumen del cambio.
- **No inventes columnas.** El esquema vive en `supabase/migrations/` y está descrito en
  `docs/02-modelo-de-datos.md`; léelo antes de escribir una consulta.
- Al terminar una tarea, marca su casilla en el `tasks.md` del change correspondiente.
