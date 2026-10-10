Rediseño de la portada y la barra del paciente, aprobado sobre maqueta el 2026-10-03. El
detalle está en [`docs/17-registro-de-cambios-frontend.md`](../../../docs/17-registro-de-cambios-frontend.md).

## 1. Datos

- [x] 1.1 `patientAgenda`: lo de hoy (con su número de ejercicios), la meta semanal, los días programados y la próxima sesión, sobre `patientCalendar`.
- [x] 1.2 `currentPlanLabel`: plan de la membresía activa o por vencer, sin «Plan »; «Básico» si no hay. En `cache` por petición.
- [x] 1.3 `formatWeekdayDate` («sábado 3 de octubre»).

## 2. Barra y menú del paciente

- [x] 2.1 `ClientWordmark`: el símbolo como «A», «MADOR» en blanco y «TRAINER» en dorado, en Montserrat (`--font-wordmark`).
- [x] 2.2 Barra oscura del paciente en `AppShell`: marca, plan, saludo, tema y «Cerrar sesión» (nombre exacto que busca `test:smoke`).
- [x] 2.3 `PatientSidebar` plegable, con el estado en la cookie `patient-sidebar`.
- [x] 2.4 El personal conserva su barra y su menú.

## 3. Portada

- [x] 3.1 `TodayCard` con las cinco situaciones.
- [x] 3.2 `WeekStrip` con días programados, meta semanal y «Ver calendario».
- [x] 3.3 Racha, visitas del mes y membresía como enlaces.
- [x] 3.4 `MembershipExpiryBanner` para `expiring_soon`, que se puede cerrar.

## 4. Verificación

- [x] 4.1 `typecheck`, `lint`, `test:design` y `build` en verde.
- [x] 4.2 `test:auth:screens`, `test:auth:resilience`, `test:people`, `test:memberships`, `test:smoke`, `test:calendar`, `test:overview` y `test:routines:sessions` en verde.
- [x] 4.3 Recorrido con Diego (sin membresía, sin rutina), Laura (Trimestral; «Hoy te toca» con una programación temporal, ya retirada) y Marcos (Mensual por vencer, aviso) en escritorio y a 375 px, claro y oscuro; menú plegado.
- [ ] 4.4 Revisión en un teléfono real.

## 5. Portada de escritorio en rejilla (aprobada sobre maqueta el 2026-10-03)

- [x] 5.1 `patientAgenda`: los primeros cuatro ejercicios de hoy (el conteo sale de la misma consulta) y las tres próximas sesiones.
- [x] 5.2 `patientOverview.monthSessions` y `patientEvolution` (últimos seis tamizajes, tres columnas).
- [x] 5.3 Rejilla fluida de 12 columnas en `/patient`, sin ancho máximo propio (crece al plegar el menú): `TodayCard` con ejercicios y aviso de cuidado, `UpcomingSessions`, cuatro datos, `EvolutionCard` y `CareCard`; todo lo nuevo solo desde `lg`.
- [x] 5.4 `typecheck`, `lint`, auditoría de diseño, `build`, `test:smoke`, `test:calendar` y `test:overview` en verde; recorrido con Laura (con programación temporal, ya retirada) y Marcos a 1440 px y a 375 px.
- [ ] 5.5 Decidir con el equipo si el paciente puede ver el nombre de su profesional (hoy la RLS de `profiles` no lo deja; se muestra la especialidad).

## 6. Portada al estilo de la app (2026-10-03)

- [x] 6.1 `WeekHeader`: racha y semana sin tarjeta sobre un brillo dorado; 7 días en el teléfono y 14 en escritorio; meta y «Calendario».
- [x] 6.2 `TodayCard` sin caja en los dos anchos, con los ejercicios también en el teléfono; etiqueta de estado y aviso de cuidado en dorado.
- [x] 6.3 Accesos «Mi evolución» y «Mi equipo», y sección «Mi equipo» en `/patient/profile` (`MyTeamSection`).
- [x] 6.4 Salen de la portada los cuatro datos, la tarjeta de la semana, la evolución y el equipo. Sustituye a las tareas 5.2 y 5.3 en lo que toca a la portada.
- [ ] 6.5 Retirar los componentes que quedaron sin uso (`EvolutionCard`, `CareCard`, `WeekStrip`, `lib/progress/patient-evolution.ts`) o reutilizarlos.

## 7. Menú lateral (propuesta A, 2026-10-03)

- [x] 7.1 `PatientSidebar`: grupos «Entrenar» y «Mi cuenta», activa en píldora dorada translúcida con barrita, y el botón de plegar al pie (sin el círculo flotante).
- [x] 7.2 `SidebarPlan` al pie: plan, días para que venza y barra (ámbar si está por vencer), sobre `currentPlan` (`lib/progress/patient-plan.ts`).
- [x] 7.3 La barra superior deja de mostrar el plan; el saludo baja a 15 px con un avatar de 32 px.
