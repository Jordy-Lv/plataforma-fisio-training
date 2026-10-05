Evolución del paciente en «Mi rutina», pedida el 2026-10-03. El detalle está en
[`docs/17-registro-de-cambios-frontend.md`](../../../docs/17-registro-de-cambios-frontend.md).

## 1. Datos

- [x] 1.1 `patientProgress`: sesiones por semana, constancia, dolor medio con comparación, dolor y esfuerzo por sesión y zonas de dolor, en tres lecturas paralelas.

## 2. Pantalla

- [x] 2.1 Pestañas «Mi rutina» / «Mi evolución» en el menú del paciente.
- [x] 2.2 `/routine/evolution`: cuatro cifras, `WeeklyBars`, `PainEffortChart`, `EvolutionChart` de medidas y de cargas, mejores marcas y zonas de dolor, con sus estados vacíos.
- [x] 2.3 Una columna sin desbordes a 375 px (`grid-cols-1` en las rejillas con texto truncado).

## 3. Verificación

- [x] 3.1 `typecheck`, `lint`, auditoría de diseño, `build`, `test:smoke`, `test:evolution` y `test:routines:sessions` en verde.
- [x] 3.2 Recorrido con Laura a 1440 px en oscuro y a 375 px en claro.
- [ ] 3.3 Las gráficas de `EvolutionChart` dibujan los rótulos en un SVG estirado: en el teléfono se ven estrechos. Valorar con el owner de `components/progress` si se rehacen como las nuevas, con los rótulos en HTML.
- [ ] 3.4 Revisión en un teléfono real.
