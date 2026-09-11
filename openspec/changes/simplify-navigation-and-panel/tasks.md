Cada tarea es un ticket de Jira (proyecto `KAN`). El orden es el de las fases de
[`docs/16-plan-de-mejora.md`](../../../docs/16-plan-de-mejora.md).

## 1. Verificar antes de tocar nada

- [x] 1.1 `db:reset` limpio y semillas de ejercicios, plantillas y reglas aplicadas; descarta el perfil admin de sobra (`docs/15` A.5) y confirma que el motor está sembrado —6 reglas activas—, así que D1 no es falta de semilla.
- [ ] 1.2 Recorrer en teléfono real alta → registro → asignación → sesión, y cerrar las tres casillas de `docs/15` C.1 en `docs/07-plan-de-verificacion.md`.

## 2. Adelgazar

- [x] 2.1 **KAN-11** — Menú plano de ocho entradas con `SectionTabs`, sin «Asignación» ni «Planes» para el profesional (D3), comentarios de `MobileNav` corregidos (D8) y medición de densidad repetida en `docs/12`.
- [x] 2.2 **KAN-12** — Calcular el cumplimiento del panel en la base, sin traer filas para contarlas (D4).
- [x] 2.3 **KAN-5** — Separar `/admin` de `/pro`: de siete KPI por pantalla a tres.
- [x] 2.4 **KAN-7** — «Reglas» → «Asignación», formulario de siete criterios a cuatro y línea de estado. Sin tocar el motor ni el esquema de Zod.

## 3. Cumplir lo prometido

- [x] 3.1 **KAN-9** — Que `finish_patient_onboarding` invoque `commit_routine_assignment` en la misma transacción, preservando el bloqueo, el rechazo por paso y los caminos `no_match` y `pending_review` (D1).
- [x] 3.2 **KAN-10** — Repartir las alertas por especialidad y documentar la matriz «tipo → especialidad» en `docs/04-roles-y-permisos.md` (D2).

## 4. Completar

- [x] 4.1 **KAN-13** — Cerrar y reasignar el acompañamiento, con el `revalidatePath("/people")` que falta (D5 y D6).
- [x] 4.2 **KAN-6** — Mostrar quién acompaña a cada paciente en `/people` y en su ficha. Solo el admin ve el mapa completo.
- [x] 4.3 **KAN-8** — Crear la plantilla con su primer día en el mismo formulario, y documentar en `docs/02` que un ejercicio va en tantas plantillas como se quiera.
- [ ] 4.4 **KAN-14** — Filtros de Personas por URL con paginación, sobre `createListParams` y `listPeople`.
- [ ] 4.5 **KAN-4** — Cerrarlo apuntando a KAN-11, KAN-10 y KAN-14: se queda sin contenido propio.
