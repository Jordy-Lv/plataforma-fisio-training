# 12 — Excepción: Antigravity para el frontend

Este documento autoriza **una desviación puntual y acotada** del flujo normal: un compañero
va a rehacer el frontend en una rama propia usando **Antigravity** (agente basado en Gemini)
en lugar del modelo recomendado para tareas grandes de interfaz. No es burocracia: es lo que
permite hacer la prueba sin que el experimento toque `main`, filtre datos de salud ni deje
al equipo adivinando qué rama es "de verdad".

Lo que sigue **gana sobre el resto de la documentación mientras dure la evaluación**, pero
solo dentro de la rama de evaluación y solo en lo que este documento dice expresamente. Todo
lo que no se relaja aquí, sigue vigente.

---

## 1. Por qué existe esta excepción

- El trabajo pesado de frontend del proyecto está documentado y listo para ejecutar en el
  change [`improve-frontend-ux`](../openspec/changes/improve-frontend-ux/proposal.md).
- Lo ideal para esa tanda es un modelo como **Opus 5**, y así se hará la implementación que
  entra a `main`.
- En paralelo queremos **evaluar cómo se comporta Antigravity** en una tarea de ese tamaño:
  adherencia a `CLAUDE.md` / `AGENTS.md`, respeto a los contratos de las suites HTTP,
  calidad del diff, fricción y tiempo.
- El resultado de esa rama es **material de evaluación, no la implementación definitiva**. No
  se fusiona a `main`.

## 2. Quién y con qué acceso

| Elemento | Valor |
|---|---|
| Persona | Sebastián Montes (se le añade al repo con su usuario de GitHub) |
| Acceso al repositorio | Escritura, **sin permiso sobre `main`** (protegida) |
| Rama de trabajo | `experimental/antigravity-frontend` |
| Herramienta | Antigravity (Gemini). El resto del equipo sigue con su flujo habitual |

El prefijo **`experimental/**` queda reservado** para ramas de este tipo: código que no está
pensado para fusionarse. Cualquiera que vea ese prefijo sabe que no debe ramificar de ahí ni
basar un PR en ella.

## 3. Alcance de la rama de evaluación

**Se ramifica de `main` actualizado.** Aborda el alcance de `improve-frontend-ux` (o el que
se acuerde por escrito con el equipo antes de empezar).

Puede tocar:

- `app/**`, `components/**` (incluido `components/ui/**`, que aquí no requiere revisión previa
  porque no sale de la rama).
- Funciones de **lectura** de `lib/**` y helpers nuevos en `lib/shared/**`.
- `app/globals.css` y tokens, si el experimento incluye rediseño visual.

**No puede tocar, ni siquiera dentro de la rama:**

- El **esquema**: nada de `supabase/migrations/**` nuevas ni editadas, nada de `lib/db/types.ts`.
- `lib/supabase/**` (clientes server/browser).
- **Políticas RLS** y funciones `security definer`.
- **Server actions de escritura** y su validación Zod: el manejo de datos se conserva tal
  cual está en `main`. El experimento cambia *cómo se llega* a los datos, no *qué se escribe*.
- Los tests de `scripts/**` y el workflow de OpenSpec (`openspec/**`). El `tasks.md` de
  `improve-frontend-ux` **no se marca** desde esta rama: ese seguimiento es de la
  implementación real.

## 4. Convenciones que siguen siendo obligatorias

Aunque sea un experimento, esto no se relaja —son las reglas que protegen datos de salud y
la identidad visual, y romperlas invalida la comparación:

1. **Idioma.** Código e identificadores en inglés; texto visible, comentarios y commits en
   español con acentos (`CLAUDE.md` §2).
2. **Son datos de salud.** Solo Supabase **local** con datos de seed. Nunca datos reales,
   nunca un proyecto de Supabase compartido, nunca capturas con datos de personas reales.
3. **`SUPABASE_SERVICE_ROLE_KEY`** no aparece fuera del cron y el seed. Si Antigravity la
   introduce en un componente o una acción, es un hallazgo de la evaluación, no algo que se
   deja pasar.
4. **RLS es la autorización.** No se replica en TypeScript ni se elude leyendo el rol de un
   campo del cliente.
5. **Ningún color, sombra ni tipografía literal** fuera de `app/globals.css` y
   `lib/pwa/theme.ts` (`docs/10-sistema-de-diseno.md`).
6. **Contratos de las suites HTTP.** [`docs/11-contratos-de-las-suites-http.md`](11-contratos-de-las-suites-http.md)
   se lee **antes** de mover, envolver o reordenar cualquier `<form>`. Que las suites no
   corran en esta rama no cambia el contrato: el objetivo es medir precisamente si
   Antigravity lo respeta.
7. **Server Components por defecto**; `"use client"` en el componente más pequeño posible.
8. **Los tres estados** en cada vista que carga datos: cargando, vacío y error, con el vacío
   explicando qué hacer.
9. **Nada de `select("*")`** en listados ni consultas dentro de un `map` (N+1).

## 5. Lo que esta excepción relaja

Solo esto, y solo en `experimental/antigravity-frontend`:

| Regla normal | En la rama de evaluación |
|---|---|
| Tareas grandes de frontend con un modelo tipo Opus 5 | Se permite Antigravity (Gemini) como herramienta única |
| Todo trabajo pertenece a un change de OpenSpec con su `tasks.md` | El experimento no crea change ni marca casillas |
| Un PR por sección contra `main`, con revisión entre secciones (`ejecucion.md` §2) | Sin PR a `main`. Opcionalmente un **PR en borrador permanente** contra `main`, etiquetado `evaluación` / `no-fusionar`, solo para revisar el diff |
| `components/ui/**` y `lib/supabase/**` exigen aviso al equipo antes del PR | En `components/ui/**` no hace falta (no sale de la rama). `lib/supabase/**` sigue intocable (ver §3) |
| Añadir una dependencia exige justificación aprobada | Antigravity puede añadir dependencias; **cada una se anota en el informe** como dato de la evaluación |
| CI verde / `scripts/verify.sh` en verde es requisito de merge | No hay merge, así que no es requisito; pero el estado de las comprobaciones **se registra** (ver §7) |

## 6. Reglas de convivencia con el repositorio

- **`main` no se toca.** Ni un commit directo, ni un merge, ni un rebase encima.
- **No se reescriben ni se borran ramas de otros.** `--force` solo sobre la propia rama.
- **El experimento no bloquea el trabajo real.** `improve-frontend-ux` se implementa por su
  cauce, ignorando esta rama.
- **Si algo del experimento resulta útil**, no se hace cherry-pick a `main`: se reimplementa
  dentro del change correspondiente con el flujo normal (rama `<slice>/<descripcion>`, PR,
  revisión, CI).
- **Nada de secretos reales** en commits, ni siquiera en `.env.local` versionado por error.

## 7. Qué se entrega: el informe de evaluación

Al cerrar la prueba, el compañero deja en la rama un archivo
`docs/evaluaciones/antigravity-frontend.md` (carpeta nueva, solo en esa rama) con:

- **Qué construyó**: pantallas y componentes tocados, resumen del diff (`git diff --stat main...experimental/antigravity-frontend`).
- **Estado de las comprobaciones**, ejecutadas al final sobre la rama:
  ```bash
  npm run typecheck && npm run lint && npm run test:design && npm run build
  npm run db:reset && npm run dev   # y luego las suites de las pantallas tocadas
  ```
  Tabla de suite → pasa / falla / no ejecutada, con el mensaje de fallo cuando lo haya.
- **Adherencia a las convenciones**: incumplimientos de `CLAUDE.md` / `AGENTS.md` detectados
  (colores literales, `select("*")`, N+1, formularios movidos que rompen un marcador, uso de
  la service role key, dependencias nuevas…).
- **Fricción y tiempo**: dónde se atascó, cuántas iteraciones, cuánto tardó frente a la
  estimación de la tanda.
- **Veredicto**: en qué ayudaría Antigravity al equipo y en qué no.

Ese informe es el objetivo de todo esto; la rama es el medio.

## 8. Vigencia y cierre

- **Inicio:** 6 de septiembre de 2026.
- **Cierre:** al entregar el informe de §7, y como máximo el 20 de septiembre de 2026.
- Al cerrar: esta excepción queda sin efecto, la rama `experimental/antigravity-frontend` se
  marca como archivada (o se borra tras copiar el informe a `main` por el cauce normal) y
  cualquier trabajo futuro vuelve al flujo de [`CONTRIBUTING.md`](../CONTRIBUTING.md).
- Prorrogar la prueba exige acuerdo explícito del equipo y actualizar la fecha de arriba.
