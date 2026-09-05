## Qué hace

<!-- Una o dos frases. Si necesitas más, quizá el PR es demasiado grande. -->

## Change de OpenSpec

<!-- Ej: add-routine-execution — tarea 3.2 -->

## Cómo se probó

<!-- Pasos concretos que ejecutaste. Si aplica un camino de docs/08-plan-de-verificacion.md, dilo. -->

## Checklist

- [ ] `npm run typecheck`, `npm run lint` y `npm run build` pasan en local
- [ ] Si hay migración: es nueva (no edité una fusionada) y `npm run db:reset` pasa limpio
- [ ] Si hay migración: `lib/db/types.ts` regenerado va en este PR
- [ ] Las tablas nuevas tienen RLS habilitado y políticas explícitas
- [ ] La entrada se valida en el servidor con Zod
- [ ] No uso `SUPABASE_SERVICE_ROLE_KEY` fuera del cron o el seed
- [ ] No hay colores literales; uso tokens CSS
- [ ] Las vistas nuevas resuelven los estados cargando / vacío / error
- [ ] Marqué las tareas completadas en `openspec/changes/<change>/tasks.md`

## Requiere revisión del owner técnico

- [ ] Migraciones o políticas RLS
- [ ] `components/ui/**` o `lib/supabase/**`
- [ ] `profiles` o `care_assignments`
- [ ] Dependencia nueva (justifícala aquí abajo)
