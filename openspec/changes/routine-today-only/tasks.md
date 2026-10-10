Rutina solo del día, pedida el 2026-10-04. El detalle está en
[`docs/17-registro-de-cambios-frontend.md`](../../../docs/17-registro-de-cambios-frontend.md).

## 1. Pantallas

- [x] 1.1 `/routine`: los días programados hoy (`TodayRoutineDay`), con ejercicios, indicaciones y botón; sin programación, la próxima sesión.
- [x] 1.2 `/routine/history` con `SessionHistory` y el botón «Ver historial de sesiones».
- [x] 1.3 Sesiones a medias de días anteriores cerradas en la portada y en su pantalla.
- [x] 1.4 El día del calendario solo deja iniciar lo programado hoy.

## 2. Contrato y verificación

- [x] 2.1 `docs/11`: el formulario de `/routine` solo para lo programado hoy; `test:routines:sessions` programa el día antes de enviarlo.
- [x] 2.2 `typecheck`, `lint`, auditoría de diseño, `test:routines:sessions`, `test:routines`, `test:calendar` y `test:smoke` en verde.
- [ ] 2.3 Retirar o reutilizar `OpenSessionCard` y `RoutineSummary`, que quedaron sin uso.
- [ ] 2.4 Si hace falta que la regla sea infranqueable, llevarla a `start_routine_session` con una migración.
